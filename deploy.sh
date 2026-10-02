#!/bin/bash
# Despliegue en producción (instancia de 1 GB de RAM).
#
# - Compila backend y frontend con un límite de memoria acorde al servidor.
# - Detiene las apps durante la compilación para liberar memoria (el portal no responde unos minutos).
# - Respalda en .deploy-backup/ lo que va a reemplazar (compilación y, si cambiaron las dependencias,
#   node_modules) y lo restaura si algo falla: un build fallido nunca deja el sitio caído.
# - Aplica cambios de esquema solo si todo compiló. `prisma db push` se detiene si un cambio borraría datos.
# - Reinicia ambos procesos al final, juntos, usando ecosystem.config.js.

set -Eeuo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
BUILD_MEMORY_MB="${BUILD_MEMORY_MB:-1024}"

# Los respaldos van fuera de backend/ y web-admin/ para que TypeScript y Next no los compilen
BACKUP_DIR="$ROOT/.deploy-backup"

# Rutas respaldadas en esta ejecución, para restaurar solo lo que se tocó
BACKUPS=()

backup_path() {
    local rel="${1#$ROOT/}"
    echo "$BACKUP_DIR/${rel//\//__}"
}

backup() {
    local path="$1"
    local dest
    dest="$(backup_path "$path")"
    mkdir -p "$BACKUP_DIR"
    rm -rf "$dest"
    if [ -e "$path" ]; then
        mv "$path" "$dest"
        BACKUPS+=("$path")
    fi
}

start_apps() {
    cd "$ROOT"
    unset NODE_OPTIONS
    # delete + start aplica siempre la configuración de ecosystem.config.js
    pm2 delete backend frontend >/dev/null 2>&1 || true
    pm2 start ecosystem.config.js
    pm2 save
}

rollback() {
    trap - ERR
    echo ""
    echo "ERROR: el despliegue falló. Restaurando la versión anterior..."
    for path in "${BACKUPS[@]+"${BACKUPS[@]}"}"; do
        rm -rf "$path"
        mv "$(backup_path "$path")" "$path"
        echo "  restaurado: ${path#$ROOT/}"
    done
    start_apps
    echo "Se restauró la versión anterior. Revise el error arriba."
    exit 1
}

# Instala dependencias. Si el lockfile cambió, respalda node_modules e instala limpio
# para poder volver exactamente a las dependencias con las que se compiló la versión anterior.
install_deps() {
    local dir="$1"
    cd "$ROOT/$dir"
    if git -C "$ROOT" diff --quiet "$PREV_COMMIT" HEAD -- "$dir/package-lock.json"; then
        npm install --no-audit --no-fund
    else
        echo "Las dependencias de $dir cambiaron: instalación limpia."
        backup "$ROOT/$dir/node_modules"
        npm ci --no-audit --no-fund
    fi
}

echo "== Iniciando despliegue =="

# Aviso si no hay swap: con 1 GB de RAM el build de Next.js suele morir sin él
SWAP_MB=$(free -m | awk '/^Swap:/ {print $2}')
if [ "${SWAP_MB:-0}" -lt 1024 ]; then
    echo "AVISO: el servidor tiene ${SWAP_MB:-0} MB de swap. Se recomiendan al menos 2 GB para compilar."
fi

echo "== 1. Descargando cambios =="
cd "$ROOT"
PREV_COMMIT=$(git rev-parse HEAD)
git pull origin main

trap rollback ERR

echo "== 2. Deteniendo apps para liberar memoria durante la compilación =="
pm2 stop backend frontend >/dev/null 2>&1 || true

export NODE_OPTIONS="--max-old-space-size=${BUILD_MEMORY_MB}"

echo "== 3. Backend: dependencias y compilación =="
install_deps backend
npx prisma generate
backup "$ROOT/backend/dist"
npm run build

echo "== 4. Frontend: dependencias y compilación =="
install_deps web-admin
backup "$ROOT/web-admin/.next"
npm run build

echo "== 5. Aplicando cambios de esquema en la base de datos =="
cd "$ROOT/backend"
npx prisma db push --skip-generate

trap - ERR

echo "== 6. Iniciando apps =="
start_apps

echo ""
echo "Despliegue completado ($PREV_COMMIT -> $(git -C "$ROOT" rev-parse --short HEAD))."
echo "Los archivos .env no se modifican con git pull."
pm2 status

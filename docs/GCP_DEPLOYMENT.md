# Guía de Despliegue en GCP (Free Tier) - Gracias Spa 

Esta guía detalla paso a paso cómo desplegar la aplicación en Google Cloud Platform usando el nivel gratuito, con Postgres en Docker, Nginx como proxy y DuckDNS para el dominio.

## Prerrequisitos
1.  Cuenta de Google Cloud activa.
2.  Proyecto creado en GCP (ej: `graciaspa-prod`).
3.  Tarjeta de crédito vinculada (para verificar la cuenta, no se cobrará si se siguen los pasos).

---

## Paso 1: Crear la Máquina Virtual (Compute Engine)

1.  Ir a **Compute Engine** > **Instancias de VM**.
2.  Clic en **Crear instancia**.
3.  **Configuración Crucial (Free Tier):**
    *   **Nombre:** `graciaspa-server`
    *   **Región:** `us-west1` (Oregon), `us-central1` (Iowa) o `us-east1` (South Carolina). *Importante: Elegir una de estas tres.*
    *   **Zona:** Cualquiera (ej: `us-west1-b`).
    *   **Serie:** `E2`
    *   **Tipo de máquina:** `e2-micro` (2 vCPU, 1 GB memoria).
    *   **Disco de arranque:**
        *   Clic en "Cambiar".
        *   SO: **Ubuntu**
        *   Versión: **Ubuntu 22.04 LTS** (x86/64).
        *   Tipo de disco: **Disco persistente estándar** (Standard PD).
        *   Tamaño: **30 GB** (El máximo gratuito).
    *   **Firewall:** Marcar:
        *   [x] Permitir tráfico HTTP.
        *   [x] Permitir tráfico HTTPS.
4.  Clic en **Crear**. Debería aparecer un mensaje "Tu instancia es elegible para el nivel gratuito".

---

## Paso 2: Configurar Dirección IP Estática

Para que DuckDNS funcione siempre, la IP no debe cambiar.
1.  Ir a **Red de VPC** > **Direcciones IP externas**.
2.  Buscar la IP de tu instancia `graciaspa-server`.
3.  En la columna "Tipo", cambiar de `Efímera` a **`Estática`**.
4.  Nombrarla (ej: `ip-graciaspa`).

---

## Paso 3: Configurar Dominio DuckDNS

1.  Ir a [DuckDNS.org](https://www.duckdns.org) e iniciar sesión (con Google).
2.  Crear un subdominio (ej: `graciaspa`).
3.  Tu dominio será: `graciaspa.duckdns.org`.
4.  En "current ip", poner la **IP Externa** que reservaste en el paso anterior.
5.  Clic en **update ip**.

---

## Paso 4: Instalar Docker y Nginx en el Servidor

1.  En la consola de GCP, clic en **SSH** para conectarte a la máquina.
2.  Ejecutar los siguientes comandos:

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
sudo apt install docker.io docker-compose -y
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER

# Instalar Nginx y Certbot (para SSL)
sudo apt install nginx certbot python3-certbot-nginx -y

# Instalar Node.js 20 (para construir el front si es necesario, aunque usaremos Docker)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

*Cerrar la ventana SSH y volver a abrirla para aplicar los cambios de grupo de usuario.*

---

## Paso 5: Desplegar Base de Datos (Postgres)

En la terminal SSH:

1.  Crear carpeta del proyecto:
    ```bash
    mkdir graciaspa && cd graciaspa
    ```

2.  Crear archivo `docker-compose.yml` para la base de datos:
    ```bash
    nano docker-compose.yml
    ```

3.  Pegar este contenido (optimizado para poca RAM):
    ```yaml
    version: '3.8'
    services:
      db:
        image: postgres:15-alpine
        restart: always
        environment:
          POSTGRES_USER: usuario_spa
          POSTGRES_PASSWORD: password_seguro_123 # ¡CAMBIAR ESTO!
          POSTGRES_DB: graciaspa_db
        volumes:
          - db_data:/var/lib/postgresql/data
        ports:
          - "5432:5432"
        command: postgres -c 'max_connections=50' -c 'shared_buffers=128MB'

    volumes:
      db_data:
    ```

4.  Guardar (`Ctrl+O`, `Enter`) y Salir (`Ctrl+X`).

5.  Iniciar la base de datos:
    ```bash
    docker-compose up -d
    ```

---

## Paso 6: Desplegar Aplicación (Backend y Frontend)

Recomendamos usar **Git** para bajar tu código.

1.  Clonar tu repositorio:
    ```bash
    git clone https://github.com/bmontoyag/graciaspa.git app
    cd app
    ```

2.  Crear archivo de entorno `.env` en `backend/`:
    ```bash
    cd backend
    nano .env
    ```
    *Pegar tus variables de entorno, asegurando que `DATABASE_URL` apunte al servicio docker o localhost:*
    `DATABASE_URL="postgresql://usuario_spa:password_seguro_123@localhost:5432/graciaspa_db?schema=public"`

3.  Instalar dependencias y Compilar Backend:
    ```bash
    npm install
    npx prisma generate
    npx prisma db push  # Crear tablas
    npx prisma db seed  # Cargar datos iniciales (roles, admin)
    npm run build
    ```

4.  Usar **PM2** para correr el backend en segundo plano:
    ```bash
    sudo npm install -g pm2
    pm2 start dist/main.js --name "backend"
    ```

5.  Compilar Frontend (Web Admin):
    ```bash
    cd ../web-admin
    nano .env.local
    # Poner: NEXT_PUBLIC_API_URL=https://graciaspa.duckdns.org/api
    npm install
    npm run build
    pm2 start npm --name "frontend" -- start -- -p 3000
    ```

6.  Guardar lista de procesos PM2:
    ```bash
    pm2 save
    pm2 startup
    ```

---

## Paso 7: Configurar Nginx (Proxy Inverso y SSL)

1.  Editar configuración:
    ```bash
    sudo nano /etc/nginx/sites-available/graciaspa
    ```

2.  Pegar configuración:
    ```nginx
    server {
        server_name graciaspa.duckdns.org;

        # Frontend
        location / {
            proxy_pass http://localhost:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

        # Backend API
        location /api/ {
            rewrite ^/api/(.*) /$1 break;
            proxy_pass http://localhost:3001;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```

3.  Activar sitio y reiniciar Nginx:
    ```bash
    sudo ln -s /etc/nginx/sites-available/graciaspa /etc/nginx/sites-enabled/
    sudo rm /etc/nginx/sites-enabled/default
    sudo nginx -t
    sudo systemctl restart nginx
    ```

4.  **Activar HTTPS (SSL) con Certbot:**
    ```bash
    sudo certbot --nginx -d graciaspa.duckdns.org
    ```
    *Seguir las instrucciones, elegir redirigir todo el tráfico a HTTPS.*

¡Listo! Tu aplicación estará disponible en `https://graciaspa.duckdns.org`.

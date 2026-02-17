# Guía Completa de Despliegue - Oracle Cloud (Always Free)

Esta guía te permitirá desplegar **Gracias Spa Manager** en la capa gratuita de Oracle Cloud, aprovechando la instancia ARM con 24GB de RAM.

## 📋 Requisitos Previos
*   Cuenta de Oracle Cloud activa.
*   Dominio configurado (DuckDNS o propio).
*   Cliente SSH (Terminal, PuTTY, etc.).

---

## 🚀 Paso 1: Crear la Súper Instancia (ARM)

El "secreto" de Oracle es seleccionar el procesador correcto.

1.  Inicia sesión en **Oracle Cloud Console**.
2.  Ve a **Menu ☰ > Compute > Instances**.
3.  Click en **Create Instance**.
4.  **Name:** `graciaspa-server`.
5.  **Image and Shape (¡IMPORTANTE!):**
    *   Click en **Edit**.
    *   **Image:** Selecciona **Canonical Ubuntu 22.04 LTS**.
    *   **Shape:** Click en "Change Shape".
        *   Selecciona **Ampere** (ARM).
        *   Marca **VM.Standard.A1.Flex**.
        *   **OCPUs:** Arrastra a `4`.
        *   **Memory:** Arrastra a `24 GB`.
    *   Click **Select Shape**.
    *   *Nota: Si dice "Out of capacity", intenta con 2 OCPUs y 12 GB RAM, o cambia de "Availability Domain" (AD-1, AD-2, etc).*
6.  **Networking:**
    *   Deja "Create new virtual cloud network".
    *   Asegúrate de que **"Assign a public IPv4 address"** esté marcado.
7.  **Add SSH keys:**
    *   Selecciona "Save Private Key" y "Save Public Key".
    *   **GUARDA ESTOS ARCHIVOS SEGURAMENTE**, son tu única llave de entrada.
8.  **Boot Volume:**
    *   Déjalo por defecto (50GB es gratis, puedes subir hasta 200GB gratis).
9.  Click **Create**.

---

## 🛡️ Paso 2: Configurar Firewall (Doble Capa)

Oracle tiene seguridad por partida doble: la Red (VCN) y el Servidor (Ubuntu).

### 2.1 Abrir puertos en la Nube (VCN)
1.  En la página de detalles de tu instancia, click en la **Subnet** (e.g., `subnet-xxxx`).
2.  Click en la **Default Security List**.
3.  Click **Add Ingress Rules**:
    *   **Source CIDR:** `0.0.0.0/0`
    *   **IP Protocol:** `TCP`
    *   **Destination Port Range:** `80,443`
    *   **Description:** HTTP HTTPS
4.  Click **Add Ingress Rules**.

### 2.2 Abrir puertos en Ubuntu (IPtables)
Oracle Ubuntu viene con reglas estrictas por defecto.
1.  Conéctate por SSH:
    ```bash
    chmod 400 tu_llave.key
    ssh -i tu_llave.key ubuntu@TU_IP_PUBLICA
    ```
2.  Ejecuta estos comandos **exactamente**:
    ```bash
    # Abrir HTTP (80) y HTTPS (443)
    sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
    sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
    
    # Guardar para que persista al reiniciar
    sudo netfilter-persistent save
    ```

---

## 🛠️ Paso 3: Instalación del Stack Tecnológico

Tu máquina es ARM (aarch64), pero todo nuestro stack es compatible.

```bash
# 1. Actualizar sistema
sudo apt update && sudo apt upgrade -y

# 2. Instalar Docker y Docker Compose
sudo apt install docker.io docker-compose -y
sudo usermod -aG docker $USER

# 3. Instalar Nginx y Certbot (SSL)
sudo apt install nginx certbot python3-certbot-nginx -y

# 4. Instalar Node.js 20 (Compatible con ARM64)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2

# 5. Aplicar cambios de usuario (Docker)
newgrp docker
```

---

## 📦 Paso 4: Despliegue de la Aplicación

1.  **Clonar el código:**
    ```bash
    git clone https://github.com/bmontoyag/graciaspa.git app
    cd app
    ```

2.  **Configurar Base de Datos:**
    Usaremos el archivo optimizado que preparamos en `deployment/`.
    ```bash
    cd backend
    # Crear .env
    nano .env
    # PEGAR VARIABLES:
    # DATABASE_URL="postgresql://admin:spa_secure_pass@localhost:5432/graciaspa?schema=public"
    # ... otras variables ...
    
    # Levantar DB usando el archivo prod
    docker-compose -f ../deployment/docker-compose.prod.yml up -d
    ```

3.  **Compilar Backend:**
    ```bash
    npm install
    npx prisma generate
    npx prisma db push
    npx prisma db seed
    npm run build
    
    # Iniciar con PM2
    pm2 start dist/src/main.js --name "backend"
    ```

4.  **Compilar Frontend:**
    ```bash
    cd ../web-admin
    nano .env.local
    # PEGAR: NEXT_PUBLIC_API_URL=https://tudominio.duckdns.org/api
    
    npm install
    npm run build
    
    # Iniciar con PM2
    pm2 start npm --name "frontend" -- start -- -p 3000
    ```

5.  **Persistir procesos:**
    ```bash
    pm2 save
    pm2 startup
    ```

---

## 🌐 Paso 5: Configurar Proxy Reverso (Nginx) y SSL

1.  **Configurar Nginx:**
    Copiaremos la plantilla y reemplazaremos el dominio.
    ```bash
    sudo cp ../deployment/nginx.conf.template /etc/nginx/sites-available/graciaspa
    sudo nano /etc/nginx/sites-available/graciaspa
    ```
    *Cambia `${DOMAIN_NAME}` por tu dominio real (ej: graciaspa.duckdns.org).*

2.  **Activar sitio:**
    ```bash
    sudo ln -s /etc/nginx/sites-available/graciaspa /etc/nginx/sites-enabled/
    sudo rm /etc/nginx/sites-enabled/default
    sudo nginx -t
    sudo systemctl restart nginx
    ```

3.  **Certificado SSL (HTTPS):**
    ```bash
    sudo certbot --nginx -d graciaspa.duckdns.org
    ```

---

## ✅ Verificación

Entra a `https://graciaspa.duckdns.org`.
¡Deberías ver tu sistema funcionando velozmente gracias a la infraestructura de Oracle!

### Comandos Útiles
*   **Ver logs:** `pm2 logs`
*   **Reiniciar todo:** `./scripts/stop.sh` y luego `./scripts/start.sh`
*   **Ver estado DB:** `docker ps`

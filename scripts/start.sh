#!/bin/bash

echo "🚀 Iniciando Gracias Spa Manager..."

# 1. Iniciar Base de Datos (Docker)
echo "📦 Levantando Base de Datos..."
cd ~/graciaspa/app/backend
sudo docker-compose up -d
sleep 5 # Esperar a que la DB esté lista

# 2. Iniciar Servicios con PM2 (Backend y Frontend)
echo "🌐 Iniciando Backend y Frontend..."
pm2 resurrect || pm2 start dist/main.js --name "backend" && cd ../web-admin && pm2 start "npm start" --name "frontend"

# 3. Reiniciar Nginx (por si acaso)
echo "proxy Reiniciando Nginx..."
sudo systemctl restart nginx

echo "✅ Todo listo! Tu aplicación está corriendo."
pm2 list

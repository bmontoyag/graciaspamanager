#!/bin/bash

echo "🛑 Deteniendo Gracias Spa Manager..."

# 1. Detener PM2 (Backend y Frontend)
echo "🌐 Deteniendo Backend y Frontend..."
pm2 stop all
pm2 delete all # Opcional: para limpiar la lista

# 2. Detener Base de Datos (Docker)
echo "📦 Deteniendo Base de Datos..."
cd ~/graciaspa/app/backend
sudo docker-compose down

echo "✅ Todos los servicios han sido detenidos."

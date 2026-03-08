#!/bin/bash

# Deployment Script for Oracle Cloud / Production Server

echo "🚀 Starting Deployment..."

# 1. Pull latest changes
echo "📥 Pulling latest changes from Git..."
git pull origin main

# 2. Backend Deployment
echo "⚙️  Setting up Backend..."
cd backend
echo "📦 Installing Backend Dependencies..."
npm install
echo "🏗️  Building Backend..."
npm run build
echo "🔄 Restarting Backend PM2 Service..."
pm2 restart backend || pm2 start dist/src/main.js --name backend
cd ..

# 3. Frontend Deployment
echo "🎨 Setting up Frontend..."
cd web-admin
echo "📦 Installing Frontend Dependencies..."
npm install
echo "🏗️  Building Frontend..."
# Increase memory limit for build if needed
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
echo "🔄 Restarting Frontend PM2 Service..."
pm2 restart frontend || pm2 start npm --name "frontend" -- start
cd ..

# 4. Database Migrations (Safe Production Mode)
# "migrate deploy" aplica migraciones pendientes creadas en dev sin borrar datos ni recrear la BD.
# Evita "db push" en prod porque podría perder datos si hay conflictos de esquema.
echo "🗄️  Applying Database Schema Changes (safe)..."
cd backend
npx prisma generate
npx prisma migrate deploy
cd ..

echo "🛡️  NOTA: Los archivos .env (.env.local, .env.production) locales NO son sobrescritos por git pull."
echo "✅ Deployment Complete!"
pm2 save
pm2 status

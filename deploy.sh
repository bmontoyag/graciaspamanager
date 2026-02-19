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

# 4. Database Migrations (Optional - Safe)
# Only pushes schema changes, does not delete data unless specifically destructive
echo "🗄️  Applying Database Schema Changes (safe)..."
cd backend
npx prisma db push
cd ..

echo "✅ Deployment Complete!"
pm2 status

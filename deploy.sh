#!/bin/bash
# ========================================================
# ArzMart Production Auto-Deployment Script
# ========================================================

set -e

echo "🚀 Starting ArzMart Deployment..."

# 1. Pull latest git changes
echo "📥 Pulling latest codebase from git..."
git pull origin main

# 2. Build Frontend
echo "📦 Building Frontend..."
cd frontend
npm install --legacy-peer-deps
npm run build
cd ..

# 3. Setup Backend
echo "⚙️ Setting up Backend..."
cd backend
npm install --legacy-peer-deps
cd ..

# 4. Reload PM2 Cluster
echo "🔄 Reloading Application via PM2..."
if command -v pm2 &> /dev/null
then
    pm2 reload ecosystem.config.js || pm2 start ecosystem.config.js
    pm2 save
    echo "✅ PM2 Process Reloaded Successfully!"
else
    echo "⚠️ PM2 not found globally, restarting node directly..."
    pkill -f "node backend/src/index.js" || true
    nohup node backend/src/index.js > app.log 2>&1 &
fi

echo "🎉 Deployment Completed Successfully for https://arzmart.com!"

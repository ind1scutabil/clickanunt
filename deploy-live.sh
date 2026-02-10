#!/bin/bash

# Deploy to www.clickanunt.ro

set -e

SERVER_IP="46.225.69.155"
DOMAIN="www.clickanunt.ro"
SERVER_USER="root"
APP_DIR="/var/www/clickanunt"

echo "🚀 DEPLOYING TO $DOMAIN"
echo "================================"

# Step 1: Build
echo "📦 Building application..."
npm run build

# Step 2: Deploy
echo "📡 Uploading to server..."

ssh "${SERVER_USER}@${SERVER_IP}" << 'EOF'
set -e

APP_DIR="/var/www/clickanunt"

# Create directories
mkdir -p "${APP_DIR}"
cd "${APP_DIR}"

# Stop application
echo "⏹️  Stopping application..."
pm2 stop clickanunt 2>/dev/null || true

# Create backup
echo "📦 Creating backup..."
if [ -d "current" ]; then
  tar -czf "backup-$(date +%s).tar.gz" current
fi

# Prepare deployment
mkdir -p current
cd current

EOF

# Copy files
echo "📄 Copying files..."
rsync -avz --exclude='node_modules' \
  --exclude='.git' \
  --exclude='deploy_temp' \
  --exclude='*.tar.gz' \
  --exclude='.env.local' \
  .next/ root@"${SERVER_IP}":"${APP_DIR}"/current/.next/

rsync -avz public/ root@"${SERVER_IP}":"${APP_DIR}"/current/public/
rsync -avz prisma/ root@"${SERVER_IP}":"${APP_DIR}"/current/prisma/

scp package.json root@"${SERVER_IP}":"${APP_DIR}"/current/
scp package-lock.json root@"${SERVER_IP}":"${APP_DIR}"/current/
scp next.config.ts root@"${SERVER_IP}":"${APP_DIR}"/current/
scp tsconfig.json root@"${SERVER_IP}":"${APP_DIR}"/current/
scp .env.production root@"${SERVER_IP}":"${APP_DIR}"/current/.env

# Install and start
ssh "${SERVER_USER}@${SERVER_IP}" << 'EOF'
APP_DIR="/var/www/clickanunt"
cd "${APP_DIR}/current"

echo "📦 Installing dependencies..."
npm ci --production

echo "🗄️  Database check..."
npx prisma generate

echo "🔄 Starting application..."
pm2 restart clickanunt 2>/dev/null || pm2 start npm --name "clickanunt" -- start
pm2 save

echo "🔄 Reloading Nginx..."
systemctl reload nginx

echo "✅ Deployment complete!"
EOF

echo -e "\n✅ Done! Visit: https://${DOMAIN}"

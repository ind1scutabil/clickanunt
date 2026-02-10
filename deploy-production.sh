#!/bin/bash

# Auto-Platform Production Deployment Script
# This script deploys the latest build to the production server

set -e

# Server configuration
SERVER_IP="46.225.69.155"
SERVER_USER="appuser"
SSH_KEY="$HOME/.ssh/hetzner_ed25519"
APP_DIR="/var/www/auto-platform"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "🚀 Starting deployment to $SERVER_IP..."
echo "⏰ Timestamp: $TIMESTAMP"

# Step 1: Build locally
echo ""
echo "📦 Step 1: Building application locally..."
npm run build
echo "✅ Build successful!"

# Step 2: Create deployment package
echo ""
echo "📦 Step 2: Creating deployment package..."
DEPLOY_PACKAGE="deploy_${TIMESTAMP}.tar.gz"

tar -czf "${DEPLOY_PACKAGE}" \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=.next/cache \
    --exclude=*.log \
    .next \
    public \
    package.json \
    package-lock.json \
    prisma \
    app \
    lib \
    middleware.ts \
    next.config.ts \
    tsconfig.json \
    ecosystem.config.js

FILE_SIZE=$(du -h "${DEPLOY_PACKAGE}" | cut -f1)
echo "✅ Package created: ${DEPLOY_PACKAGE} (${FILE_SIZE})"

# Step 3: Upload to server
echo ""
echo "📤 Step 3: Uploading to server..."
scp -i "${SSH_KEY}" "${DEPLOY_PACKAGE}" ${SERVER_USER}@${SERVER_IP}:/tmp/
echo "✅ Upload successful!"

# Step 4: Deploy on server
echo ""
echo "🔧 Step 4: Deploying on server..."
ssh -i "${SSH_KEY}" ${SERVER_USER}@${SERVER_IP} << 'REMOTE_EOF'
set -e

APP_DIR="/var/www/auto-platform"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Find the uploaded package (most recent)
DEPLOY_PACKAGE=$(ls -t /tmp/deploy_*.tar.gz 2>/dev/null | head -n 1)

if [ -z "$DEPLOY_PACKAGE" ]; then
    echo "❌ Error: No deployment package found!"
    exit 1
fi

echo "📦 Found package: $(basename $DEPLOY_PACKAGE)"

# Backup current version
echo "💾 Backing up current version..."
if [ -d "${APP_DIR}/.next" ]; then
    sudo tar -czf ${APP_DIR}_backup_${TIMESTAMP}.tar.gz -C ${APP_DIR} .
    echo "✅ Backup created: ${APP_DIR}_backup_${TIMESTAMP}.tar.gz"
fi

# Extract new version
echo "📂 Extracting new version..."
cd ${APP_DIR}
sudo tar -xzf ${DEPLOY_PACKAGE}
echo "✅ Extraction successful!"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production
echo "✅ Dependencies installed!"

# Generate Prisma client
echo "🗄️ Generating Prisma client..."
npx prisma generate
echo "✅ Prisma client generated!"

# Run migrations
echo "🗄️ Running database migrations..."
npx prisma migrate deploy
echo "✅ Migrations completed!"

# Reload PM2
echo "🔄 Reloading PM2 app..."
pm2 reload ecosystem.config.js --env production
sleep 2
echo "✅ PM2 reloaded!"

# Cleanup
echo "🧹 Cleaning up..."
rm ${DEPLOY_PACKAGE}

# Keep only last 3 backups
echo "📋 Managing backups..."
ls -t ${APP_DIR}_backup_*.tar.gz 2>/dev/null | tail -n +4 | xargs rm -f 2>/dev/null || true

# Show status
echo ""
echo "📊 PM2 Status:"
pm2 status
echo ""
echo "✅ Deployment complete!"

REMOTE_EOF

# Step 5: Cleanup local package
echo ""
echo "🧹 Step 5: Cleaning up local files..."
rm "${DEPLOY_PACKAGE}"
echo "✅ Cleanup done!"

# Step 6: Verify deployment
echo ""
echo "🔍 Step 6: Verifying deployment..."
echo ""
echo "📊 Server status:"
ssh -i "${SSH_KEY}" ${SERVER_USER}@${SERVER_IP} 'pm2 status'

echo ""
echo "======================================"
echo "✅ DEPLOYMENT SUCCESSFUL!"
echo "======================================"
echo ""
echo "🌐 Application: https://clickanunt.ro"
echo "📊 Server IP: ${SERVER_IP}"
echo "📝 Logs: ssh -i ${SSH_KEY} ${SERVER_USER}@${SERVER_IP} 'pm2 logs auto-platform'"
echo "🔄 Restart: ssh -i ${SSH_KEY} ${SERVER_USER}@${SERVER_IP} 'pm2 restart auto-platform'"
echo ""

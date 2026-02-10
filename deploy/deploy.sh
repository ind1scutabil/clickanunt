#!/bin/bash
# Deployment script for auto-platform
# Run from your local machine: bash deploy.sh production

set -e

ENV=${1:-staging}
SERVER_USER="appuser"
SERVER_HOST="your-server-ip"
APP_DIR="/var/www/auto-platform"

if [ "$ENV" != "production" ] && [ "$ENV" != "staging" ]; then
    echo "Usage: $0 [production|staging]"
    exit 1
fi

echo "🚀 Deploying to ${ENV}..."

# Build locally
echo "🔨 Building application..."
npm run build

# Create deployment package
echo "📦 Creating deployment package..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
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
    ecosystem.config.js \
    next.config.ts \
    tsconfig.json

echo "📤 Uploading to server..."
scp "${DEPLOY_PACKAGE}" ${SERVER_USER}@${SERVER_HOST}:/tmp/

echo "🔧 Deploying on server..."
ssh ${SERVER_USER}@${SERVER_HOST} << EOF
    set -e
    
    # Create backup of current version
    if [ -d "${APP_DIR}/.next" ]; then
        echo "💾 Backing up current version..."
        tar -czf ${APP_DIR}_backup_${TIMESTAMP}.tar.gz -C ${APP_DIR} .
    fi
    
    # Extract new version
    echo "📦 Extracting new version..."
    cd ${APP_DIR}
    tar -xzf /tmp/${DEPLOY_PACKAGE}
    
    # Install dependencies
    echo "📦 Installing dependencies..."
    npm ci --production
    
    # Run database migrations
    echo "🗄️ Running database migrations..."
    npx prisma migrate deploy
    npx prisma generate
    
    # Reload PM2
    echo "🔄 Reloading application..."
    pm2 reload ecosystem.config.js --env ${ENV}
    
    # Clean up
    rm /tmp/${DEPLOY_PACKAGE}
    
    # Keep only last 5 backups
    ls -t ${APP_DIR}_backup_*.tar.gz 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true
    
    echo "✅ Deployment complete!"
    pm2 status
EOF

# Clean up local package
rm "${DEPLOY_PACKAGE}"

echo ""
echo "✅ Deployment to ${ENV} completed successfully!"
echo "🔍 Check status: ssh ${SERVER_USER}@${SERVER_HOST} 'pm2 status'"
echo "📋 View logs: ssh ${SERVER_USER}@${SERVER_HOST} 'pm2 logs auto-platform'"

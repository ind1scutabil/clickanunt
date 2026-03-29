#!/bin/bash

###############################################################################
# Rollback Script
# Reverts to previous deployment
###############################################################################

set -e

SERVER="root@46.225.69.155"
DEPLOY_DIR="/var/www/clickanunt"

echo "════════════════════════════════════════════════════════"
echo "  🔄 ClickAnunț Rollback"
echo "════════════════════════════════════════════════════════"
echo ""

# Check if git tag provided
if [ -z "$1" ]; then
  echo "Available tags:"
  git tag -l | tail -10
  echo ""
  read -p "Enter tag to rollback to (or press Enter for HEAD~1): " TAG
  if [ -z "$TAG" ]; then
    TAG="HEAD~1"
  fi
else
  TAG="$1"
fi

echo "Rolling back to: $TAG"
echo ""

# Confirm
read -p "⚠️  This will deploy $TAG to production. Continue? (y/N): " confirm
if [[ ! $confirm =~ ^[Yy]$ ]]; then
  echo "Rollback cancelled"
  exit 0
fi

echo ""
echo "[1/7] Checking out $TAG..."
git checkout $TAG

echo "[2/7] Installing dependencies..."
npm ci

echo "[3/7] Building locally..."
npm run build

echo "[4/7] Syncing to server..."
rsync -avz --delete \
  --exclude node_modules \
  --exclude .git \
  --exclude .next \
  --exclude .env.local \
  --exclude 'public/uploads/' \
  ./ ${SERVER}:${DEPLOY_DIR}/

echo "[5/7] Installing dependencies on server..."
ssh ${SERVER} "cd ${DEPLOY_DIR} && npm ci && npx prisma generate"

echo "[6/7] Building on server..."
ssh ${SERVER} "cd ${DEPLOY_DIR} && NODE_ENV=production npm run build"

echo "[7/7] Reloading PM2..."
ssh ${SERVER} "cd ${DEPLOY_DIR} && pm2 reload clickanunt"

echo ""
echo "✅ Rollback complete!"
echo ""
echo "Verifying..."
sleep 3
curl -f https://www.clickanunt.ro/api/health && echo "✅ Health check passed" || echo "⚠️  Health check failed"
echo ""
echo "🔄 Rolled back to $TAG"

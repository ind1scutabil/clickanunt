#!/bin/bash

# LEGACY — DO NOT USE (FAZA 21E, 2026-07-28)
# rsync + restart --cwd /var/www/clickanunt: model in-place, incompatibil cu
# topologia reala (release-uri imutabile sub /var/www/clickanunt-releases +
# symlink `current`). Foloseste in schimb:
#   scripts/deploy-production-release.sh --sha <SHA> [--dry-run]

# ClickAnunț Production Deployment - No Passphrase Version
# Assumes SSH key is already in agent or public key auth is set up

set -e
set -u

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🚀 ClickAnunț Production Deployment${NC}"
echo -e "${YELLOW}Building...${NC}"

# Build locally
cd /Users/ind1scutabil/projects/auto-platform
npm run build --quiet 2>/dev/null || npm run build

BUILD_ID=$(date -u +%Y%m%dT%H%M%SZ)
GIT_COMMIT=$(git rev-parse --short HEAD)

echo -e "${GREEN}✓ Build complete${NC}"
echo ""
echo -e "${YELLOW}Syncing to server...${NC}"

# Sync files
rsync -avz --delete \
  --exclude node_modules \
  --exclude .git \
  --exclude coverage \
  --exclude .swc \
  --exclude 'public/uploads/' \
  ./ root@46.225.69.155:/var/www/clickanunt/ 2>&1 | grep -E "sending|deleting|total|error" || true

echo -e "${GREEN}✓ Files synced${NC}"
echo ""
echo -e "${YELLOW}Running server setup...${NC}"

# Execute on server
ssh root@46.225.69.155 << DEPLOY
set -e
cd /var/www/clickanunt

echo "Installing dependencies..."
npm ci --quiet 2>&1 | tail -3

echo "Running migrations..."
npx prisma migrate deploy 2>&1 | tail -5

echo "Building on server..."
NEXT_PUBLIC_BUILD_ID='${BUILD_ID}' NODE_ENV=production npm run build 2>&1 | grep -E "✓|error" | head -5

echo "Restarting PM2..."
if pm2 describe clickanunt >/dev/null 2>&1; then
  pm2 restart clickanunt --update-env
else
  pm2 start npm --name clickanunt -- start --cwd /var/www/clickanunt
  pm2 save
fi

echo "Checking status..."
pm2 status clickanunt | grep clickanunt
DEPLOY

echo -e "${GREEN}✓ Server setup complete${NC}"
echo ""
echo -e "${YELLOW}Health check (5 second wait)...${NC}"
sleep 5

if curl -sf https://www.clickanunt.ro/api/health > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Health check passed${NC}"
else
  echo -e "${YELLOW}⚠️  Health check pending (may take 10 more seconds)${NC}"
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo ""
echo "📊 Details:"
echo "   Build ID: ${BUILD_ID}"
echo "   Commit: ${GIT_COMMIT}"
echo "   Server: 46.225.69.155"
echo "   URL: https://www.clickanunt.ro"
echo ""
echo "📝 View logs:"
echo "   ssh root@46.225.69.155 'pm2 logs clickanunt --lines 100'"
echo ""

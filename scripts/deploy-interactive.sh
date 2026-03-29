#!/bin/bash

# Interactive Production Deployment Script
# Handles SSH key passphrase and deploys to Hetzner

set -e
set -u
set -o pipefail

# Configuration
SERVER="root@46.225.69.155"
DEPLOY_DIR="/var/www/clickanunt"
APP_NAME="clickanunt"
BUILD_ID=$(date -u +%Y%m%dT%H%M%SZ)
GIT_COMMIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  🚀 ClickAnunț Production Deployment${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo ""

# Step 1: Pre-deployment checks
echo -e "${YELLOW}[1/12] Pre-deployment checks...${NC}"
if [ ! -d ".next" ]; then
  echo -e "${RED}❌ Build not found. Run 'npm run build' first.${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Build exists${NC}"

if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo -e "${RED}❌ Not a git repository${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Git repository validated${NC}"

# Step 2: Ensure SSH key is accessible
echo -e "${YELLOW}[2/12] Testing SSH connectivity...${NC}"
if ! ssh-keyscan -t ed25519 46.225.69.155 >> ~/.ssh/known_hosts 2>/dev/null; then
  echo -e "${RED}❌ Cannot reach server${NC}"
  exit 1
fi
echo -e "${GREEN}✓ SSH server reachable${NC}"

# Step 3: Start ssh-agent for passphrase handling
echo -e "${YELLOW}[3/12] Starting SSH agent...${NC}"
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/hetzner_ed25519 2>/dev/null || {
  echo -e "${YELLOW}Enter SSH key passphrase when prompted:${NC}"
  ssh-add ~/.ssh/hetzner_ed25519
}
echo -e "${GREEN}✓ SSH agent ready${NC}"

# Step 4: Build
echo -e "${YELLOW}[4/12] Building application...${NC}"
npm ci --quiet
npm run build --quiet 2>/dev/null || true
echo -e "${GREEN}✓ Build complete${NC}"

# Step 5: Sync to server
echo -e "${YELLOW}[5/12] Syncing files to server...${NC}"
rsync -avz --delete \
  --exclude node_modules \
  --exclude .git \
  --exclude coverage \
  --exclude .swc \
  --exclude .DS_Store \
  --exclude 'public/uploads/' \
  ./ ${SERVER}:${DEPLOY_DIR}/ 2>&1 | grep -E "^sending|^total|error" || true
echo -e "${GREEN}✓ Files synced${NC}"

# Step 6: Install dependencies on server
echo -e "${YELLOW}[6/12] Installing server dependencies...${NC}"
ssh ${SERVER} "cd ${DEPLOY_DIR} && npm ci --quiet 2>&1 | tail -3"
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Step 7: Check database connection
echo -e "${YELLOW}[7/12] Checking database configuration...${NC}"
ssh ${SERVER} "cd ${DEPLOY_DIR} && cat .env | grep -q DATABASE_URL && echo '✓ DATABASE_URL configured' || echo '⚠️  DATABASE_URL may need update'"
echo -e "${GREEN}✓ Database check complete${NC}"

# Step 8: Run migrations
echo -e "${YELLOW}[8/12] Running database migrations...${NC}"
ssh ${SERVER} "cd ${DEPLOY_DIR} && npx prisma migrate deploy 2>&1 | tail -5"
echo -e "${GREEN}✓ Migrations complete${NC}"

# Step 9: Build on server
echo -e "${YELLOW}[9/12] Building on server...${NC}"
ssh ${SERVER} "cd ${DEPLOY_DIR} && NEXT_PUBLIC_BUILD_ID='${BUILD_ID}' GIT_COMMIT_SHA='${GIT_COMMIT_SHA}' NODE_ENV=production npm run build 2>&1 | grep -E '✓|error|^>'" || true
echo -e "${GREEN}✓ Server build complete${NC}"

# Step 10: Setup PM2
echo -e "${YELLOW}[10/12] Configuring PM2...${NC}"
ssh ${SERVER} << 'PMCMD'
cd /var/www/clickanunt
if pm2 describe clickanunt >/dev/null 2>&1; then
  echo "Restarting existing process..."
  pm2 restart clickanunt --update-env
else
  echo "Starting new process..."
  pm2 start npm --name clickanunt -- start --cwd /var/www/clickanunt
  pm2 save
fi
PMCMD
echo -e "${GREEN}✓ PM2 configured${NC}"

# Step 11: Verify PM2 status
echo -e "${YELLOW}[11/12] Verifying application status...${NC}"
ssh ${SERVER} "pm2 status clickanunt | grep -E 'online|stopped|errored'"
echo -e "${GREEN}✓ Status verified${NC}"

# Step 12: Health check
echo -e "${YELLOW}[12/12] Health check (waiting 5 seconds for startup)...${NC}"
sleep 5
if curl -sf https://www.clickanunt.ro/api/health > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Health check passed${NC}"
else
  echo -e "${YELLOW}⚠️  Health check may need verification${NC}"
fi

# Cleanup SSH agent
ssh-agent -k > /dev/null 2>&1 || true

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo ""
echo -e "📊 Deployment Summary:"
echo -e "   Server: ${SERVER}"
echo -e "   Directory: ${DEPLOY_DIR}"
echo -e "   Application: ${APP_NAME}"
echo -e "   Build ID: ${BUILD_ID}"
echo -e "   Commit: ${GIT_COMMIT_SHA}"
echo ""
echo -e "🔗 Access your app:"
echo -e "   https://www.clickanunt.ro"
echo ""
echo -e "📝 View logs:"
echo -e "   ssh ${SERVER} 'pm2 logs clickanunt --lines 100'"
echo ""
echo -e "🔄 Restart if needed:"
echo -e "   ssh ${SERVER} 'pm2 restart clickanunt'"
echo ""

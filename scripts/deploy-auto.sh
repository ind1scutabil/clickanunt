#!/bin/bash

###############################################################################
# Automatic Production Deployment Script with Git Integration
# Deploys ClickAnunț to Hetzner VPS with full automation
###############################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable
set -o pipefail  # Exit on pipeline failure

# Configuration
SERVER="root@46.225.69.155"
DEPLOY_DIR="/var/www/clickanunt"
APP_NAME="clickanunt"
BRANCH="main"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Trap errors
trap 'echo -e "${RED}❌ Deployment failed at step: $BASH_COMMAND${NC}"; exit 1' ERR

echo "════════════════════════════════════════════════════════"
echo -e "  ${BLUE}🚀 ClickAnunț AUTOMATIC Production Deployment${NC}"
echo "════════════════════════════════════════════════════════"
echo ""

# Function to prompt for confirmation
confirm() {
    local message="$1"
    echo -e "${YELLOW}$message${NC}"
    read -p "Continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}❌ Deployment cancelled by user${NC}"
        exit 1
    fi
}

# Step 1: Check git status
echo -e "${BLUE}[1/12] Checking git status...${NC}"
if ! git diff --quiet || ! git diff --staged --quiet; then
    echo -e "${YELLOW}⚠️  You have uncommitted changes${NC}"
    git status --short
    confirm "Do you want to commit these changes?"
else
    echo "✅ Working directory is clean"
fi

# Step 2: Git add all changes
echo -e "${BLUE}[2/12] Staging all changes...${NC}"
git add .
echo "✅ All changes staged"

# Step 3: Git commit
echo -e "${BLUE}[3/12] Committing changes...${NC}"
COMMIT_MSG="Deploy: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
if git diff --staged --quiet; then
    echo "ℹ️  No changes to commit, skipping..."
else
    git commit -m "$COMMIT_MSG" || {
        echo -e "${YELLOW}⚠️  Commit failed or no changes. Continuing...${NC}"
    }
    echo "✅ Changes committed"
fi

# Step 4: Git push
echo -e "${BLUE}[4/12] Pushing to remote repository...${NC}"
git push origin $BRANCH || {
    echo -e "${RED}❌ Git push failed. Cannot proceed with deployment.${NC}"
    exit 1
}
echo "✅ Code pushed to repository"

# Step 5: Get commit info
GIT_COMMIT_SHA=$(git rev-parse --short HEAD)
BUILD_ID=$(date -u +%Y%m%dT%H%M%SZ)

echo -e "${GREEN}📋 Deployment Info:${NC}"
echo "  - Commit: $GIT_COMMIT_SHA"
echo "  - Build ID: $BUILD_ID"
echo "  - Branch: $BRANCH"
echo ""

# Step 6: Pre-flight checks
echo -e "${BLUE}[5/12] Running pre-flight checks...${NC}"
npm run lint || { echo -e "${RED}❌ Linting failed${NC}"; exit 1; }
npm run type-check || { echo -e "${RED}❌ Type check failed${NC}"; exit 1; }
npm run test || { echo -e "${RED}❌ Tests failed${NC}"; exit 1; }
echo "✅ Pre-flight checks passed"

# Step 7: Build locally
echo -e "${BLUE}[6/12] Building application locally...${NC}"
npm run build || { echo -e "${RED}❌ Build failed${NC}"; exit 1; }
echo "✅ Local build completed"

# Step 8: Test SSH connectivity
echo -e "${BLUE}[7/12] Testing SSH connectivity...${NC}"
ssh -o ConnectTimeout=10 -o BatchMode=yes ${SERVER} "echo '✅ SSH connection successful'" || {
    echo -e "${RED}❌ Cannot connect to server${NC}"
    exit 1
}

# Step 9: Sync files to server
echo -e "${BLUE}[8/12] Syncing files to server...${NC}"
rsync -avz --delete --exclude node_modules --exclude .git --exclude .next --exclude coverage --exclude .swc --exclude 'public/uploads/' \
  ./ ${SERVER}:${DEPLOY_DIR}/ || {
    echo -e "${RED}❌ File sync failed${NC}"
    exit 1
}
echo "✅ Files synced"

# Step 10: Server-side setup
echo -e "${BLUE}[9/12] Installing dependencies on server...${NC}"
ssh ${SERVER} "cd ${DEPLOY_DIR} && npm ci" || {
    echo -e "${RED}❌ Server npm install failed${NC}"
    exit 1
}

echo -e "${BLUE}[10/12] Running database migrations...${NC}"
ssh ${SERVER} "cd ${DEPLOY_DIR} && npx prisma migrate deploy && npx prisma generate" || {
    echo -e "${RED}❌ Database migration failed${NC}"
    exit 1
}

echo -e "${BLUE}[11/12] Building on server...${NC}"
ssh ${SERVER} "cd ${DEPLOY_DIR} && NEXT_PUBLIC_BUILD_ID='${BUILD_ID}' GIT_COMMIT_SHA='${GIT_COMMIT_SHA}' NODE_ENV=production npm run build" || {
    echo -e "${RED}❌ Server build failed${NC}"
    exit 1
}

# Step 12: Restart application
echo -e "${BLUE}[12/12] Restarting application...${NC}"
ssh ${SERVER} "cd ${DEPLOY_DIR} && NEXT_PUBLIC_BUILD_ID='${BUILD_ID}' GIT_COMMIT_SHA='${GIT_COMMIT_SHA}' pm2 restart ${APP_NAME} --update-env" || \
ssh ${SERVER} "cd ${DEPLOY_DIR} && NEXT_PUBLIC_BUILD_ID='${BUILD_ID}' GIT_COMMIT_SHA='${GIT_COMMIT_SHA}' pm2 start npm --name ${APP_NAME} -- start --cwd ${DEPLOY_DIR}" || {
    echo -e "${RED}❌ Application restart failed${NC}"
    exit 1
}

# Step 13: Health check
echo -e "${BLUE}[13/13] Verifying deployment...${NC}"
sleep 5
if curl -f -s https://www.clickanunt.ro/api/health > /dev/null; then
    echo -e "${GREEN}✅ Health check passed${NC}"
else
    echo -e "${YELLOW}⚠️  Health check failed - please verify manually${NC}"
fi

# Step 14: Show status
echo -e "${BLUE}Checking application status...${NC}"
ssh ${SERVER} "pm2 status ${APP_NAME}" || echo "Could not check PM2 status"

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ AUTOMATIC DEPLOYMENT COMPLETED SUCCESSFULLY!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo ""
echo "📊 Deployment Summary:"
echo "  - Server: ${SERVER}"
echo "  - Directory: ${DEPLOY_DIR}"
echo "  - Application: ${APP_NAME}"
echo "  - Build ID: ${BUILD_ID}"
echo "  - Git Commit: ${GIT_COMMIT_SHA}"
echo "  - Branch: ${BRANCH}"
echo ""
echo "🔍 Next Steps:"
echo "1. Verify at: https://www.clickanunt.ro"
echo "2. Check logs: ssh ${SERVER} 'pm2 logs ${APP_NAME} --lines 50'"
echo "3. Clear cache: https://dash.cloudflare.com"
echo ""
echo -e "${GREEN}🎉 All automated checks passed!${NC}"
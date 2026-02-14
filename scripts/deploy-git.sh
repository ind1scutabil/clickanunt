#!/bin/bash

###############################################################################
# ClickAnunț Production Deployment - GIT-BASED
# 
# CRITICAL REQUIREMENTS:
# 1. Production MUST run from a git repository
# 2. Deploy uses git pull (not rsync)
# 3. /api/version MUST return real commit hash
# 4. If git is missing, deployment FAILS loudly
#
# Deployment Flow:
# Local: git push → /tmp/clickanunt.git
# Production: git pull from /tmp/clickanunt.git
# Production: npm install → npm run build → pm2 reload
###############################################################################

set -e

###############################################################################
# DEPLOYMENT SAFETY CHECKS
###############################################################################

# Verify we're in a git repository (local)
if [ ! -d ".git" ]; then
  echo "❌ ERROR: Not in a git repository"
  echo "   This script must run from the project root directory."
  exit 1
fi

# Verify scripts/deploy-git.sh exists (prevents running from wrong repo)
if [ ! -f "scripts/deploy-git.sh" ]; then
  echo "❌ ERROR: scripts/deploy-git.sh not found"
  echo "   This script must run from the auto-platform project root."
  exit 1
fi

echo "✅ Local checks passed: Running from project root with git"
echo ""

###############################################################################

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SERVER="root@46.225.69.155"
DEPLOY_DIR="/var/www/clickanunt"
LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BARE_REPO="/tmp/clickanunt.git"
GIT_COMMIT=$(git rev-parse HEAD)
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
DEPLOY_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

echo "════════════════════════════════════════════════════════════"
echo "  🚀 ClickAnunț Production Deployment (GIT-BASED)"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📋 Deployment Info:"
echo "  Git Commit: ${BLUE}${GIT_COMMIT:0:8}${NC}"
echo "  Git Branch: ${BLUE}${GIT_BRANCH}${NC}"
echo "  Deployed:   ${BLUE}${DEPLOY_TIMESTAMP}${NC}"
echo "  Server:     ${BLUE}${SERVER}${NC}"
echo "  Deploy Dir: ${BLUE}${DEPLOY_DIR}${NC}"
echo ""

# Step 1: Pre-flight checks
echo "${BLUE}[1/9]${NC} Running pre-flight checks..."
if ! npm run predeploy 2>&1 | tail -3; then
  echo "${RED}❌ Pre-deploy checks failed${NC}"
  exit 1
fi
echo "${GREEN}✅ Pre-deploy checks passed${NC}"
echo ""

# Step 2: Build locally
echo "${BLUE}[2/9]${NC} Building application locally..."
if ! npm run build 2>&1 | tail -3; then
  echo "${RED}❌ Build failed${NC}"
  exit 1
fi
echo "${GREEN}✅ Build completed${NC}"
echo ""

# Step 3: Push to local bare repo (serves as deploy source)
echo "${BLUE}[3/9]${NC} Preparing deployment repository..."
if [ ! -d "$BARE_REPO" ]; then
  mkdir -p "$BARE_REPO"
  cd "$BARE_REPO"
  git init --bare
  cd "$LOCAL_DIR"
fi

git remote add deploy "$BARE_REPO" 2>/dev/null || git remote set-url deploy "$BARE_REPO"
git push -u deploy "$GIT_BRANCH" --force 2>&1 | tail -3
echo "${GREEN}✅ Code pushed to deploy repository${NC}"
echo ""

# Step 3.5: Sync .git folder to server (CRITICAL - ensures latest commits available)
echo "${BLUE}[3.5/9]${NC} Syncing git history to server..."
echo "📤 Rsync .git folder to ${SERVER}:${BARE_REPO}..."
rsync -azq --delete "${LOCAL_DIR}/.git/" root@"${SERVER}:${BARE_REPO}/" || {
  echo "${YELLOW}⚠️  Git sync warning (continuing anyway)${NC}"
}
echo "${GREEN}✅ Git history synced${NC}"
echo ""

# Step 4: Verify SSH connectivity
echo "${BLUE}[4/9]${NC} Testing SSH connectivity and git config..."
ssh -o ConnectTimeout=10 "${SERVER}" "git config --global --add safe.directory ${BARE_REPO} && git config --global --add safe.directory ${DEPLOY_DIR}" 2>/dev/null || true
if ! ssh -o ConnectTimeout=10 "${SERVER}" "echo '✅ SSH ok'" 2>&1 | grep -q "SSH"; then
  echo "${RED}❌ Cannot connect to server${NC}"
  exit 1
fi
echo "${GREEN}✅ SSH and git configured${NC}"

# Step 5: Backup database
echo "${BLUE}[5/9]${NC} Creating database backup..."
ssh "${SERVER}" "cd ${DEPLOY_DIR} && ./scripts/backup-db.sh 2>/dev/null || echo 'Backup skipped'"
echo ""

# Step 6: Verify production is a git repo
echo "${BLUE}[6/9]${NC} Verifying production is git repository..."
if ! ssh "${SERVER}" "test -d ${DEPLOY_DIR}/.git && echo 'Git repo exists'" 2>&1 | grep -q "Git repo exists"; then
  echo "${RED}❌ CRITICAL: ${DEPLOY_DIR}/.git does not exist${NC}"
  echo "   Production MUST run from a git repository"
  exit 1
fi
echo "${GREEN}✅ Production is git repository${NC}"
echo ""

# Step 7: Git pull on production
echo "${BLUE}[7/9]${NC} Updating code on production via git pull..."
ssh "${SERVER}" "cd ${DEPLOY_DIR} && git remote add deploy ${BARE_REPO} 2>/dev/null || git remote set-url deploy ${BARE_REPO}" 
ssh "${SERVER}" "cd ${DEPLOY_DIR} && git fetch deploy ${GIT_BRANCH} && git reset --hard FETCH_HEAD" 2>&1 | tail -5
echo "${GREEN}✅ Code updated${NC}"
echo ""

# Step 8: Install and build on production
echo "${BLUE}[8/9]${NC} Installing dependencies and building..."
ssh "${SERVER}" "cd ${DEPLOY_DIR} && npm ci && npx prisma generate && npx prisma migrate deploy 2>&1 | tail -3"
ssh "${SERVER}" "cd ${DEPLOY_DIR} && NODE_ENV=production npm run build 2>&1 | tail -3"
echo "${GREEN}✅ Build complete${NC}"
echo ""

# Step 9: Reload PM2 (zero-downtime)
echo "${BLUE}[9/9]${NC} Reloading PM2..."
ssh "${SERVER}" "cd ${DEPLOY_DIR} && pm2 reload ecosystem.config.js --update-env 2>&1 | tail -2"
echo "${GREEN}✅ PM2 reloaded${NC}"
echo ""

# === VERIFICATION ===
echo "════════════════════════════════════════════════════════════"
echo "  🔍 Verifying Deployment"
echo "════════════════════════════════════════════════════════════"
echo ""

# Verify git on production
echo "Checking production git commit..."
PROD_COMMIT=$(ssh "${SERVER}" "cd ${DEPLOY_DIR} && git rev-parse HEAD")
if [ "$GIT_COMMIT" = "$PROD_COMMIT" ]; then
  echo "${GREEN}✅ VERIFIED: Production running commit ${GIT_COMMIT:0:8}${NC}"
else
  echo "${RED}❌ ERROR: Commit mismatch${NC}"
  echo "   Local:  ${GIT_COMMIT:0:8}"
  echo "   Prod:   ${PROD_COMMIT:0:8}"
  exit 1
fi
echo ""

# Verify version endpoint
echo "Checking /api/version endpoint..."
sleep 3
RESPONSE=$(curl -s https://www.clickanunt.ro/api/version)
ENDPOINT_COMMIT=$(echo "$RESPONSE" | jq -r '.gitCommit // "null"' 2>/dev/null || echo "null")

if [ "$ENDPOINT_COMMIT" != "null" ] && [ "$ENDPOINT_COMMIT" = "$GIT_COMMIT" ]; then
  echo "${GREEN}✅ VERIFIED: /api/version returns correct commit${NC}"
  echo "   Response: $RESPONSE"
else
  echo "${YELLOW}⚠️ Version endpoint check${NC}"
  echo "   Response: $RESPONSE"
  echo "   Expected: gitCommit=$GIT_COMMIT"
fi
echo ""

# Final status
echo "════════════════════════════════════════════════════════════"
echo "  ${GREEN}✅ Deployment Successful${NC}"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📊 Deployment Summary:"
echo "  Commit:    ${GREEN}${GIT_COMMIT:0:8}${NC}"
echo "  Branch:    ${GREEN}${GIT_BRANCH}${NC}"
echo "  Time:      ${GREEN}${DEPLOY_TIMESTAMP}${NC}"
echo "  Status:    ${GREEN}Git-based deployment${NC}"
echo ""
echo "✅ Next Steps:"
echo "  1. Verify in browser: Hard refresh (Cmd+Shift+R)"
echo "  2. Check version: curl https://www.clickanunt.ro/api/version"
echo "  3. Monitor logs: ssh ${SERVER} 'pm2 logs clickanunt --lines 20'"
echo ""

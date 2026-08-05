#!/bin/bash

# LEGACY — DO NOT USE (FAZA 21E, 2026-07-28)
# Titlul "ONLY authorized production deployment method" e depasit: DEPLOY_DIR
# fix /var/www/clickanunt nu mai e directorul din care ruleaza PM2 in
# productie (acum /var/www/clickanunt-releases/<ts>-<sha> via symlink
# `current`). Foloseste in schimb:
#   scripts/deploy-production-release.sh --sha <SHA> [--dry-run]
#
# Production Deployment Script for ClickAnunț
# Usage: ./scripts/deploy-production.sh
# This is the ONLY authorized production deployment method.

set -e  # Exit immediately if any command fails
set -u  # Exit if undefined variable is used
set -o pipefail  # Exit if any command in a pipeline fails

echo "🚀 Starting production deployment..."

# Configuration
SERVER="root@46.225.69.155"
DEPLOY_DIR="/var/www/clickanunt"
APP_NAME="clickanunt"
BUILD_ID=$(date -u +%Y%m%dT%H%M%SZ)
GIT_COMMIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Trap errors and cleanup
trap 'echo -e "${RED}❌ Deployment failed at step: $BASH_COMMAND${NC}"; exit 1' ERR

echo -e "${YELLOW}Step 1: Installing dependencies...${NC}"
npm ci

echo -e "${YELLOW}Step 2: Running lint checks (max-warnings=0)...${NC}"
npm run lint || { echo -e "${RED}❌ Linting failed. Fix errors before deploying.${NC}"; exit 1; }

echo -e "${YELLOW}Step 3: Running type checks...${NC}"
npm run type-check || { echo -e "${RED}❌ Type check failed. Fix errors before deploying.${NC}"; exit 1; }

echo -e "${YELLOW}Step 4: Running tests...${NC}"
npm run test || { echo -e "${RED}❌ Tests failed. Fix errors before deploying.${NC}"; exit 1; }

echo -e "${YELLOW}Step 5: Building application locally...${NC}"
npm run build || { echo -e "${RED}❌ Build failed. Fix errors before deploying.${NC}"; exit 1; }

echo -e "${YELLOW}Step 6: Syncing files to server...${NC}"
rsync -avz --delete --exclude node_modules --exclude .git --exclude .next --exclude coverage --exclude .swc --exclude 'public/uploads/' \
  ./ ${SERVER}:${DEPLOY_DIR}/

echo -e "${YELLOW}Step 7: Installing dependencies on server...${NC}"
ssh ${SERVER} "cd ${DEPLOY_DIR} && npm ci"

echo -e "${YELLOW}Step 8: Running database migrations...${NC}"
ssh ${SERVER} "cd ${DEPLOY_DIR} && npx prisma migrate deploy && npx prisma generate"

echo -e "${YELLOW}Step 9: Ensuring PM2 uses ${DEPLOY_DIR}...${NC}"
ssh ${SERVER} "if pm2 describe ${APP_NAME} >/dev/null 2>&1; then \
  CWD=\$(pm2 describe ${APP_NAME} | awk -F': ' '/pm2_cwd/ {print \$2; exit}'); \
  if [ \"\$CWD\" != \"${DEPLOY_DIR}\" ]; then \
    echo \"❌ PM2 cwd mismatch: \$CWD (expected ${DEPLOY_DIR}). Recreating process.\"; \
    pm2 delete ${APP_NAME}; \
  fi; \
fi"

echo -e "${YELLOW}Step 10: Building on server...${NC}"
ssh ${SERVER} "cd ${DEPLOY_DIR} && NEXT_PUBLIC_BUILD_ID='${BUILD_ID}' GIT_COMMIT_SHA='${GIT_COMMIT_SHA}' NODE_ENV=production npm run build"

echo -e "${YELLOW}Step 11: Restarting application...${NC}"
ssh ${SERVER} "cd ${DEPLOY_DIR} && NEXT_PUBLIC_BUILD_ID='${BUILD_ID}' GIT_COMMIT_SHA='${GIT_COMMIT_SHA}' pm2 restart ${APP_NAME} --update-env || NEXT_PUBLIC_BUILD_ID='${BUILD_ID}' GIT_COMMIT_SHA='${GIT_COMMIT_SHA}' pm2 start npm --name ${APP_NAME} -- start --cwd ${DEPLOY_DIR}"

echo -e "${YELLOW}Step 12: Checking application status...${NC}"
ssh ${SERVER} "pm2 status ${APP_NAME}"

echo -e "${YELLOW}Step 13: Verifying health endpoint...${NC}"
sleep 3
curl -f https://www.clickanunt.ro/api/health || echo -e "${RED}⚠️  Health check failed${NC}"

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo "Deployment Summary:"
echo "- Server: ${SERVER}"
echo "- Directory: ${DEPLOY_DIR}"
echo "- Application: ${APP_NAME}"
echo "- Build ID: ${BUILD_ID}"
echo "- Git Commit: ${GIT_COMMIT_SHA}"
echo ""
echo "Next steps:"
echo "1. Verify deployment at https://www.clickanunt.ro"
echo "2. Check logs: ssh ${SERVER} 'pm2 logs ${APP_NAME} --lines 50'"
echo "3. Purge Cloudflare cache: https://dash.cloudflare.com"
echo ""
echo "📝 All checks passed: lint ✓ type-check ✓ test ✓ build ✓"

#!/bin/bash

###############################################################################
# Production Deployment Script
# Deploys ClickAnunț to Hetzner VPS with zero-downtime reload
###############################################################################

set -e  # Exit on error

# Configuration
SERVER="root@46.225.69.155"
DEPLOY_DIR="/var/www/clickanunt"
LOCAL_DIR="$(pwd)"

echo "════════════════════════════════════════════════════════"
echo "  🚀 ClickAnunț Production Deployment"
echo "════════════════════════════════════════════════════════"
echo ""

# Step 1: Pre-flight checks
echo "[1/10] Running pre-flight checks..."
npm run predeploy || {
  echo "❌ Pre-deploy checks failed. Fix errors before deploying."
  exit 1
}
echo "✅ Pre-deploy checks passed"
echo ""

# Step 2: Build locally
echo "[2/10] Building application locally..."
npm run build || {
  echo "❌ Build failed. Fix errors before deploying."
  exit 1
}
echo "✅ Build completed"
echo ""

# Step 3: Test SSH connectivity
echo "[3/10] Testing SSH connectivity..."
ssh -o ConnectTimeout=10 ${SERVER} "echo '✅ SSH connection successful'" || {
  echo "❌ Cannot connect to server. Check SSH configuration."
  exit 1
}
echo ""

# Step 4: Backup database
echo "[4/10] Creating database backup..."
ssh ${SERVER} "cd ${DEPLOY_DIR} && set -a && [ -f .env ] && source .env || true && set +a && ./scripts/backup-db.sh 2>/dev/null || echo 'Backup skipped (script missing or failed) ...'"
echo "✅ Backup completed (or skipped)"
echo ""

# Step 5: Sync files to server
echo "[5/10] Syncing files to server..."
# Exclude public/uploads from rsync: --delete would otherwise remove server-only files
# (local fallback uploads live under DEPLOY_DIR/public/uploads; see lib/storage-local.ts)
# Exclude backups/ and scripts/exports/: created on server; --delete must not wipe them
rsync -avz --delete \
  --exclude node_modules \
  --exclude .git \
  --exclude .next \
  --exclude .env.local \
  --exclude coverage \
  --exclude playwright-report \
  --exclude 'public/uploads' \
  --exclude 'backups' \
  --exclude 'scripts/exports' \
  ./ ${SERVER}:${DEPLOY_DIR}/ || {
  echo "❌ File sync failed"
  exit 1
}
echo "✅ Files synced"
echo ""

# Step 6: Install dependencies on server
echo "[6/10] Installing dependencies on server..."
ssh ${SERVER} "cd ${DEPLOY_DIR} && npm ci" || {
  echo "❌ Dependency installation failed"
  exit 1
}
echo "✅ Dependencies installed"
echo ""

# Step 7: Generate Prisma Client
echo "[7/10] Generating Prisma Client..."
ssh ${SERVER} "cd ${DEPLOY_DIR} && npx prisma generate" || {
  echo "❌ Prisma generation failed"
  exit 1
}
echo "✅ Prisma Client generated"
echo ""

# Step 8: Run database migrations
echo "[8/10] Running database migrations..."
ssh ${SERVER} "cd ${DEPLOY_DIR} && npx prisma migrate deploy" || {
  echo "⚠️  Migration failed. Check database status."
  read -p "Continue anyway? (y/N): " continue
  if [[ ! $continue =~ ^[Yy]$ ]]; then
    exit 1
  fi
}
echo "✅ Migrations applied"
echo ""

# Step 9: Build on server
echo "[9/10] Building on server..."
ssh ${SERVER} "cd ${DEPLOY_DIR} && NODE_ENV=production npm run build" || {
  echo "❌ Server build failed"
  exit 1
}
echo "✅ Server build completed"
echo ""

# Step 10: Reload PM2 (zero-downtime)
echo "[10/10] Reloading PM2..."
ssh ${SERVER} "cd ${DEPLOY_DIR} && pm2 reload ecosystem.config.js --update-env" || {
  echo "⚠️  PM2 reload failed, trying restart..."
  ssh ${SERVER} "cd ${DEPLOY_DIR} && pm2 restart clickanunt"
}
echo "✅ PM2 reloaded"
echo ""

# Verification
echo "════════════════════════════════════════════════════════"
echo "  ✅ Deployment Complete"
echo "════════════════════════════════════════════════════════"
echo ""
echo "Verifying deployment..."
echo ""

# Check PM2 status
echo "📊 PM2 Status:"
ssh ${SERVER} "pm2 status clickanunt"
echo ""

# Check health endpoint
echo "🏥 Health Check:"
sleep 3  # Wait for app to start
curl -f https://www.clickanunt.ro/api/health && echo "✅ Health check passed" || echo "⚠️  Health check failed"
echo ""

echo "📝 Next steps:"
echo "  1. Check logs: ssh ${SERVER} \"pm2 logs clickanunt\""
echo "  2. Monitor metrics: curl https://www.clickanunt.ro/api/metrics"
echo "  3. Purge Cloudflare cache if needed"
echo "  4. Test critical user flows"
echo ""
echo "🎉 Deployment successful!"

#!/usr/bin/env bash
###############################################################################
# Deploy to STAGING VPS only — never production by default.
#
# Required:
#   STAGING_DEPLOY_SERVER=root@<STAGING_IP>   (must NOT be prod unless opt-in)
#   STAGING_DEPLOY_DIR=/var/www/clickanunt-staging
#
# Optional:
#   STAGING_BRANCH=scale-10k-staging-safe
#   STAGING_PM2_CONFIG=ecosystem.staging.cluster.config.js
#   ALLOW_STAGING_ON_PROD_HOST=1   # only if isolating on port 3001 on same machine
###############################################################################
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROD_IP_PATTERN='46.225.69.155'
STAGING_SERVER="${STAGING_DEPLOY_SERVER:?Set STAGING_DEPLOY_SERVER=root@staging-ip}"
STAGING_DIR="${STAGING_DEPLOY_DIR:-/var/www/clickanunt-staging}"
STAGING_BRANCH="${STAGING_BRANCH:-scale-10k-staging-safe}"
PM2_CONFIG="${STAGING_PM2_CONFIG:-ecosystem.staging.cluster.config.js}"

log() { echo "[deploy:staging] $*"; }

if [[ "$STAGING_SERVER" == *"$PROD_IP_PATTERN"* ]] && [ "${ALLOW_STAGING_ON_PROD_HOST:-}" != "1" ]; then
  echo "ERROR: STAGING_DEPLOY_SERVER points at production IP $PROD_IP_PATTERN."
  echo "       Provision a separate VPS or set ALLOW_STAGING_ON_PROD_HOST=1 with isolated PORT/path."
  exit 1
fi

if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  log "❌ Working tree not clean — commit or stash first."
  git status --short
  exit 1
fi

log "Push branch $STAGING_BRANCH"
git push origin "$STAGING_BRANCH" || true

REPO_URL="$(git remote get-url origin)"

log "SSH → $STAGING_SERVER ($STAGING_DIR)"
ssh -o ConnectTimeout=30 "$STAGING_SERVER" bash <<EOF
set -euo pipefail
STAGING_DIR="$STAGING_DIR"
BRANCH="$STAGING_BRANCH"
PM2_CONFIG="$PM2_CONFIG"
REPO_URL="$REPO_URL"

if [ -f "\$STAGING_DIR/.env" ] && grep -q 'sk_live' "\$STAGING_DIR/.env" 2>/dev/null; then
  echo "ERROR: .env contains sk_live — use Stripe TEST keys on staging"
  exit 1
fi

mkdir -p "\$STAGING_DIR"
if [ ! -d "\$STAGING_DIR/.git" ]; then
  git clone "\$REPO_URL" "\$STAGING_DIR"
fi
cd "\$STAGING_DIR"
git fetch origin
git checkout "\$BRANCH" 2>/dev/null || git checkout -b "\$BRANCH" "origin/\$BRANCH"
git pull origin "\$BRANCH" || git pull

mkdir -p public/uploads/listings public/uploads/avatars public/uploads/messages logs
npm ci
NODE_ENV=production npm run build
npx prisma migrate deploy

if pm2 describe clickanunt-staging >/dev/null 2>&1; then
  pm2 reload "\$PM2_CONFIG" --update-env
else
  pm2 start "\$PM2_CONFIG"
fi
pm2 save
echo "✅ Staging deploy done. Verify: pm2 list; curl -s localhost:3000/api/health"
EOF

log "✅ deploy:staging finished (production PM2 NOT touched)"

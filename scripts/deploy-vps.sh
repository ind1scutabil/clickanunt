#!/usr/bin/env bash
# Producție VPS — Git pull, deps, build, migrații Prisma, PM2.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if [ -n "${DEPLOY_BRANCH:-}" ]; then
  git fetch origin "$DEPLOY_BRANCH" 2>/dev/null || true
  git pull origin "$DEPLOY_BRANCH"
else
  git pull origin main || git pull
fi
npm ci
NODE_ENV=production npm run build
npx prisma migrate deploy
pm2 reload ecosystem.config.js --update-env || pm2 restart clickanunt
echo "✅ deploy-vps: OK"

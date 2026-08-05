#!/usr/bin/env bash
# LEGACY — DO NOT USE (FAZA 21E, 2026-07-28)
# Presupune rulare in-place dintr-un checkout Git persistent (git pull + pm2
# reload ecosystem.config.js din propriul cwd). Producția reală rulează din
# release-uri imutabile sub /var/www/clickanunt-releases cu symlink `current`;
# rularea acestui script (npm run deploy-prod) ar repune PM2 pe cwd-ul vechi
# /var/www/clickanunt (dirty, alt branch). Folosește în schimb:
#   scripts/deploy-production-release.sh --sha <SHA> [--dry-run]
#
# Producție VPS — Git pull, deps, build, migrații Prisma, PM2.
# Imagini utilizator: nu rula niciodată „git clean -fd” fără excluderi — folosește scripts/vps-safe-git-clean.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if [ -n "${DEPLOY_BRANCH:-}" ]; then
  git fetch origin "$DEPLOY_BRANCH" 2>/dev/null || true
  git pull origin "$DEPLOY_BRANCH"
else
  git pull origin main || git pull
fi
mkdir -p "$ROOT/public/uploads/listings" "$ROOT/public/uploads/avatars" "$ROOT/public/uploads/messages"
npm ci
NODE_ENV=production npm run build
npx prisma migrate deploy
pm2 reload ecosystem.config.js --update-env || pm2 restart clickanunt
echo "✅ deploy-vps: OK"

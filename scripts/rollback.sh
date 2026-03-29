#!/usr/bin/env bash
###############################################################################
# Rollback minim PE VPS (Git-only, fără rsync).
# Utilizare: ./scripts/rollback.sh <commit|tag|branch>
#
# Pași: git checkout → npm ci → npm run build → pm2 reload
###############################################################################
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DEPLOY_ROOT="${DEPLOY_ROOT:-/var/www/clickanunt}"
TARGET="${1:?Usage: $0 <commit|tag|branch>}"

if [ -d "$DEPLOY_ROOT" ]; then
  R_ROOT="$(cd "$ROOT" && pwd -P)"
  R_EXP="$(cd "$DEPLOY_ROOT" && pwd -P)"
  if [ "$R_ROOT" != "$R_EXP" ]; then
    echo "❌ Rulează din $DEPLOY_ROOT (sau setează DEPLOY_ROOT)."
    exit 1
  fi
fi

if [ ! -d .git ]; then
  echo "❌ Lipsește .git"
  exit 1
fi

echo "════════════════════════════════════════════════════════"
echo "  Rollback la: $TARGET"
echo "════════════════════════════════════════════════════════"

git fetch origin 2>/dev/null || true
git checkout "$TARGET"

if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  echo "❌ După checkout, working tree nu e curat."
  exit 1
fi

if [ ! -f package-lock.json ]; then
  echo "❌ Lipsește package-lock.json"
  exit 1
fi

npm ci
NODE_ENV=production npm run build

pm2 reload ecosystem.config.js --update-env || pm2 restart clickanunt

echo "✅ Rollback aplicat. Verifică: curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/api/health"

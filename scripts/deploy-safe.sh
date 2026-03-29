#!/usr/bin/env bash
###############################################################################
# Deploy fără rsync: rulează preflight pe MAȘINA LOCALĂ, apoi SSH execută
# deploy-prod.sh pe VPS (Git pull-only pe server).
#
# Variabile: DEPLOY_SERVER (default din repo), DEPLOY_DIR, DEPLOY_BRANCH (opțional, pe remote)
###############################################################################
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DEPLOY_SERVER="${DEPLOY_SERVER:-root@46.225.69.155}"
DEPLOY_DIR="${DEPLOY_DIR:-/var/www/clickanunt}"

echo "════════════════════════════════════════════════════════"
echo "  deploy-safe → preflight local + SSH deploy-prod (fără rsync)"
echo "  Remote: ${DEPLOY_SERVER}:${DEPLOY_DIR}"
echo "════════════════════════════════════════════════════════"

"$ROOT/scripts/preflight-prod.sh"

echo ""
echo "[deploy-safe] SSH → deploy-prod.sh pe server..."
ssh -o ConnectTimeout=20 "${DEPLOY_SERVER}" "cd ${DEPLOY_DIR} && DEPLOY_BRANCH=${DEPLOY_BRANCH:-} bash ./scripts/deploy-prod.sh"

echo ""
echo "✅ deploy-safe complet."

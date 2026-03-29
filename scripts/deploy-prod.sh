#!/usr/bin/env bash
###############################################################################
# Deploy producție — rulează PE VPS, în repo-ul Git (ZERO rsync).
# Flux: git curat + .env → git pull origin <branch> → preflight-prod.sh
#       (npm ci, teste, build, manifest) → prisma migrate deploy → pm2 reload
#       → smoke local → verificare publică opțională (mesaj NGINX/CF dacă diferență)
#
# Cerințe: .git, package-lock.json, .env cu DATABASE_URL și JWT_SECRET
# Override: DEPLOY_BRANCH (implicit branch curent), DEPLOY_ROOT (implicit /var/www/clickanunt)
###############################################################################
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DEPLOY_ROOT="${DEPLOY_ROOT:-/var/www/clickanunt}"
BRANCH="${DEPLOY_BRANCH:-$(git rev-parse --abbrev-ref HEAD)}"
PUBLIC_REGISTER_URL="${PUBLIC_REGISTER_URL:-https://clickanunt.ro/auth/register}"

abs_path() { (cd "$1" && pwd -P); }

echo "════════════════════════════════════════════════════════"
echo "  ClickAnunț — deploy-prod (Git-only, VPS)"
echo "  ROOT: $ROOT"
echo "  Branch: $BRANCH"
echo "════════════════════════════════════════════════════════"

# --- Hard lock: doar din rădăcina așteptată pe server ---
if [ -d "$DEPLOY_ROOT" ]; then
  R_ROOT="$(abs_path "$ROOT")"
  R_EXP="$(abs_path "$DEPLOY_ROOT")"
  if [ "$R_ROOT" != "$R_EXP" ]; then
    echo "❌ REFUZ: repo trebuie să fie în $DEPLOY_ROOT (actual: $R_ROOT)."
    echo "   Setează DEPLOY_ROOT pentru alt mediu."
    exit 1
  fi
else
  echo "⚠️  Nu pot verifica DEPLOY_ROOT (lipsește directorul $DEPLOY_ROOT)."
fi

if [ ! -d .git ]; then
  echo "❌ REFUZ: lipsește .git — deploy doar din clone Git pe server."
  exit 1
fi

if [ ! -f package-lock.json ]; then
  echo "❌ REFUZ: lipsește package-lock.json — folosește npm ci."
  exit 1
fi

# --- PM2 ecosystem (fără a modifica fișierul aici) ---
ECO="$ROOT/ecosystem.config.js"
for needle in "cwd: '/var/www/clickanunt'" "script: 'npm'" "args: 'start'"; do
  if ! grep -qF "$needle" "$ECO" 2>/dev/null; then
    echo "❌ REFUZ: ecosystem.config.js trebuie să conțină literal: $needle"
    exit 1
  fi
done
echo "✅ ecosystem.config.js: cwd, npm start"

# --- Git curat + .env ---
if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  echo "❌ REFUZ: git status nu e curat (fără fișiere necommitted pe server)."
  git status --short
  exit 1
fi
echo "✅ Git working tree curat"

if [ ! -f .env ]; then
  echo "❌ REFUZ: lipsește .env"
  exit 1
fi
if ! grep -qE '^[[:space:]]*DATABASE_URL=[^[:space:]]+' .env; then
  echo "❌ REFUZ: DATABASE_URL lipsește sau e gol în .env"
  exit 1
fi
if ! grep -qE '^[[:space:]]*JWT_SECRET=[^[:space:]]+' .env; then
  echo "❌ REFUZ: JWT_SECRET lipsește sau e gol în .env"
  exit 1
fi
echo "✅ .env: DATABASE_URL, JWT_SECRET"

echo "[deploy-prod] git fetch + pull origin $BRANCH"
git fetch origin "$BRANCH"
git pull origin "$BRANCH"

if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  echo "❌ REFUZ: după git pull, working tree nu e curat."
  git status --short
  exit 1
fi

echo "[deploy-prod] backup DB (best effort)"
set -a && [ -f .env ] && . ./.env 2>/dev/null || true && set +a
./scripts/backup-db.sh 2>/dev/null || echo "  (backup sărit sau eșuat)"

echo "[deploy-prod] preflight-prod (npm ci, teste, build, manifest)"
"$ROOT/scripts/preflight-prod.sh"

echo "[deploy-prod] npx prisma migrate deploy"
if ! npx prisma migrate deploy; then
  echo "❌ prisma migrate deploy a eșuat — DEPLOY OPRIT."
  exit 1
fi

echo "[deploy-prod] pm2 reload ecosystem.config.js --update-env"
pm2 reload ecosystem.config.js --update-env || pm2 restart clickanunt

echo "[deploy-prod] smoke local (toate trebuie 200)"
sleep 3
LOCAL_FAIL=0
LOCAL_REG=""
for p in / /auth/register /auth/signup /api/health; do
  c=$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 10 "http://127.0.0.1:3000${p}" || echo 000)
  echo "  ${p} -> ${c}"
  if [ "$c" != "200" ]; then
    LOCAL_FAIL=1
  fi
  if [ "$p" = "/auth/register" ]; then
    LOCAL_REG="$c"
  fi
done
if [ "$LOCAL_FAIL" != "0" ]; then
  echo "❌ SMOKE LOCAL FAIL — DEPLOY INVALID"
  exit 1
fi

echo "[deploy-prod] verificare publică: $PUBLIC_REGISTER_URL"
PUB_CODE=$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 15 -L "$PUBLIC_REGISTER_URL" || echo 000)
echo "  public /auth/register -> ${PUB_CODE}"
if [ "$LOCAL_REG" = "200" ] && [ "$PUB_CODE" != "200" ]; then
  echo ""
  echo "════════════════════════════════════════════════════════"
  echo "  PROBLEMĂ: NGINX / CLOUDFLARE, NU APLICAȚIA"
  echo "  (originea locală 200, public ≠ 200)"
  echo "════════════════════════════════════════════════════════"
fi

echo ""
echo "════════════════════════════════════════════════════════"
echo "  ✅ DEPLOY-PROD VERDICT: PASS (smoke local 200)"
echo "════════════════════════════════════════════════════════"

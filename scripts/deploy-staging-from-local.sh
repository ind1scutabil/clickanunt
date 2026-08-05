#!/usr/bin/env bash
###############################################################################
# Deploy to STAGING only — refuses production by default.
#
# Required:
#   CONFIRM_STAGING_DEPLOY=1
#   STAGING_DEPLOY_SERVER=user@REQUIRED_STAGING_HOST   (must be real; no placeholders)
#   STAGING_DOMAIN=https://REQUIRED_STAGING_DOMAIN
#   STAGING_DATABASE_URL=REQUIRED_STAGING_DATABASE_URL
#   STAGING_BACKUP_VERIFIED=1
#   STAGING_EXPECTED_SHA=<full sha to deploy>
#
# Optional:
#   STAGING_DEPLOY_DIR=/var/www/clickanunt-staging
#   STAGING_PM2_CONFIG=ecosystem.staging.config.js
#   STAGING_BRANCH=<branch name for reference only; deploy uses exact SHA>
###############################################################################
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROD_IP_PATTERN='46.225.69.155'

log() { echo "[deploy:staging] $*"; }
die() { echo "ERROR: $*" >&2; exit 1; }

is_placeholder() {
  local v="${1:-}"
  [[ -z "$v" ]] && return 0
  [[ "$v" == *REQUIRED_STAGING_* ]] && return 0
  [[ "$v" == *staging.example.com* ]] && return 0
  [[ "$v" == *REPLACE_ME* ]] && return 0
  [[ "$v" == *'<STAGING_IP>'* ]] && return 0
  return 1
}

: "${CONFIRM_STAGING_DEPLOY:?Set CONFIRM_STAGING_DEPLOY=1}"
[[ "$CONFIRM_STAGING_DEPLOY" == "1" ]] || die "CONFIRM_STAGING_DEPLOY must be 1"

: "${STAGING_DEPLOY_SERVER:?Set STAGING_DEPLOY_SERVER=user@staging-host}"
: "${STAGING_DOMAIN:?Set STAGING_DOMAIN=https://your-staging-host}"
: "${STAGING_BACKUP_VERIFIED:?Set STAGING_BACKUP_VERIFIED=1 after verified staging backup}"
: "${STAGING_EXPECTED_SHA:?Set STAGING_EXPECTED_SHA to the exact commit to deploy}"

[[ "$STAGING_BACKUP_VERIFIED" == "1" ]] || die "STAGING_BACKUP_VERIFIED must be 1"

STAGING_DIR="${STAGING_DEPLOY_DIR:-/var/www/clickanunt-staging}"
PM2_CONFIG="${STAGING_PM2_CONFIG:-ecosystem.staging.config.js}"
DB_URL="${STAGING_DATABASE_URL:-${DATABASE_URL:-}}"

is_placeholder "$STAGING_DEPLOY_SERVER" && die "STAGING_DEPLOY_SERVER is missing or still a placeholder"
is_placeholder "$STAGING_DOMAIN" && die "STAGING_DOMAIN is missing or still a placeholder"
is_placeholder "$DB_URL" && die "STAGING_DATABASE_URL / DATABASE_URL is missing or still a placeholder"

if [[ "$STAGING_DEPLOY_SERVER" == *"$PROD_IP_PATTERN"* ]] && [[ "${ALLOW_STAGING_ON_PROD_HOST:-}" != "1" ]]; then
  die "STAGING_DEPLOY_SERVER points at production IP $PROD_IP_PATTERN"
fi

DOMAIN_HOST="$(
  STAGING_DOMAIN="$STAGING_DOMAIN" python3 -c '
import os
from urllib.parse import urlparse
raw = os.environ["STAGING_DOMAIN"]
u = urlparse(raw if "://" in raw else "https://" + raw)
print((u.hostname or raw).lower())
'
)"
if [[ "$DOMAIN_HOST" == "clickanunt.ro" || "$DOMAIN_HOST" == "www.clickanunt.ro" ]]; then
  die "STAGING_DOMAIN must not be production ($DOMAIN_HOST)"
fi

if [[ "$DB_URL" == *"$PROD_IP_PATTERN"* ]] || [[ "$DB_URL" == *clickanunt.ro* ]]; then
  die "DATABASE_URL appears to target production host patterns"
fi

DB_NAME="$(
  DB_URL="$DB_URL" python3 -c '
import os
from urllib.parse import urlparse
u = urlparse(os.environ["DB_URL"])
print((u.path or "").lstrip("/").split("?")[0])
'
)"
if [[ "$DB_NAME" == "autoplat" ]]; then
  die "Database name 'autoplat' is the known production DB name — use a dedicated staging DB"
fi

if [[ "${STRIPE_SECRET_KEY:-}" == sk_live* ]]; then
  die "Stripe LIVE key forbidden on staging"
fi
if [[ "${E2E_DISABLE_RATE_LIMIT:-}" == "1" || "${CLICKANUNT_E2E_SERVER:-}" == "1" ]]; then
  die "E2E rate-limit bypass flags are forbidden on staging deploy"
fi

if [[ -n "$(git status --porcelain 2>/dev/null)" ]]; then
  die "Working tree not clean — commit or stash first"
fi

HEAD_SHA="$(git rev-parse HEAD)"
[[ "$HEAD_SHA" == "$STAGING_EXPECTED_SHA" ]] || die "HEAD $HEAD_SHA != STAGING_EXPECTED_SHA $STAGING_EXPECTED_SHA"

[[ -f "$ROOT/$PM2_CONFIG" ]] || die "PM2 config missing: $PM2_CONFIG"

export STAGING_DATABASE_URL="$DB_URL"
export NODE_ENV="${NODE_ENV:-production}"
node "$ROOT/scripts/staging/preflight-deploy.mjs"

log "Preflight OK — SSH deploy to staging host ($STAGING_DIR) @ $STAGING_EXPECTED_SHA"
log "Sanitized: domain_host=$DOMAIN_HOST pm2=$PM2_CONFIG db_name=$DB_NAME"

REPO_URL="$(git remote get-url origin)"

ssh -o ConnectTimeout=30 "$STAGING_DEPLOY_SERVER" bash <<EOF
set -euo pipefail
STAGING_DIR="$STAGING_DIR"
PM2_CONFIG="$PM2_CONFIG"
REPO_URL="$REPO_URL"
EXPECTED_SHA="$STAGING_EXPECTED_SHA"

if [ -f "\$STAGING_DIR/.env" ]; then
  if grep -E '^[[:space:]]*STRIPE_SECRET_KEY=sk_live' "\$STAGING_DIR/.env" >/dev/null 2>&1; then
    echo "ERROR: .env contains sk_live — use Stripe TEST keys on staging"
    exit 1
  fi
  if grep -E '^[[:space:]]*(E2E_DISABLE_RATE_LIMIT|CLICKANUNT_E2E_SERVER)=1' "\$STAGING_DIR/.env" >/dev/null 2>&1; then
    echo "ERROR: E2E flags present in staging .env — remove them"
    exit 1
  fi
fi

mkdir -p "\$STAGING_DIR"
if [ ! -d "\$STAGING_DIR/.git" ]; then
  git clone "\$REPO_URL" "\$STAGING_DIR"
fi
cd "\$STAGING_DIR"
git fetch origin
git checkout "\$EXPECTED_SHA"
test "\$(git rev-parse HEAD)" = "\$EXPECTED_SHA"

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
echo "✅ Staging deploy done. Verify health on staging domain (not production)."
EOF

log "✅ deploy:staging finished (production PM2 NOT touched by this script)"

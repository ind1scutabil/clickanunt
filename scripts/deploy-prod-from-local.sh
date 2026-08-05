#!/usr/bin/env bash
###############################################################################
# LEGACY — DO NOT USE (FAZA 21E, 2026-07-28)
# Presupune model de deploy "in-place" în /var/www/clickanunt. Producția reală
# rulează dintr-un release imutabil (/var/www/clickanunt-releases/<ts>-<sha>)
# cu symlink `current`; /var/www/clickanunt e director legacy, murdar, pe alt
# branch. `pm2 reload ecosystem.config.js` rulat din acel director va repune
# PM2 pe cwd=/var/www/clickanunt (vezi ecosystem.config.js din acel director),
# abandonând release-ul live curent. Folosește în schimb:
#   scripts/deploy-production-release.sh --sha <SHA> [--dry-run]
###############################################################################
# deploy:prod — de pe laptop: working tree trebuie CURAT (doar fișiere deja
# versionate în commit); push, apoi SSH pe VPS: pull, npm ci, build,
# prisma migrate deploy, PM2 reload.
#
# NU face git add/commit/clean din acest script — evită accidental staging
# de uploads, .env, rapoarte locale, etc.
#
# Variabile opționale:
#   DEPLOY_SERVER   (default: root@46.225.69.155)
#   DEPLOY_DIR      (default: /var/www/clickanunt)
###############################################################################
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DEPLOY_SERVER="${DEPLOY_SERVER:-root@46.225.69.155}"
DEPLOY_DIR="${DEPLOY_DIR:-/var/www/clickanunt}"

log() { echo "[deploy:prod] $*"; }
banner() {
  echo ""
  echo "════════════════════════════════════════════════════════"
  echo "  $*"
  echo "════════════════════════════════════════════════════════"
}

banner "ClickAnunț — deploy:prod (local → VPS)"

if [ ! -d .git ]; then
  log "❌ Nu rulezi dintr-un repo Git."
  exit 1
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
log "Branch curent: $BRANCH"

if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  banner "Working tree NU e curat — deploy oprit (fără git add/commit automat)"
  git status --short
  echo ""
  log "❌ Fă commit explicit (doar ce vrei în release) sau stash, apoi rulează din nou."
  log "   Nu folosi git add -A pentru release: riști uploads, .env, artefacte locale."
  exit 1
fi

log "✅ Working tree curat (doar conținut versionat va fi împins)."

banner "Validate production env (local gate)"
if ! npm run validate:production-env -- --check-files-only 2>&1; then
  log "⚠️  .env / .env.production Stripe alignment check failed (ok if only deploying from VPS .env)"
fi

if [ "${CONFIRM_PROD_DEPLOY:-}" != "1" ]; then
  banner "Confirmare producție necesară"
  log "❌ Setează CONFIRM_PROD_DEPLOY=1 pentru a continua deploy pe ${DEPLOY_SERVER}."
  log "   Exemplu: CONFIRM_PROD_DEPLOY=1 npm run deploy:prod"
  exit 1
fi

if [[ "$DEPLOY_SERVER" == *"46.225.69.155"* ]] && [[ "${ALLOW_STAGING_DIR_ON_PROD:-}" != "1" ]]; then
  if [ "${DEPLOY_DIR:-/var/www/clickanunt}" != "/var/www/clickanunt" ]; then
    log "❌ DEPLOY_DIR neobișnuit pentru producție: ${DEPLOY_DIR:-}"
    exit 1
  fi
fi

banner "Push origin $BRANCH"
git push origin "$BRANCH"
log "✅ Push OK."

banner "SSH → VPS ($DEPLOY_SERVER) — $DEPLOY_DIR"
ssh -o ConnectTimeout=30 "$DEPLOY_SERVER" bash <<EOF
set -euo pipefail
DEPLOY_DIR="${DEPLOY_DIR}"
BRANCH="${BRANCH}"
log() { echo "[VPS] \$*"; }
log "Director: \$DEPLOY_DIR | branch: \$BRANCH"
cd "\$DEPLOY_DIR"
log "git pull origin \$BRANCH (sau git pull)"
git pull origin "\$BRANCH" || git pull
log "Sync Stripe live keys .env.production → .env"
node scripts/production/sync-stripe-env-from-production.mjs
log "Validate production Stripe env (strict)"
NODE_ENV=production npx ts-node --transpile-only --project tsconfig.scripts.json scripts/production/validate-production-env.ts --strict
log "Asigură directoare uploads locale (nu sunt în git)"
mkdir -p "\$DEPLOY_DIR/public/uploads/listings" "\$DEPLOY_DIR/public/uploads/avatars" "\$DEPLOY_DIR/public/uploads/messages"
log "npm ci"
npm ci
log "NODE_ENV=production npm run build"
NODE_ENV=production npm run build
log "npx prisma migrate deploy"
npx prisma migrate deploy
log "pm2 reload ecosystem.config.js --update-env"
pm2 reload ecosystem.config.js --update-env || pm2 restart clickanunt
log "✅ VPS finalizat."
EOF

banner "✅ deploy:prod COMPLET (local + VPS)"
log ""
log "Stripe producție: pe ${DEPLOY_SERVER}${DEPLOY_DIR} verifică .env că are STRIPE_SECRET_KEY=sk_live_…,"
log "STRIPE_PUBLISHABLE_KEY=pk_live_… (aceeași pereche), webhook whsec pentru endpoint live."
log "Dacă apare Link „testing / Enter 000000”, cheile sunt încă de test."

exit 0

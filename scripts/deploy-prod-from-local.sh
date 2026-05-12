#!/usr/bin/env bash
###############################################################################
# deploy:prod — de pe laptop: commit opțional (cu confirmare), push, apoi
# SSH pe VPS: pull, npm ci, build producție, prisma migrate, PM2 reload.
#
# Variabile opționale:
#   DEPLOY_SERVER   (default: root@46.225.69.155)
#   DEPLOY_DIR      (default: /var/www/clickanunt)
#   DEPLOY_COMMIT_MSG  mesaj la commit auto (cu DEPLOY_AUTO_COMMIT=1)
#   DEPLOY_AUTO_COMMIT=1  — fără TTY: commit automat tot tracked+untracked
#   DEPLOY_VPS_GIT_CLEAN=1 — pe VPS, după pull: git clean cu excluderi (vezi scripts/vps-safe-git-clean.sh).
#     NU folosi niciodată „git clean -fd” gol pe producție — șterge public/uploads/listings (imagini).
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
  banner "Modificări necomitate (trebuie rezolvate înainte de push)"
  git status --short
  echo ""
  if [ "${DEPLOY_AUTO_COMMIT:-}" = "1" ]; then
    MSG="${DEPLOY_COMMIT_MSG:-chore: deploy $(date -u +%Y-%m-%dT%H:%M:%SZ)}"
    log "DEPLOY_AUTO_COMMIT=1 → git add -A && commit"
    git add -A
    git commit -m "$MSG"
  elif [ -t 0 ]; then
    read -r -p "Vrei să fac commit la toate modificările și să continui? [y/N] " ans
    case "${ans:-}" in
      y|Y)
        MSG="${DEPLOY_COMMIT_MSG:-chore: deploy $(date -u +%Y-%m-%dT%H:%M:%SZ)}"
        git add -A
        git commit -m "$MSG"
        log "✅ Commit creat."
        ;;
      *)
        log "❌ Oprit: fă commit sau stash manual, apoi rulează din nou."
        exit 1
        ;;
    esac
  else
    log "❌ Repo murdar și terminal neinteractiv."
    log "   Opțiuni: (1) commit manual  (2) DEPLOY_AUTO_COMMIT=1 npm run deploy:prod"
    exit 1
  fi
else
  log "✅ Working tree curat."
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
log "Asigură directoare uploads locale (nu sunt în git)"
mkdir -p "\$DEPLOY_DIR/public/uploads/listings" "\$DEPLOY_DIR/public/uploads/avatars" "\$DEPLOY_DIR/public/uploads/messages"
if [ "\${DEPLOY_VPS_GIT_CLEAN:-}" = "1" ]; then
  log "DEPLOY_VPS_GIT_CLEAN=1 → git clean -fd cu excluderi public/uploads (script vps-safe-git-clean.sh)"
  bash "\$DEPLOY_DIR/scripts/vps-safe-git-clean.sh" || git clean -fd \\
    -e public/uploads -e public/uploads/ \\
    -e public/uploads/listings -e public/uploads/listings/ \\
    -e public/uploads/avatars -e public/uploads/avatars/ \\
    -e public/uploads/messages -e public/uploads/messages/
fi
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

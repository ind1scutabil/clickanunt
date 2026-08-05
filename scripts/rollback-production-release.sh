#!/usr/bin/env bash
###############################################################################
# scripts/rollback-production-release.sh
#
# Rollback aliniat la topologia de release-uri imutabile (FAZA 21E,
# 2026-07-28). Comută symlink-ul `current` către un release EXISTENT deja
# validat pe disk (nu re-face checkout/build/npm ci) și repornește PM2 din
# el. NU rulează Git deloc. NU rulează migrări Prisma (nu face niciodată
# downgrade de bază de date). NU șterge nimic.
#
# Utilizare:
#   scripts/rollback-production-release.sh --release <timestamp>-<shortsha> [--dry-run]
#
# Variabile de mediu (aceleași default-uri sigure ca deploy-production-release.sh):
#   RELEASES_ROOT   default: /var/www/clickanunt-releases
#   PORT            default: 3000
#   HEALTH_URL      default: http://127.0.0.1:${PORT}/api/health
#   PM2_APP_NAME    default: clickanunt
###############################################################################
set -euo pipefail

RELEASES_ROOT="${RELEASES_ROOT:-/var/www/clickanunt-releases}"
LEGACY_SHARED_DIR="${LEGACY_SHARED_DIR:-/var/www/clickanunt}"
PORT="${PORT:-3000}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:${PORT}/api/health}"
PM2_APP_NAME="${PM2_APP_NAME:-clickanunt}"
HEALTH_RETRIES="${HEALTH_RETRIES:-15}"
HEALTH_RETRY_DELAY="${HEALTH_RETRY_DELAY:-2}"
LOCK_FILE="${RELEASES_ROOT}/.deploy.lock"

RELEASE_NAME=""
DRY_RUN=0

log() { echo "[rollback-release] $*"; }
err() { echo "[rollback-release] ❌ $*" >&2; }
die() { err "$*"; exit 1; }

# Vezi deploy-production-release.sh pentru explicația completă: rename(2) via
# node e portabil, spre deosebire de `mv`/`mv -T` (GNU-only pentru -T).
atomic_symlink_switch() {
  local target="$1"
  local link_path="$2"
  local tmp_path="${link_path}.tmp.$$"
  ln -sfn "$target" "$tmp_path"
  node -e "require('fs').renameSync(process.argv[1], process.argv[2])" "$tmp_path" "$link_path"
}

usage() {
  cat <<'EOF'
Usage: rollback-production-release.sh --release <timestamp>-<shortsha> [--dry-run]
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --release) RELEASE_NAME="${2:-}"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "Argument necunoscut: $1" ;;
  esac
done

[ -n "$RELEASE_NAME" ] || { usage; die "--release este obligatoriu"; }

# --- Refuză pathuri periculoase / accepta doar release valid din root -------
# Vezi deploy-production-release.sh pentru explicația excepției de test.
if [ "${ALLOW_CUSTOM_RELEASES_ROOT_FOR_TESTING:-0}" = "1" ] && [[ "$RELEASES_ROOT" == /tmp/* ]]; then
  log "⚠️  MOD TEST: RELEASES_ROOT custom acceptat doar pentru ALLOW_CUSTOM_RELEASES_ROOT_FOR_TESTING=1 sub /tmp/."
else
  [[ "$RELEASES_ROOT" == /var/www/clickanunt-releases ]] || die "RELEASES_ROOT neașteptat (siguranță): $RELEASES_ROOT"
fi
case "$RELEASE_NAME" in
  *..*|*/*|"") die "Nume release nesigur: $RELEASE_NAME" ;;
esac
[[ "$RELEASE_NAME" =~ ^[0-9]{8}T[0-9]{6}Z-[0-9a-f]{6,40}(-rollback-[0-9a-f]{6,40})?$ ]] || \
  die "Nume release nu respectă formatul <timestamp>-<shortsha>: $RELEASE_NAME"

TARGET_DIR="$RELEASES_ROOT/$RELEASE_NAME"
[ -d "$TARGET_DIR" ] || die "Release-ul țintă nu există pe disk: $TARGET_DIR"
# Verificare suplimentară (defense-in-depth, pe lângă regex-ul de mai sus, care
# deja exclude "/" și ".."): rezolvă simbolic și confirmă că ținta rămâne
# strict sub RELEASES_ROOT. `cd ... && pwd -P` e portabil (spre deosebire de
# `realpath -m`, extensie GNU absentă pe BSD/macOS).
REALPATH_TARGET="$(cd "$TARGET_DIR" && pwd -P)"
REALPATH_ROOT="$(cd "$RELEASES_ROOT" && pwd -P)"
[[ "$REALPATH_TARGET" == "$REALPATH_ROOT"/* ]] || die "Release țintă iese din RELEASES_ROOT (path traversal?): $REALPATH_TARGET"

if [ "$DRY_RUN" = "1" ]; then
  log "=== DRY-RUN: doar validare, niciun symlink/PM2 nu va fi schimbat. ==="
fi

# --- Lock -------------------------------------------------------------------
mkdir -p "$RELEASES_ROOT"
exec 200>"$LOCK_FILE"
if ! flock -n 200; then
  die "Alt deploy/rollback este deja în curs (lock activ pe $LOCK_FILE)."
fi
log "Lock achiziționat: $LOCK_FILE"

# --- Verifică build/env/uploads ale release-ului țintă -----------------------
[ -s "$TARGET_DIR/.next/BUILD_ID" ] || die "Release-ul țintă nu are build valid (.next/BUILD_ID lipsă): $TARGET_DIR"
BUILD_ID="$(cat "$TARGET_DIR/.next/BUILD_ID")"
log "BUILD_ID release țintă: $BUILD_ID"

for f in ".env" ".env.production"; do
  [ -e "$TARGET_DIR/$f" ] || die "Lipsește $f în release-ul țintă: $TARGET_DIR/$f"
  RESOLVED="$(readlink -f "$TARGET_DIR/$f" 2>/dev/null || true)"
  [ -n "$RESOLVED" ] && [ -s "$RESOLVED" ] || die "$f din release-ul țintă nu rezolvă la un fișier valid: $TARGET_DIR/$f"
done
log ".env și .env.production ale release-ului țintă rezolvă corect (symlink către $LEGACY_SHARED_DIR)."

[ -e "$TARGET_DIR/public/uploads" ] || die "Lipsește public/uploads în release-ul țintă."
UPLOADS_RESOLVED="$(readlink -f "$TARGET_DIR/public/uploads" 2>/dev/null || true)"
[ -d "$UPLOADS_RESOLVED" ] || die "public/uploads din release-ul țintă nu rezolvă la un director valid."
log "public/uploads rezolvă la: $UPLOADS_RESOLVED"

[ -f "$TARGET_DIR/ecosystem.config.js" ] || die "Lipsește ecosystem.config.js în release-ul țintă."

if [ "$DRY_RUN" = "1" ]; then
  log "[DRY-RUN] Release-ul $RELEASE_NAME e valid pentru rollback (build/env/uploads OK)."
  log "[DRY-RUN] would: patch cwd în ecosystem.config.js -> $TARGET_DIR, comutare symlink 'current' -> $TARGET_DIR, pm2 startOrReload, health check."
  log "[DRY-RUN] Notă: acest script NU rulează niciodată Git și NU rulează niciodată migrări Prisma (nu face downgrade DB)."
  exit 0
fi

CURRENT_LINK="$RELEASES_ROOT/current"
PREVIOUS_TARGET=""
if [ -L "$CURRENT_LINK" ]; then
  PREVIOUS_TARGET="$(readlink -f "$CURRENT_LINK")"
fi
log "Release live curent (înainte de rollback): ${PREVIOUS_TARGET:-necunoscut}"

SWITCHED_SYMLINK=0
rollback_of_rollback() {
  local reason="$1"
  err "EȘEC rollback: $reason"
  if [ "$SWITCHED_SYMLINK" = "1" ] && [ -n "$PREVIOUS_TARGET" ]; then
    err "Restaurez symlink-ul 'current' la starea dinaintea acestui rollback: $PREVIOUS_TARGET"
    atomic_symlink_switch "$PREVIOUS_TARGET" "$CURRENT_LINK"
    if [ -f "$PREVIOUS_TARGET/ecosystem.config.js" ]; then
      pm2 startOrReload "$PREVIOUS_TARGET/ecosystem.config.js" --update-env >/dev/null 2>&1 || true
    fi
  fi
  exit 1
}

# --- Patch cwd în ecosystem.config.js al release-ului țintă -----------------
sed -i.bak "s#cwd: '[^']*'#cwd: '${TARGET_DIR}'#" "$TARGET_DIR/ecosystem.config.js"
rm -f "$TARGET_DIR/ecosystem.config.js.bak"
grep -q "cwd: '${TARGET_DIR}'" "$TARGET_DIR/ecosystem.config.js" || rollback_of_rollback "Patch cwd eșuat pentru release țintă."

# --- Comută symlink atomic ----------------------------------------------------
atomic_symlink_switch "$TARGET_DIR" "$CURRENT_LINK"
SWITCHED_SYMLINK=1
log "Symlink 'current' comutat atomic -> $TARGET_DIR"

# --- Pornește PM2 din release-ul țintă ---------------------------------------
if ! pm2 startOrReload "$TARGET_DIR/ecosystem.config.js" --update-env; then
  rollback_of_rollback "pm2 startOrReload a eșuat pentru release-ul țintă."
fi
sleep 2

PM2_CHECK="$(pm2 jlist 2>/dev/null | node -e "
  const d = JSON.parse(require('fs').readFileSync(0,'utf8'));
  const p = d.find(x => x.name === '$PM2_APP_NAME');
  if (!p) { console.log('MISSING'); process.exit(0); }
  const e = p.pm2_env || {};
  console.log((e.pm_cwd === '$TARGET_DIR' && e.status === 'online') ? 'OK' : 'MISMATCH:' + e.pm_cwd + ':' + e.status);
")"
[ "$PM2_CHECK" = "OK" ] || rollback_of_rollback "PM2 cwd/status invalid după rollback: $PM2_CHECK"
log "PM2 confirmat: cwd=$TARGET_DIR, status=online"

HEALTH_OK=0
for i in $(seq 1 "$HEALTH_RETRIES"); do
  HTTP_CODE="$(curl -sS -o /dev/null -w '%{http_code}' "$HEALTH_URL" || echo "000")"
  if [ "$HTTP_CODE" = "200" ]; then
    HEALTH_OK=1
    break
  fi
  log "Health check încercarea $i/$HEALTH_RETRIES: HTTP $HTTP_CODE, reîncerc în ${HEALTH_RETRY_DELAY}s..."
  sleep "$HEALTH_RETRY_DELAY"
done
[ "$HEALTH_OK" = "1" ] || rollback_of_rollback "Health check a eșuat după $HEALTH_RETRIES încercări ($HEALTH_URL)."

log "✅ Rollback COMPLET: current -> $TARGET_DIR (BUILD_ID=$BUILD_ID)"
log "Niciun fișier șters. Niciun git/migrare rulat(ă). Release anterior neatins: ${PREVIOUS_TARGET:-n/a}"
exit 0

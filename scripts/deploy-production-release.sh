#!/usr/bin/env bash
###############################################################################
# scripts/deploy-production-release.sh
#
# Pipeline de deploy aliniat la topologia REALĂ de producție (FAZA 21E,
# 2026-07-28): release-uri Git imutabile sub RELEASES_ROOT, cu symlink
# `current` comutat atomic, uploads și .env/.env.production legate (NU
# copiate, NU modificate) din LEGACY_SHARED_DIR.
#
# Rulează pe VPS (are nevoie de acces la /var/www/clickanunt-releases, pm2,
# git, npm, npx). NU rulează git în LEGACY_SHARED_DIR și nu scrie niciodată
# în el — doar citește .env/.env.production/public/uploads de acolo pentru
# a crea symlink-uri în noul release.
#
# Utilizare:
#   scripts/deploy-production-release.sh --sha <SHA40> \
#     --expected-live-sha <SHA40> [--dry-run] [--approve-migrations]
#
# Variabile de mediu (toate au default sigur pentru producția reală; NU le
# schimba fără motiv explicit — sunt validate strict):
#   RELEASES_ROOT        default: /var/www/clickanunt-releases
#   LEGACY_SHARED_DIR    default: /var/www/clickanunt   (sursă uploads + env)
#   REPO_URL              default: citit din RELEASES_ROOT/current sau LEGACY_SHARED_DIR
#   PORT                  default: 3000
#   HEALTH_URL            default: http://127.0.0.1:${PORT}/api/health
#   PM2_APP_NAME          default: clickanunt
#   HEALTH_RETRIES        default: 15
#   HEALTH_RETRY_DELAY    default: 2 (secunde)
#
# Exit codes: 0 succes, !=0 eșec (cu rollback automat dacă s-a apucat de
# comutarea symlink-ului `current` sau de pornirea PM2).
###############################################################################
set -euo pipefail

# --- Config (override doar prin env, cu validare strictă mai jos) ----------
RELEASES_ROOT="${RELEASES_ROOT:-/var/www/clickanunt-releases}"
LEGACY_SHARED_DIR="${LEGACY_SHARED_DIR:-/var/www/clickanunt}"
PORT="${PORT:-3000}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:${PORT}/api/health}"
PM2_APP_NAME="${PM2_APP_NAME:-clickanunt}"
HEALTH_RETRIES="${HEALTH_RETRIES:-15}"
HEALTH_RETRY_DELAY="${HEALTH_RETRY_DELAY:-2}"
GIT_CACHE_DIR="${RELEASES_ROOT}/.git-mirror-cache"
LOCK_FILE="${RELEASES_ROOT}/.deploy.lock"

SHA=""
EXPECTED_LIVE_SHA=""
DRY_RUN=0
APPROVE_MIGRATIONS=0

log()  { echo "[deploy-release] $*"; }
err()  { echo "[deploy-release] ❌ $*" >&2; }
die()  { err "$*"; exit 1; }
dry()  { if [ "$DRY_RUN" = "1" ]; then echo "[deploy-release] [DRY-RUN] would: $*"; else return 1; fi; return 0; }

# Comută atomic un symlink către o țintă nouă folosind rename(2) direct (via
# node), NU `mv`/`mv -T`: comportamentul `mv` când destinația e deja un
# symlink către un director diferă între GNU coreutils (Linux, cu -T) și
# BSD/macOS (fără echivalent -T), riscând să mute sursa ÎN interiorul
# directorului țintă în loc să înlocuiască symlink-ul. rename(2) e portabil
# și operează mereu pe intrarea de director dată, nu pe ce rezolvă symlink-ul.
atomic_symlink_switch() {
  local target="$1"
  local link_path="$2"
  local tmp_path="${link_path}.tmp.$$"
  ln -sfn "$target" "$tmp_path"
  node -e "require('fs').renameSync(process.argv[1], process.argv[2])" "$tmp_path" "$link_path"
}

usage() {
  cat <<'EOF'
Usage: deploy-production-release.sh --sha <SHA40> --expected-live-sha <SHA40> [--dry-run] [--approve-migrations]
EOF
}

# --- Parse args --------------------------------------------------------------
while [ $# -gt 0 ]; do
  case "$1" in
    --sha) SHA="${2:-}"; shift 2 ;;
    --expected-live-sha) EXPECTED_LIVE_SHA="${2:-}"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    --approve-migrations) APPROVE_MIGRATIONS=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "Argument necunoscut: $1" ;;
  esac
done

[ -n "$SHA" ] || { usage; die "--sha este obligatoriu"; }
[ -n "$EXPECTED_LIVE_SHA" ] || { usage; die "--expected-live-sha este obligatoriu (siguranță: refuză live SHA neașteptat)"; }

SHA_RE='^[0-9a-f]{40}$'
[[ "$SHA" =~ $SHA_RE ]] || die "SHA invalid (trebuie 40 hex chars): $SHA"
[[ "$EXPECTED_LIVE_SHA" =~ $SHA_RE ]] || die "--expected-live-sha invalid (trebuie 40 hex chars): $EXPECTED_LIVE_SHA"

# --- Refuză pathuri periculoase ----------------------------------------------
# Excepție ÎNGUSTĂ doar pentru sandbox de test local (FAZA 21E dry-run), NICIODATĂ
# pentru producție: necesită explicit ALLOW_CUSTOM_RELEASES_ROOT_FOR_TESTING=1
# ȘI un path care conține /tmp/ — nu poate fi folosit accidental pe VPS real.
if [ "${ALLOW_CUSTOM_RELEASES_ROOT_FOR_TESTING:-0}" = "1" ] && [[ "$RELEASES_ROOT" == /tmp/* ]] && [[ "$LEGACY_SHARED_DIR" == /tmp/* ]]; then
  log "⚠️  MOD TEST: RELEASES_ROOT/LEGACY_SHARED_DIR custom acceptate doar pentru că ALLOW_CUSTOM_RELEASES_ROOT_FOR_TESTING=1 și path sub /tmp/."
else
  [[ "$RELEASES_ROOT" == /var/www/clickanunt-releases ]] || die "RELEASES_ROOT neașteptat (siguranță): $RELEASES_ROOT"
  [[ "$LEGACY_SHARED_DIR" == /var/www/clickanunt ]] || die "LEGACY_SHARED_DIR neașteptat (siguranță): $LEGACY_SHARED_DIR"
fi
[ "$RELEASES_ROOT" != "$LEGACY_SHARED_DIR" ] || die "RELEASES_ROOT nu poate fi egal cu LEGACY_SHARED_DIR"
[[ "$RELEASES_ROOT" != *".."* ]] || die "RELEASES_ROOT conține path traversal"
[ -d "$RELEASES_ROOT" ] || die "RELEASES_ROOT nu există: $RELEASES_ROOT"

if [ "$DRY_RUN" = "1" ]; then
  log "=== DRY-RUN activ: nicio scriere pe disk în afara unui director temporar; niciun symlink, PM2 sau migrare nu va fi atins. ==="
fi

# --- Lock împotriva deployurilor simultane -----------------------------------
mkdir -p "$RELEASES_ROOT"
exec 200>"$LOCK_FILE"
if ! flock -n 200; then
  die "Alt deploy este deja în curs (lock activ pe $LOCK_FILE)."
fi
log "Lock achiziționat: $LOCK_FILE"

CURRENT_LINK="$RELEASES_ROOT/current"

# --- Confirmă live SHA așteptat -----------------------------------------------
[ -L "$CURRENT_LINK" ] || die "Symlink 'current' lipsește sau nu e symlink: $CURRENT_LINK"
CURRENT_TARGET="$(readlink -f "$CURRENT_LINK")"
[ -d "$CURRENT_TARGET" ] || die "Ținta 'current' nu există: $CURRENT_TARGET"
LIVE_SHA="$(git -C "$CURRENT_TARGET" rev-parse HEAD 2>/dev/null || true)"
[ -n "$LIVE_SHA" ] || die "Nu pot citi HEAD din release-ul live curent: $CURRENT_TARGET"
if [ "$LIVE_SHA" != "$EXPECTED_LIVE_SHA" ]; then
  die "Live SHA mismatch: live=$LIVE_SHA, așteptat=$EXPECTED_LIVE_SHA. Oprire (siguranță anti-surpriză)."
fi
log "Live SHA confirmat: $LIVE_SHA (== --expected-live-sha)"

# --- Uploads + env trebuie să existe deja în LEGACY_SHARED_DIR (nu le creăm) -
[ -d "$LEGACY_SHARED_DIR/public/uploads" ] || die "Uploads lipsă: $LEGACY_SHARED_DIR/public/uploads"
[ -s "$LEGACY_SHARED_DIR/.env" ] || die ".env lipsă sau gol: $LEGACY_SHARED_DIR/.env"
[ -s "$LEGACY_SHARED_DIR/.env.production" ] || die ".env.production lipsă sau gol: $LEGACY_SHARED_DIR/.env.production"
log "Uploads + .env + .env.production prezente în $LEGACY_SHARED_DIR (read-only pentru acest script)."

# --- Port trebuie ocupat doar de procesul PM2 curent (sau liber) -------------
PORT_OWNER_PID="$(ss -ltnp 2>/dev/null | awk -v p=":$PORT" '$4 ~ p {print $0}' | sed -nE 's/.*pid=([0-9]+).*/\1/p' | head -1 || true)"
if [ -n "$PORT_OWNER_PID" ]; then
  CURRENT_PM2_PID="$(pm2 jlist 2>/dev/null | node -e "
    const d = JSON.parse(require('fs').readFileSync(0,'utf8'));
    const p = d.find(x => x.name === '$PM2_APP_NAME');
    process.stdout.write(p ? String(p.pid) : '');
  " 2>/dev/null || true)"
  if [ "$PORT_OWNER_PID" != "$CURRENT_PM2_PID" ]; then
    die "Portul $PORT e ocupat de un proces necunoscut (pid=$PORT_OWNER_PID, nu procesul PM2 curent pid=${CURRENT_PM2_PID:-none}). Oprire."
  fi
  log "Port $PORT ocupat exact de procesul PM2 curent (pid=$PORT_OWNER_PID) — OK."
else
  log "Port $PORT liber momentan — OK."
fi

# --- Determină REPO_URL (fără a modifica LEGACY_SHARED_DIR sau current) -----
REPO_URL="${REPO_URL:-}"
if [ -z "$REPO_URL" ]; then
  REPO_URL="$(git -C "$CURRENT_TARGET" remote get-url origin 2>/dev/null || true)"
fi
[ -n "$REPO_URL" ] || die "Nu pot determina REPO_URL (setează explicit variabila REPO_URL)."
log "REPO_URL: $REPO_URL"

# --- Mirror local (cache) pentru verificări SHA rapide, fără node_modules ----
mkdir -p "$RELEASES_ROOT"
if [ -d "$GIT_CACHE_DIR" ]; then
  log "Actualizez cache-ul de mirror Git (fetch)..."
  git --git-dir="$GIT_CACHE_DIR" fetch --prune origin '+refs/heads/*:refs/remotes/origin/*' >/dev/null
else
  log "Creez cache-ul de mirror Git (prima rulare)..."
  git clone --mirror "$REPO_URL" "$GIT_CACHE_DIR" >/dev/null
fi

# --- Confirmă SHA există pe remote + refuză commit exclusiv local -----------
if ! git --git-dir="$GIT_CACHE_DIR" cat-file -e "${SHA}^{commit}" 2>/dev/null; then
  die "SHA $SHA nu există (nici local, nici pe remote după fetch)."
fi
CONTAINING_REFS="$(git --git-dir="$GIT_CACHE_DIR" branch -r --contains "$SHA" 2>/dev/null || true)"
if [ -z "$CONTAINING_REFS" ]; then
  die "SHA $SHA există ca obiect dar NU e reachable din niciun branch de pe remote (commit exclusiv local / nepushat). Oprire."
fi
log "SHA $SHA confirmat pe remote, reachable din:"
echo "$CONTAINING_REFS" | sed 's/^/  /'

# --- Nume release + validare path -------------------------------------------
SHORT_SHA="${SHA:0:8}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RELEASE_NAME="${TIMESTAMP}-${SHORT_SHA}"
RELEASE_DIR="$RELEASES_ROOT/$RELEASE_NAME"

case "$RELEASE_NAME" in
  *..*|*/*) die "Nume release nesigur: $RELEASE_NAME" ;;
esac
[ ! -e "$RELEASE_DIR" ] || die "Release-ul țintă există deja: $RELEASE_DIR"

if [ "$DRY_RUN" = "1" ]; then
  BUILD_DIR="$(mktemp -d /tmp/deploy-release-dryrun.XXXXXX)"
  log "[DRY-RUN] Folosesc director temporar în afara RELEASES_ROOT pentru validare completă: $BUILD_DIR"
  log "[DRY-RUN] NU se va crea $RELEASE_DIR, NU se schimbă symlink-ul current, NU se atinge PM2, NU se rulează migrări reale."
else
  BUILD_DIR="$RELEASE_DIR"
fi

cleanup_dry_run_dir() {
  if [ "$DRY_RUN" = "1" ] && [ -n "${BUILD_DIR:-}" ] && [ -d "$BUILD_DIR" ]; then
    rm -rf "$BUILD_DIR"
  fi
}
trap cleanup_dry_run_dir EXIT

# --- Checkout detached la SHA exact ------------------------------------------
log "Clonez din cache-ul local în $BUILD_DIR ..."
git clone --no-checkout --reference "$GIT_CACHE_DIR" "$GIT_CACHE_DIR" "$BUILD_DIR" >/dev/null
git -C "$BUILD_DIR" remote set-url origin "$REPO_URL"
git -C "$BUILD_DIR" fetch origin "$SHA" >/dev/null 2>&1 || true
git -C "$BUILD_DIR" checkout --detach "$SHA" >/dev/null
ACTUAL_HEAD="$(git -C "$BUILD_DIR" rev-parse HEAD)"
[ "$ACTUAL_HEAD" = "$SHA" ] || die "HEAD după checkout ($ACTUAL_HEAD) diferă de SHA cerut ($SHA)."
log "HEAD confirmat în $BUILD_DIR: $ACTUAL_HEAD"

# --- Leagă .env / .env.production ÎNAINTE de build (fără a le modifica) ----
ln -sfn "$LEGACY_SHARED_DIR/.env" "$BUILD_DIR/.env"
ln -sfn "$LEGACY_SHARED_DIR/.env.production" "$BUILD_DIR/.env.production"
log "Legat .env și .env.production din $LEGACY_SHARED_DIR (symlink, sursă neschimbată)."

# --- Leagă uploads fără să le modifice ---------------------------------------
mkdir -p "$BUILD_DIR/public"
rm -rf "$BUILD_DIR/public/uploads" 2>/dev/null || true
ln -sfn "$LEGACY_SHARED_DIR/public/uploads" "$BUILD_DIR/public/uploads"
log "Legat public/uploads din $LEGACY_SHARED_DIR (symlink, conținut neschimbat/neșters)."

# --- Instalare deterministă prin lockfile ------------------------------------
[ -f "$BUILD_DIR/package-lock.json" ] || die "Lipsește package-lock.json în $BUILD_DIR — refuz instalare nedeterministă."
log "npm ci ..."
( cd "$BUILD_DIR" && npm ci )

# --- Prisma: validare + status migrări ---------------------------------------
log "Prisma validate ..."
( cd "$BUILD_DIR" && npx prisma validate )

log "Prisma migrate status ..."
set +e
MIGRATE_STATUS_OUTPUT="$(cd "$BUILD_DIR" && npx prisma migrate status 2>&1)"
MIGRATE_STATUS_EXIT=$?
set -e
echo "$MIGRATE_STATUS_OUTPUT" | sed 's/^/  [prisma] /'

if [ $MIGRATE_STATUS_EXIT -ne 0 ]; then
  die "Nu pot determina starea migrărilor Prisma (exit=$MIGRATE_STATUS_EXIT) — refuz să continui în ambiguitate."
fi

if echo "$MIGRATE_STATUS_OUTPUT" | grep -qi "have not yet been applied\|following migration"; then
  if [ "$APPROVE_MIGRATIONS" != "1" ]; then
    die "Migrări Prisma în așteptare, dar --approve-migrations NU a fost dat. Refuz migrare neaprobată."
  fi
  if [ "$DRY_RUN" = "1" ]; then
    log "[DRY-RUN] would: npx prisma migrate deploy (migrări în așteptare, aprobate explicit)"
  else
    log "Migrări aprobate explicit — rulez prisma migrate deploy ..."
    ( cd "$BUILD_DIR" && npx prisma migrate deploy )
  fi
else
  log "Nicio migrare în așteptare — baza de date e aliniată cu schema."
fi

# --- Build --------------------------------------------------------------------
log "npm run build (NODE_ENV=production) ..."
( cd "$BUILD_DIR" && NODE_ENV=production npm run build )

[ -s "$BUILD_DIR/.next/BUILD_ID" ] || die "Lipsește .next/BUILD_ID după build — build invalid."
BUILD_ID="$(cat "$BUILD_DIR/.next/BUILD_ID")"
log "BUILD_ID confirmat: $BUILD_ID"

if [ "$DRY_RUN" = "1" ]; then
  log "[DRY-RUN] Toate validările au trecut pentru SHA=$SHA. Nu se creează release, nu se schimbă symlink, nu se pornește PM2."
  log "[DRY-RUN] SUCCES — pipeline-ul ar fi continuat cu comutarea symlink-ului 'current' și pornirea PM2."
  exit 0
fi

# === De aici încolo: acțiuni reale, cu rollback automat la orice eșec =======
trap - EXIT

PREVIOUS_TARGET="$CURRENT_TARGET"
SWITCHED_SYMLINK=0
PM2_STARTED_NEW=0

rollback_and_exit() {
  local reason="$1"
  err "EȘEC: $reason"
  err "Declanșez ROLLBACK automat către release anterior: $PREVIOUS_TARGET"
  if [ "$SWITCHED_SYMLINK" = "1" ]; then
    atomic_symlink_switch "$PREVIOUS_TARGET" "$CURRENT_LINK"
    log "Symlink 'current' restaurat la $PREVIOUS_TARGET"
  fi
  if [ -f "$PREVIOUS_TARGET/ecosystem.config.js" ]; then
    pm2 startOrReload "$PREVIOUS_TARGET/ecosystem.config.js" --update-env >/dev/null 2>&1 || \
      pm2 restart "$PM2_APP_NAME" --update-env >/dev/null 2>&1 || true
    log "PM2 repornit din release-ul anterior."
  fi
  err "ROLLBACK EXECUTAT. Release nou ($RELEASE_DIR) NU a fost șters — inspectează manual dacă e nevoie."
  exit 1
}

# --- Patch ecosystem.config.js din noul release (doar cwd, fără a atinge Git) -
[ -f "$RELEASE_DIR/ecosystem.config.js" ] || rollback_and_exit "Lipsește ecosystem.config.js în noul release."
sed -i.bak "s#cwd: '[^']*'#cwd: '${RELEASE_DIR}'#" "$RELEASE_DIR/ecosystem.config.js"
rm -f "$RELEASE_DIR/ecosystem.config.js.bak"
grep -q "cwd: '${RELEASE_DIR}'" "$RELEASE_DIR/ecosystem.config.js" || rollback_and_exit "Patch-ul cwd în ecosystem.config.js a eșuat."
log "ecosystem.config.js patch-uit: cwd -> $RELEASE_DIR"

# --- Comută symlink-ul 'current' ATOMIC --------------------------------------
atomic_symlink_switch "$RELEASE_DIR" "$CURRENT_LINK"
SWITCHED_SYMLINK=1
log "Symlink 'current' comutat atomic -> $RELEASE_DIR"

# --- Pornește PM2 explicit din noul release ----------------------------------
if ! pm2 startOrReload "$RELEASE_DIR/ecosystem.config.js" --update-env; then
  rollback_and_exit "pm2 startOrReload a eșuat pentru noul release."
fi
PM2_STARTED_NEW=1
sleep 2

# --- Verifică PM2 cwd + script ------------------------------------------------
PM2_CHECK="$(pm2 jlist 2>/dev/null | node -e "
  const d = JSON.parse(require('fs').readFileSync(0,'utf8'));
  const p = d.find(x => x.name === '$PM2_APP_NAME');
  if (!p) { console.log('MISSING'); process.exit(0); }
  const e = p.pm2_env || {};
  console.log((e.pm_cwd === '$RELEASE_DIR' && e.status === 'online') ? 'OK' : 'MISMATCH:' + e.pm_cwd + ':' + e.status);
")"
if [ "$PM2_CHECK" != "OK" ]; then
  rollback_and_exit "PM2 cwd/status invalid după restart: $PM2_CHECK (așteptat cwd=$RELEASE_DIR, status=online)"
fi
log "PM2 confirmat: cwd=$RELEASE_DIR, status=online"

# --- Health check cu retry ----------------------------------------------------
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
if [ "$HEALTH_OK" != "1" ]; then
  rollback_and_exit "Health check a eșuat după $HEALTH_RETRIES încercări ($HEALTH_URL)."
fi
log "Health check OK (200) pe $HEALTH_URL"

log "✅ Deploy COMPLET și SĂNĂTOS: $RELEASE_DIR (SHA=$SHA, BUILD_ID=$BUILD_ID)"
log "Release anterior păstrat (NU șters): $PREVIOUS_TARGET"
log "Pentru rollback manual: scripts/rollback-production-release.sh --release $(basename "$PREVIOUS_TARGET")"
exit 0

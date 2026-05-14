#!/usr/bin/env bash
# Înregistrează SHA-ul curent pentru rollback + pași VPS înainte de deploy producție.
# Nu modifică baza de date. Backup-ul DB se face separat pe server (vezi mesajul de la final).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -d .git ]; then
  echo "❌ Nu rulezi din rădăcina repo-ului (lipsește .git)." >&2
  exit 1
fi

STAMP=$(date +%Y%m%d_%H%M%S)
OUT_DIR="$ROOT/deploy-snapshots"
mkdir -p "$OUT_DIR"
OUT_FILE="$OUT_DIR/pre-deploy-${STAMP}.txt"

{
  echo "timestamp_utc=$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "local_stamp=${STAMP}"
  echo "branch=$(git rev-parse --abbrev-ref HEAD)"
  echo "commit_full=$(git rev-parse HEAD)"
  echo "describe=$(git describe --always --dirty 2>/dev/null || echo n/a)"
} >"$OUT_FILE"

echo "✅ Snapshot local: $OUT_FILE"
cat "$OUT_FILE"
echo ""
echo "══════════════════════════════════════════════════════════════"
echo "  Pe VPS (aplicația live) — rulează DIN folderul de deploy"
echo "  Ținta standard: DEPLOY_ROOT=/var/www/clickanunt"
echo "══════════════════════════════════════════════════════════════"
echo "1) ssh pe server → cd /var/www/clickanunt   (sau valoarea ta DEPLOY_ROOT)"
echo "2) Salvează SHA rollback:  git rev-parse HEAD  → notează în raportul post-deploy"
echo "3) Backup DB (non-interactiv, necesită POSTGRES_* sau DATABASE_URL):"
echo "     ./scripts/backup-db.sh pre-deploy-${STAMP}"
echo "4) Verificare migrații fără reset:  ./scripts/migration-check-safe.sh"
echo "5) Deploy: doar din acest folder (vezi scripts/deploy-vps.sh + npm run deploy:prod)"
echo ""
echo "⚠️  Nu rula prisma migrate reset pe producție."

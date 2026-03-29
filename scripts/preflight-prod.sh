#!/usr/bin/env bash
###############################################################################
# Preflight strict — înainte de push/deploy (local sau pe VPS înainte de pull).
# Oprește dacă: git dirty, lipsesc DATABASE_URL/JWT_SECRET în .env, type-check,
# lint, test, build sau manifest fără /auth/register și /auth/signup.
#
# Fără bypass pentru .env în fluxul de producție.
###############################################################################
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "════════════════════════════════════════════════════════"
echo "  Preflight production (strict)"
echo "════════════════════════════════════════════════════════"

if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  echo "❌ Git working tree nu e curat."
  git status --short
  exit 1
fi
echo "✅ Git working tree curat"

if [ ! -f .env ]; then
  echo "❌ Lipsește .env"
  exit 1
fi
if ! grep -qE '^[[:space:]]*DATABASE_URL=[^[:space:]]+' .env; then
  echo "❌ DATABASE_URL lipsește sau e gol în .env"
  exit 1
fi
if ! grep -qE '^[[:space:]]*JWT_SECRET=[^[:space:]]+' .env; then
  echo "❌ JWT_SECRET lipsește sau e gol în .env"
  exit 1
fi
echo "✅ .env: DATABASE_URL, JWT_SECRET"

if [ ! -f package-lock.json ]; then
  echo "❌ Lipsește package-lock.json (necesar pentru npm ci)"
  exit 1
fi

echo "[preflight] npm ci"
npm ci

echo "[preflight] npx prisma validate"
npx prisma validate

echo "[preflight] npm run type-check"
npm run type-check
echo "[preflight] npm run lint"
npm run lint
echo "[preflight] npm test"
npm test

echo "[preflight] NODE_ENV=production npm run build"
NODE_ENV=production npm run build

MANIFEST="$ROOT/.next/app-path-routes-manifest.json"
if [ ! -f "$MANIFEST" ]; then
  echo "❌ Lipsește $MANIFEST după build"
  exit 1
fi
if ! grep -qF '"/auth/register"' "$MANIFEST"; then
  echo "❌ Manifest fără /auth/register"
  exit 1
fi
if ! grep -qF '"/auth/signup"' "$MANIFEST"; then
  echo "❌ Manifest fără /auth/signup"
  exit 1
fi
echo "✅ Manifest: /auth/register, /auth/signup"

echo ""
echo "════════════════════════════════════════════════════════"
echo "  ✅ PREFLIGHT PASS"
echo "════════════════════════════════════════════════════════"

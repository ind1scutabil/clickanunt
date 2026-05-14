#!/usr/bin/env bash
# Verificare migrații Prisma fără aplicare: nu rulează migrate deploy / migrate reset.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== npx prisma migrate status (read-only) ==="
npx prisma migrate status

echo ""
echo "✅ migration-check-safe: nu s-a rulat migrate deploy sau reset."
echo "Pentru aplicarea migrațiilor pe producție folosește explicit: npx prisma migrate deploy"

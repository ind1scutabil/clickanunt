#!/usr/bin/env bash
# Safe PM2 reload — validate ecosystem first. Run on VPS in deploy directory.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "[pm2-reload-safe] Validating ecosystem.config.js…"
node scripts/production/validate-ecosystem.mjs

echo "[pm2-reload-safe] Reloading clickanunt…"
pm2 reload ecosystem.config.js --update-env || pm2 restart clickanunt

echo "[pm2-reload-safe] Status:"
pm2 describe clickanunt | grep -E "status|restarts|uptime|max memory" || true

echo "[pm2-reload-safe] Health:"
curl -sS -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:3000/api/health || true

echo "[pm2-reload-safe] Done."

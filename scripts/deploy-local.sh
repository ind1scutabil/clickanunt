#!/usr/bin/env bash
# Local / Cursor / macOS — fără PM2, SSH, rsync, căi VPS.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
npm ci
npm run type-check
npm run lint
npm test
npm run build
echo "✅ deploy-local: OK"

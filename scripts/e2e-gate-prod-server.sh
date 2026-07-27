#!/usr/bin/env bash
# Start a dedicated next start for E2E gate, run tests, stop only this PID.
# Usage: ./scripts/e2e-gate-prod-server.sh [port]
#
# Server is spawned detached (PPID=1) so short-lived agent/CI shells cannot
# SIGHUP/kill the process group — demonstrated ECONNREFUSED root cause in FAZA 6C.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PORT="${1:-3055}"
LOG_DIR="$ROOT/tmp/test-results/faza6c"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/gate-server-${PORT}.log"
: >"$LOG"

if lsof -iTCP:"$PORT" -sTCP:LISTEN -P >/dev/null 2>&1; then
  echo "Port $PORT already in use — refuse to reuse stale server" >&2
  lsof -iTCP:"$PORT" -sTCP:LISTEN -P >&2 || true
  exit 1
fi

if [[ ! -f .next/BUILD_ID ]]; then
  echo "Missing .next/BUILD_ID — run npm run build first" >&2
  exit 1
fi

PORT="$PORT" LOG="$LOG" LOG_DIR="$LOG_DIR" node <<'NODE'
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const port = process.env.PORT;
const logPath = process.env.LOG;
const envPath = path.join(process.cwd(), '.env');
const env = {
  ...process.env,
  PORT: String(port),
  E2E_DISABLE_RATE_LIMIT: '1',
  STRIPE_ALLOW_TEST_KEYS_IN_PRODUCTION: '1',
  NODE_ENV: 'production',
};
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#') || !t.includes('=')) continue;
  const i = t.indexOf('=');
  const k = t.slice(0, i);
  let v = t.slice(i + 1);
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[k] = v;
}
const out = fs.openSync(logPath, 'a');
const child = spawn(
  process.execPath,
  [require.resolve('next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(port)],
  { detached: true, stdio: ['ignore', out, out], env, cwd: process.cwd() }
);
fs.writeFileSync(path.join(process.env.LOG_DIR, 'gate-listen.pid'), String(child.pid));
console.log('detached_pid=' + child.pid);
child.unref();
NODE

PID=$(cat "$LOG_DIR/gate-listen.pid")
cleanup() {
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID" 2>/dev/null || true
    wait "$PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

for i in $(seq 1 60); do
  if curl -sf -o /dev/null "http://127.0.0.1:${PORT}/api/csrf"; then
    break
  fi
  if ! kill -0 "$PID" 2>/dev/null; then
    echo "Server died before ready" >&2
    cat "$LOG" >&2
    exit 1
  fi
  sleep 1
done

echo "gate_server_pid=$PID port=$PORT build=$(cat .next/BUILD_ID)"
curl -sS -o /dev/null -w "health_csrf=%{http_code}\n" "http://127.0.0.1:${PORT}/api/csrf"

export PLAYWRIGHT_SKIP_WEBSERVER=1
export PLAYWRIGHT_BASE_URL="http://127.0.0.1:${PORT}"
npx playwright test \
  tests/e2e/price-salary-model.spec.ts \
  tests/e2e/price-salary-patch.spec.ts \
  tests/e2e/business-upgrade-path.spec.ts \
  tests/e2e/publish-auth-gate.spec.ts \
  tests/e2e/publish-wizard-smoke.spec.ts \
  --project=chromium --project="Mobile Chrome" --project=webkit

curl -sS -o /dev/null -w "health_after=%{http_code}\n" "http://127.0.0.1:${PORT}/api/csrf" || echo "health_after=ERR"

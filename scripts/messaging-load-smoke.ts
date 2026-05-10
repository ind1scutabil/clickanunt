/**
 * Smoke load pentru Redis messaging bus (publish storm).
 *
 * Nu rulează browser / SSE — doar satură canalul Redis tipic de mesagerie.
 * Exemplu:
 *   REDIS_URL=redis://127.0.0.1:6379 \
 *   MESSAGING_LOAD_USER_ID='<uuid-canonic-utilizator>' \
 *   npx ts-node --transpile-only --project tsconfig.scripts.json scripts/messaging-load-smoke.ts
 */

import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const USER_ID = process.env.MESSAGING_LOAD_USER_ID?.trim();
const PREFIX = process.env.MESSAGING_REDIS_CHANNEL_PREFIX?.trim() || "ca:msg:user:";
const N = Math.min(5000, Math.max(1, Number(process.env.MESSAGING_LOAD_COUNT ?? 400)));

async function main(): Promise<void> {
  if (!USER_ID) {
    console.error("Set MESSAGING_LOAD_USER_ID=<uuid>");
    process.exit(1);
  }
  const channel = `${PREFIX}${USER_ID.toLowerCase()}`;
  const r = new Redis(REDIS_URL);

  const t0 = Date.now();
  for (let i = 0; i < N; i++) {
    const env = JSON.stringify({
      v: 1,
      targetUserId: USER_ID.toLowerCase(),
      event: "conversation_update",
      ts: Date.now(),
      ssePayload: {
        type: "conversation_update",
        conversationId: "00000000-0000-0000-0000-000000000000",
        reason: `load:${i}`,
      },
    });
    await r.publish(channel, env);
  }
  const ms = Date.now() - t0;
  console.log(`Published ${N} envelopes to ${channel} in ${ms}ms (${(N / (ms / 1000)).toFixed(1)} msg/s)`);
  await r.quit();
}

void main();

/**
 * One-shot pre-fix replay probe — prints statuses only, never tokens.
 * Run: npx ts-node --transpile-only --project tsconfig.scripts.json scripts/probe-refresh-replay.ts
 */
import { prisma } from "../lib/prisma";
import {
  generateRefreshToken,
  refreshAccessToken,
} from "../lib/auth";
import { sessionVersionFromUser } from "../lib/auth/session-version";
import bcrypt from "bcrypt";

async function main() {
  const email = `replay14c-${Date.now()}@example.com`;
  const password = "Password123!";
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma!.user.create({
    data: {
      email,
      password: hash,
      name: "Replay Demo",
      role: "user",
    },
  });

  try {
    const sv = sessionVersionFromUser(user);
    const refresh1 = await generateRefreshToken(
      user.id,
      user.email,
      user.role,
      sv
    );

    const r1 = await refreshAccessToken(refresh1);
    const r2 = await refreshAccessToken(refresh1);
    const concurrent = await Promise.all([
      refreshAccessToken(refresh1),
      refreshAccessToken(refresh1),
    ]);

    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify(
        {
          userIdPrefix: user.id.slice(0, 8),
          sessionVersion: sv,
          first_refresh_ok: r1.success,
          first_has_access: Boolean(r1.accessToken),
          replay_same_token_ok: r2.success,
          replay_has_access: Boolean(r2.accessToken),
          concurrent_ok: concurrent.map((c) => c.success),
          concurrent_access_count: concurrent.filter((c) =>
            Boolean(c.accessToken)
          ).length,
          verdict:
            r2.success && concurrent.every((c) => c.success)
              ? "REPLAY_ACCEPTED_PRE_FIX"
              : "UNEXPECTED",
        },
        null,
        2
      )
    );
  } finally {
    await prisma!.user.delete({ where: { id: user.id } }).catch(() => undefined);
    await prisma!.$disconnect();
  }
}

main().catch(async (e) => {
  // eslint-disable-next-line no-console
  console.error("ERR", e instanceof Error ? e.message : e);
  await prisma!.$disconnect();
  process.exit(1);
});

/**
 * Integration-style probe for refresh rotation (statuses only).
 * Requires local migrate deploy of auth_refresh_tokens.
 */
import { prisma } from "../lib/prisma";
import {
  issueAuthTokenPair,
  refreshAccessToken,
} from "../lib/auth";
import bcrypt from "bcrypt";

async function main() {
  const email = `rot14c-${Date.now()}@example.com`;
  const hash = await bcrypt.hash("Password123!", 10);
  const user = await prisma!.user.create({
    data: { email, password: hash, name: "Rot Demo", role: "user" },
  });

  try {
    const issued = await issueAuthTokenPair(user);
    const r1 = await refreshAccessToken(issued.refreshToken);
    const replay = await refreshAccessToken(issued.refreshToken);
    const r2 = r1.refreshToken
      ? await refreshAccessToken(r1.refreshToken)
      : { success: false as const };
    const concurrent = await Promise.all([
      refreshAccessToken(issued.refreshToken),
      refreshAccessToken(issued.refreshToken),
    ]);

    const active = await prisma!.authRefreshToken.count({
      where: { userId: user.id, usedAt: null, revokedAt: null },
    });
    const replayRevoked = await prisma!.authRefreshToken.count({
      where: {
        userId: user.id,
        revokeReason: { in: ["replay", "replay_concurrent"] },
      },
    });

    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify(
        {
          userIdPrefix: user.id.slice(0, 8),
          first_ok: r1.success,
          first_rotated_refresh: Boolean(r1.refreshToken),
          replay_old_ok: replay.success,
          // after replay, family revoked → chained token must fail
          post_replay_chain_ok: r2.success,
          concurrent_old_ok: concurrent.map((c) => c.success),
          active_unused_records: active,
          replay_revoked_rows: replayRevoked,
          verdict:
            r1.success &&
            !replay.success &&
            !r2.success &&
            concurrent.every((c) => !c.success) &&
            replayRevoked > 0
              ? "ROTATION_REPLAY_HARDENED"
              : "UNEXPECTED",
        },
        null,
        2
      )
    );
  } finally {
    await prisma!.authRefreshToken.deleteMany({ where: { userId: user.id } });
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

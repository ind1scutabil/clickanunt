/** UUID / id din JWT vs Prisma — compară canonical (trim + lowercase) */

export function canonicalMessagingUserId(
  userId: string | null | undefined
): string | null {
  const s = typeof userId === "string" ? userId.trim() : "";
  return s.length > 0 ? s.toLowerCase() : null;
}

export function messagingUserIdsEqual(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  const ca = canonicalMessagingUserId(a);
  const cb = canonicalMessagingUserId(b);
  return ca !== null && cb !== null && ca === cb;
}

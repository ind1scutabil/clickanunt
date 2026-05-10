import { canonicalMessagingUserId } from "./messaging-user-id";

/**
 * Convenție DB: @@unique([participant1Id, participant2Id, listingId]) cu participant1Id ≤ participant2Id
 * după UUID canonical lowercase — aceeași pereche la POST/GET ca la JWT viewer (`userCanon`).
 */
export function conversationParticipantSlots(
  userIdA: string,
  userIdB: string
): { participant1Id: string; participant2Id: string } {
  const a = canonicalMessagingUserId(userIdA) ?? userIdA.trim().toLowerCase();
  const b = canonicalMessagingUserId(userIdB) ?? userIdB.trim().toLowerCase();
  return a.localeCompare(b, "en") <= 0
    ? { participant1Id: a, participant2Id: b }
    : { participant1Id: b, participant2Id: a };
}

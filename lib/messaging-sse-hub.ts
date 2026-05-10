/**
 * Hub SSE: abonări locale + fanout prin Redis Pub/Sub între instanțe.
 */

import { canonicalMessagingUserId } from "@/lib/messaging-user-id";
import type { MessagingSseEventName } from "@/lib/messaging-event-schema";
import { buildRedisEnvelope } from "@/lib/messaging-event-schema";
import {
  registerMessagingStreamHandler,
  publishEnvelopeToUsers,
} from "@/lib/messaging-redis-bus";

type Subscriber = (payload: Record<string, unknown>) => void;

/**
 * Abonare SSE pentru un utilizator (handlers livrează deja `ssePayload`-ul).
 */
export function subscribeUser(userId: string, onEvent: Subscriber): () => void {
  const key = canonicalMessagingUserId(userId) ?? "";
  if (!key) {
    return () => {};
  }
  return registerMessagingStreamHandler(userId, onEvent);
}

/** @deprecated folosiți messagingPublishSse — păstrat pentru compat rute existente */
export function publishToUsers(userIds: string[], payload: Record<string, unknown>): void {
  messagingPublishSse(userIds, "new_message", payload);
}

export function messagingPublishSse(
  userIds: string[],
  event: MessagingSseEventName,
  ssePayload: Record<string, unknown>
): void {
  void publishEnvelopeToUsers(userIds, (canonicalTargetId) =>
    buildRedisEnvelope({
      targetUserId: canonicalTargetId,
      event,
      ssePayload,
    })
  );
}

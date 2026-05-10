/**
 * Contrat evenimente messaging distribuite (Redis) → SSE.
 * `ssePayload` e exact obiectul trimis către client în corpul SSE `data:`.
 */

import { messagingInstanceTag } from "@/lib/messaging-sse-metrics";

export const MESSAGING_SSE_PROTOCOL_VERSION = 1 as const;

export type MessagingSseEventName =
  | "new_message"
  | "unread_update"
  | "conversation_update"
  | "typing"
  | "read_receipt"
  | "delivery_receipt"
  | "presence"
  | "heartbeat";

const ALLOWED_EVENTS = new Set<MessagingSseEventName>([
  "new_message",
  "unread_update",
  "conversation_update",
  "typing",
  "read_receipt",
  "delivery_receipt",
  "presence",
  "heartbeat",
]);

/** Parsare inbound Redis — evită payload-uri uriașe în memorie (DoS per worker). */
export const MESSAGING_REDIS_PAYLOAD_MAX_CHARS = 65_536;

/** Envelope pus pe Redis (NU expus către browser). */
export type MessagingRedisEnvelope = {
  v: typeof MESSAGING_SSE_PROTOCOL_VERSION;
  targetUserId: string;
  event: MessagingSseEventName;
  ts: number;
  /** Durată publish opțională (diag) */
  publishLatencyMs?: number;
  ssePayload: Record<string, unknown>;
  instance?: string;
};

export function buildRedisEnvelope(params: {
  targetUserId: string;
  event: MessagingSseEventName;
  ssePayload: Record<string, unknown>;
  publishLatencyMs?: number;
}): MessagingRedisEnvelope {
  return {
    v: MESSAGING_SSE_PROTOCOL_VERSION,
    targetUserId: params.targetUserId,
    event: params.event,
    ts: Date.now(),
    publishLatencyMs: params.publishLatencyMs,
    ssePayload: params.ssePayload,
    instance: messagingInstanceTag(),
  };
}

/** Validează parsare strictă pentru anti-cross-user leakage + allowlist events. */
export function parseMessagingRedisEnvelope(raw: string): MessagingRedisEnvelope | null {
  if (
    typeof raw !== "string" ||
    raw.length === 0 ||
    raw.length > MESSAGING_REDIS_PAYLOAD_MAX_CHARS
  ) {
    return null;
  }
  try {
    const o = JSON.parse(raw) as MessagingRedisEnvelope;
    if (
      o?.v !== MESSAGING_SSE_PROTOCOL_VERSION ||
      typeof o.targetUserId !== "string" ||
      o.targetUserId.trim().length < 10 ||
      typeof o.event !== "string" ||
      !ALLOWED_EVENTS.has(o.event as MessagingSseEventName) ||
      typeof o.ts !== "number" ||
      !o.ssePayload ||
      typeof o.ssePayload !== "object"
    ) {
      return null;
    }
    return { ...o, event: o.event as MessagingSseEventName };
  } catch {
    return null;
  }
}

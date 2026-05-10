/**
 * Structured logging și corelații pentru mesagerie enterprise.
 */

import os from "os";
import type { NextRequest } from "next/server";
import { logger } from "@/lib/observability";

export type MessagingCorrelation = {
  requestId?: string;
  conversationId?: string | null;
  messageId?: string | null;
  userId?: string | null;
  nodeId: string;
};

const EVENT_PREFIX = "messaging";

export type MessagingLogEvent =
  | "message_send"
  | "message_receive"
  | "sse_connect"
  | "sse_disconnect"
  | "reconnect"
  | "unread_sync"
  | "redis_publish"
  | "redis_subscribe"
  | "delivery_receipt"
  | "read_receipt"
  | "typing"
  | "presence";

export function messagingNodeId(): string {
  const forced = process.env.MESSAGING_NODE_ID?.trim();
  if (forced) return forced.slice(0, 256);
  const h = typeof os.hostname === "function" ? os.hostname() : "unknown";
  return `${h}:${process.pid}`;
}

export function messagingRequestCorrelation(request: NextRequest): MessagingCorrelation {
  const rid =
    request.headers.get("x-request-id")?.trim() ||
    request.headers.get("x-correlation-id")?.trim();
  return {
    ...(rid ? { requestId: rid } : {}),
    nodeId: messagingNodeId(),
  };
}

/** Log structurat: nivel info, cheie eveniment pentru agregatori (Datadog/Elast/etc.). */
export function messagingStructuredLog(
  event: MessagingLogEvent,
  data: Omit<MessagingCorrelation, "nodeId"> & Record<string, unknown>
): void {
  const payload = {
    messagingEvent: `${EVENT_PREFIX}.${event}`,
    nodeId: messagingNodeId(),
    ...data,
  };
  logger.info(`${EVENT_PREFIX}.${event}`, payload);
}

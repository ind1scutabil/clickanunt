/**
 * Pub/Sub Redis pentru SSE multi-instancă / PM2 cluster.
 * Fiecare worker: o conexiune subscriber (duplicate) + refcount per userId.
 * Fallback in-proces dacă Redis indisponibil sau MESSAGING_DISABLE_REDIS=1.
 */

import Redis from "ioredis";
import { getRedisClient } from "@/lib/redis";
import { logger } from "@/lib/observability";
import { canonicalMessagingUserId } from "@/lib/messaging-user-id";
import type { MessagingRedisEnvelope } from "@/lib/messaging-event-schema";
import { parseMessagingRedisEnvelope } from "@/lib/messaging-event-schema";
import {
  recordRedisInboundDelivery,
  recordInvalidEnvelope,
  recordFallbackLocalDelivery,
  recordRedisPublish,
  recordSseHandlerDispatchError,
} from "@/lib/messaging-sse-metrics";
import { messagingStructuredLog } from "@/lib/messaging-observability";
import {
  promObserveRedisPublish,
  promObserveInvalidRedisEnvelope,
  promObserveRedisSubscriberError,
  promObserveRedisChannelSubscribeOpen,
  promObserveLocalFanoutFallback,
  promObserveSseHandlerDispatchError,
} from "@/lib/messaging-prometheus";
import { messagingSentryCaptureException } from "@/lib/messaging-sentry";

const CHANNEL_PREFIX =
  process.env.MESSAGING_REDIS_CHANNEL_PREFIX?.trim() || "ca:msg:user:";

export function messagingUserChannel(canonicalUserId: string): string {
  return `${CHANNEL_PREFIX}${canonicalUserId}`;
}

type LocalHandler = (payload: Record<string, unknown>) => void;

const localSubscribers = new Map<string, Set<LocalHandler>>();
const redisRefCount = new Map<string, number>();

let subscriberClient: Redis | null = null;

function isRedisDisabled(): boolean {
  return process.env.MESSAGING_DISABLE_REDIS === "1";
}

function getSubscriberConnection(): Redis | null {
  if (isRedisDisabled()) return null;
  try {
    if (!subscriberClient) {
      const master = getRedisClient();
      subscriberClient = master.duplicate({
        maxRetriesPerRequest: null,
        enableOfflineQueue: true,
        retryStrategy: (times: number) => Math.min(times * 100, 5_000),
      });
      subscriberClient.on("error", (err: Error) => {
        logger.warn("messaging.redis.subscriber.error", { message: err.message });
        promObserveRedisSubscriberError();
        void messagingSentryCaptureException(err, { component: "messaging.redis.subscriber" });
      });
      subscriberClient.on("message", (channel: string, message: string) => {
        dispatchRedisMessage(channel, message);
      });
    }
    return subscriberClient;
  } catch (e: unknown) {
    logger.warn("messaging.redis.subscriber.unavailable", {
      message: e instanceof Error ? e.message : String(e),
    });
    return null;
  }
}

function dispatchToLocal(canonicalTarget: string, payload: Record<string, unknown>): void {
  const set = localSubscribers.get(canonicalTarget);
  if (!set) return;
  for (const fn of set) {
    try {
      fn(payload);
    } catch {
      recordSseHandlerDispatchError(1);
      promObserveSseHandlerDispatchError(1);
    }
  }
}

function dispatchRedisMessage(channel: string, message: string): void {
  if (!channel.startsWith(CHANNEL_PREFIX)) return;
  const uid = channel.slice(CHANNEL_PREFIX.length).trim().toLowerCase();
  if (!uid) return;

  const env = parseMessagingRedisEnvelope(message);
  if (!env) {
    recordInvalidEnvelope();
    promObserveInvalidRedisEnvelope();
    return;
  }
  const target = canonicalMessagingUserId(env.targetUserId);
  if (!target || target !== uid) {
    recordInvalidEnvelope();
    promObserveInvalidRedisEnvelope();
    return;
  }

  recordRedisInboundDelivery();
  dispatchToLocal(target, env.ssePayload);
}

/**
 * Înregistrează Redis subscribe primul listener; refcount corect inclusiv între awaits (un singur thread).
 */
async function redisSubscribeUser(canonicalUserId: string): Promise<void> {
  const sub = getSubscriberConnection();
  if (!sub) return;
  const ch = messagingUserChannel(canonicalUserId);
  const current = redisRefCount.get(canonicalUserId) ?? 0;
  if (current === 0) {
    redisRefCount.set(canonicalUserId, 1);
    try {
      await sub.subscribe(ch);
      messagingStructuredLog("redis_subscribe", {
        userId: canonicalUserId,
        channelSuffix: canonicalUserId.slice(0, 8),
      });
      promObserveRedisChannelSubscribeOpen();
    } catch (e) {
      redisRefCount.delete(canonicalUserId);
      throw e;
    }
  } else {
    redisRefCount.set(canonicalUserId, current + 1);
  }
}

async function redisUnsubscribeUser(canonicalUserId: string): Promise<void> {
  const sub = subscriberClient;
  if (!sub) return;
  const current = redisRefCount.get(canonicalUserId) ?? 0;
  if (current <= 0) return;
  if (current === 1) {
    redisRefCount.delete(canonicalUserId);
    try {
      await sub.unsubscribe(messagingUserChannel(canonicalUserId));
    } catch {
      /* ignore */
    }
  } else {
    redisRefCount.set(canonicalUserId, current - 1);
  }
}

function localFanout(canonicalUserId: string, payload: Record<string, unknown>): void {
  dispatchToLocal(canonicalUserId, payload);
}

/**
 * Înregistrează handler SSE local + abonare Redis pentru user.
 */
export function registerMessagingStreamHandler(
  userId: string,
  onSsePayload: LocalHandler
): () => void {
  const key = canonicalMessagingUserId(userId) ?? "";
  if (!key) {
    return () => {};
  }
  let set = localSubscribers.get(key);
  if (!set) {
    set = new Set();
    localSubscribers.set(key, set);
  }
  set.add(onSsePayload);

  void redisSubscribeUser(key).catch((e: unknown) => {
    logger.warn("messaging.redis.subscribe.failed", {
      message: e instanceof Error ? e.message : String(e),
    });
    void messagingSentryCaptureException(e, {
      component: "messaging.redis.subscribe",
      userId: key,
    });
  });

  return () => {
    set!.delete(onSsePayload);
    if (set!.size === 0) {
      localSubscribers.delete(key);
      void redisUnsubscribeUser(key).catch(() => {});
    } else {
      localSubscribers.set(key, set!);
    }
  };
}

/**
 * Publică envelope către un singur user (canonic).
 */
export async function publishEnvelopeToUser(
  userId: string,
  envelope: MessagingRedisEnvelope
): Promise<void> {
  const key = canonicalMessagingUserId(userId) ?? "";
  if (!key) return;

  const payloadStr = JSON.stringify(envelope);
  const t0 = Date.now();

  if (isRedisDisabled()) {
    localFanout(key, envelope.ssePayload);
    recordFallbackLocalDelivery(1);
    promObserveLocalFanoutFallback(1);
    return;
  }

  try {
    const pub = getRedisClient();
    await pub.publish(messagingUserChannel(key), payloadStr);
    const durMs = Date.now() - t0;
    recordRedisPublish(durMs, true);
    promObserveRedisPublish(durMs, true);
    logger.debug("messaging.redis_publish.success", {
      targetUserSuffix: key.slice(0, 8),
      event: envelope.event,
      ms: durMs,
    });
  } catch (e: unknown) {
    const durMs = Date.now() - t0;
    recordRedisPublish(durMs, false);
    promObserveRedisPublish(durMs, false);
    logger.warn("messaging.redis.publish.failed", {
      message: e instanceof Error ? e.message : String(e),
    });
    void messagingSentryCaptureException(e, {
      component: "messaging.redis.publish",
      targetUserId: key,
      event: envelope.event,
    });
    localFanout(key, envelope.ssePayload);
    recordFallbackLocalDelivery(1);
    promObserveLocalFanoutFallback(1);
  }
}

/**
 * Publică către mai mulți destinatari unici (dedupe), în paralel.
 */
export async function publishEnvelopeToUsers(
  userIds: string[],
  build: (canonicalTargetId: string) => MessagingRedisEnvelope
): Promise<void> {
  const seen = new Set<string>();
  const tasks: Promise<void>[] = [];
  for (const raw of userIds) {
    const key = canonicalMessagingUserId(raw);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    tasks.push(publishEnvelopeToUser(key, build(key)));
  }
  await Promise.all(tasks);
}

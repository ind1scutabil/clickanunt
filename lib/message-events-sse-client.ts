/**
 * Client SSE pentru /api/messages/events — cookie HttpOnly (same-origin EventSource).
 * Nu mai pune JWT în query string / localStorage.
 */

const INITIAL_BACKOFF_MS = 1500;
const MAX_BACKOFF_MS = 45_000;
const SSE_STALE_MS = 85_000;
const STALE_CHECK_MS = 20_000;

export type MessagingTelemetryKind = "sse_reconnect" | "sse_transport_ended";

function fireMessagingTelemetry(kind: MessagingTelemetryKind): void {
  if (typeof window === "undefined" || typeof fetch === "undefined") return;
  try {
    void fetch("/api/messages/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind }),
      credentials: "include",
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

export interface ConnectMessageEventsSseHandlers {
  onOpen?: () => void;
  onMessage: (ev: MessageEvent) => void;
  onTransportEnded?: () => void;
}

function detachEventSource(es: EventSource | null): void {
  if (!es) return;
  es.onopen = null;
  es.onmessage = null;
  es.onerror = null;
  es.close();
}

/**
 * Întoarce dispose — apel obligatoriu la unmount / ieșire din pagină.
 */
export function connectMessageEventsSse(handlers: ConnectMessageEventsSseHandlers): () => void {
  let disposed = false;
  let es: EventSource | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let stalenessWatch: ReturnType<typeof setInterval> | null = null;
  let sawOpen = false;
  let lastInboundDataAt = Date.now();
  let backoffMs = INITIAL_BACKOFF_MS;

  const clearReconnect = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const bumpInbound = () => {
    lastInboundDataAt = Date.now();
  };

  const scheduleReconnect = () => {
    if (disposed) return;
    fireMessagingTelemetry("sse_reconnect");
    clearReconnect();
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      openStream();
    }, backoffMs);
    backoffMs = Math.min(MAX_BACKOFF_MS, Math.floor(backoffMs * 1.6));
  };

  const openStream = () => {
    if (disposed) return;
    clearReconnect();
    detachEventSource(es);
    es = null;
    sawOpen = false;

    let source: EventSource;
    try {
      // Same-origin EventSource sends cookies automatically — no ?token=
      source = new EventSource("/api/messages/events");
    } catch {
      scheduleReconnect();
      return;
    }

    es = source;

    source.onopen = () => {
      if (disposed || es !== source) return;
      sawOpen = true;
      backoffMs = INITIAL_BACKOFF_MS;
      bumpInbound();
      handlers.onOpen?.();
    };

    source.onmessage = (ev) => {
      bumpInbound();
      handlers.onMessage(ev);
    };

    source.onerror = () => {
      if (disposed || es !== source) return;
      detachEventSource(es);
      es = null;
      const wasLive = sawOpen;
      sawOpen = false;
      if (wasLive) {
        fireMessagingTelemetry("sse_transport_ended");
        handlers.onTransportEnded?.();
      }
      scheduleReconnect();
    };
  };

  openStream();

  stalenessWatch = setInterval(() => {
    if (disposed || !sawOpen) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    const gap =
      typeof Date.now === "function" ? Date.now() - lastInboundDataAt : 0;
    if (gap <= SSE_STALE_MS) return;
    detachEventSource(es);
    es = null;
    backoffMs = INITIAL_BACKOFF_MS;
    sawOpen = false;
    handlers.onTransportEnded?.();
    scheduleReconnect();
  }, STALE_CHECK_MS);

  return () => {
    disposed = true;
    clearReconnect();
    if (stalenessWatch) {
      clearInterval(stalenessWatch);
      stalenessWatch = null;
    }
    detachEventSource(es);
    es = null;
    sawOpen = false;
  };
}

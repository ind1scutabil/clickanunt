/**
 * Client SSE pentru /api/messages/events: EventSource folosește ?token= (fără Authorization).
 * JWT access expiră (15m); reconectarea nativă a browserului repetă același URL → 401 în buclă.
 * Oprim acea reconectare, citim token-ul curent din localStorage și reconectăm cu backoff.
 * La rotație de token (refresh), închidem fluxul și deschidem unul nou.
 */

const TOKEN_WATCH_MS = 30_000;
const INITIAL_BACKOFF_MS = 1500;
const MAX_BACKOFF_MS = 45_000;
/** SSE comment `: ping` nu trece prin `onmessage`; folosim `data:` heartbeat pentru stale detection */
const SSE_STALE_MS = 85_000;
const STALE_CHECK_MS = 20_000;

export type MessagingTelemetryKind = "sse_reconnect" | "sse_transport_ended";

function fireMessagingTelemetry(kind: MessagingTelemetryKind): void {
  if (typeof window === "undefined" || typeof fetch === "undefined") return;
  try {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    void fetch("/api/messages/telemetry", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
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
  /** Apelat când legătura SSE cade după ce a fost deschisă (ex.: pentru polling fallback). */
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
  let tokenWatch: ReturnType<typeof setInterval> | null = null;
  let stalenessWatch: ReturnType<typeof setInterval> | null = null;
  let sawOpen = false;
  let lastInboundDataAt = Date.now();
  let lastUrlToken: string | null = null;
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

    const token = typeof localStorage !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!token) {
      sawOpen = false;
      handlers.onTransportEnded?.();
      return;
    }

    lastUrlToken = token;
    sawOpen = false;

    let source: EventSource;
    try {
      source = new EventSource(`/api/messages/events?token=${encodeURIComponent(token)}`);
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
      // Înlocuim auto-reconnect-ul browserului (același ?token=)
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

  tokenWatch = setInterval(() => {
    if (disposed) return;
    const t = localStorage.getItem("accessToken");
    if (!t || t === lastUrlToken) return;
    lastUrlToken = t;
    backoffMs = INITIAL_BACKOFF_MS;
    clearReconnect();
    detachEventSource(es);
    es = null;
    sawOpen = false;
    openStream();
  }, TOKEN_WATCH_MS);

  return () => {
    disposed = true;
    clearReconnect();
    if (stalenessWatch) {
      clearInterval(stalenessWatch);
      stalenessWatch = null;
    }
    if (tokenWatch) {
      clearInterval(tokenWatch);
      tokenWatch = null;
    }
    detachEventSource(es);
    es = null;
    sawOpen = false;
  };
}

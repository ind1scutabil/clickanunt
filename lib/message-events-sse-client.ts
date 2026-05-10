/**
 * Client SSE pentru /api/messages/events: EventSource folosește ?token= (fără Authorization).
 * JWT access expiră (15m); reconectarea nativă a browserului repetă același URL → 401 în buclă.
 * Oprim acea reconectare, citim token-ul curent din localStorage și reconectăm cu backoff.
 * La rotație de token (refresh), închidem fluxul și deschidem unul nou.
 */

const TOKEN_WATCH_MS = 30_000;
const INITIAL_BACKOFF_MS = 1500;
const MAX_BACKOFF_MS = 45_000;

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
  let sawOpen = false;
  let lastUrlToken: string | null = null;
  let backoffMs = INITIAL_BACKOFF_MS;

  const clearReconnect = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const scheduleReconnect = () => {
    if (disposed) return;
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
      handlers.onOpen?.();
    };

    source.onmessage = handlers.onMessage;

    source.onerror = () => {
      if (disposed || es !== source) return;
      // Înlocuim auto-reconnect-ul browserului (același ?token=)
      detachEventSource(es);
      es = null;
      const wasLive = sawOpen;
      sawOpen = false;
      if (wasLive) {
        handlers.onTransportEnded?.();
      }
      scheduleReconnect();
    };
  };

  openStream();

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
    if (tokenWatch) {
      clearInterval(tokenWatch);
      tokenWatch = null;
    }
    detachEventSource(es);
    es = null;
    sawOpen = false;
  };
}

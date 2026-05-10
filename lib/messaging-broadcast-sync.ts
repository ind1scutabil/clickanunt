/**
 * Sincronizare badge unread / liste între taburi + în același tab (după mark-as-read în GET mesaje).
 */

export const MESSAGING_INBOX_SYNC_EVENT = "messaging:inbox-sync";

const CHANNEL = "clickanunt-messaging-inbox-v1";

export function subscribeMessagingInboxSync(onSync: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = () => {
    onSync();
  };

  window.addEventListener(MESSAGING_INBOX_SYNC_EVENT, handler);

  let bc: BroadcastChannel | null = null;
  try {
    if (typeof BroadcastChannel !== "undefined") {
      bc = new BroadcastChannel(CHANNEL);
      bc.onmessage = () => {
        onSync();
      };
    }
  } catch {
    bc = null;
  }

  return () => {
    window.removeEventListener(MESSAGING_INBOX_SYNC_EVENT, handler);
    if (bc) {
      bc.close();
      bc = null;
    }
  };
}

export function notifyMessagingInboxSync(): void {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new CustomEvent(MESSAGING_INBOX_SYNC_EVENT));

  try {
    if (typeof BroadcastChannel === "undefined") return;
    const bc = new BroadcastChannel(CHANNEL);
    bc.postMessage({ ping: Date.now() });
    bc.close();
  } catch {
    /* noop */
  }
}

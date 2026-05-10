/**
 * In-memory pub/sub pentru SSE (același proces Node).
 * La scale orizontal → Redis pub/sub; pentru un singur PM2 e suficient.
 *
 * Chei normalizate lowercase — evită ratări când JWT are alt casing decât id din Prisma.
 */

type Subscriber = (payload: Record<string, unknown>) => void;

const subscribers = new Map<string, Set<Subscriber>>();

function canonicalUserKey(userId: string): string {
  return (userId || "").trim().toLowerCase();
}

export function subscribeUser(userId: string, onEvent: Subscriber): () => void {
  const key = canonicalUserKey(userId);
  if (!key) {
    return () => {};
  }
  let set = subscribers.get(key);
  if (!set) {
    set = new Set();
    subscribers.set(key, set);
  }
  set.add(onEvent);
  return () => {
    set!.delete(onEvent);
    if (set!.size === 0) subscribers.delete(key);
  };
}

export function publishToUsers(userIds: string[], payload: Record<string, unknown>): void {
  const seen = new Set<string>();
  for (const id of userIds) {
    const key = canonicalUserKey(id);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const set = subscribers.get(key);
    if (!set) continue;
    for (const fn of set) {
      try {
        fn(payload);
      } catch {
        /* ignore */
      }
    }
  }
}

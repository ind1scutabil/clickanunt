/**
 * In-memory pub/sub pentru SSE (același proces Node).
 * La scale orizontal → Redis pub/sub; pentru un singur PM2 e suficient.
 */

type Subscriber = (payload: Record<string, unknown>) => void;

const subscribers = new Map<string, Set<Subscriber>>();

export function subscribeUser(userId: string, onEvent: Subscriber): () => void {
  let set = subscribers.get(userId);
  if (!set) {
    set = new Set();
    subscribers.set(userId, set);
  }
  set.add(onEvent);
  return () => {
    set!.delete(onEvent);
    if (set!.size === 0) subscribers.delete(userId);
  };
}

export function publishToUsers(userIds: string[], payload: Record<string, unknown>): void {
  const seen = new Set<string>();
  for (const id of userIds) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const set = subscribers.get(id);
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

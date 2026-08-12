/**
 * Pure concurrent-refresh single-flight helper (testable without SecureStore).
 * Mobile client wraps this with token persistence in tryMobileRefresh.
 */
export type RefreshRunner = () => Promise<{ ok: true; accessToken: string; refreshToken?: string } | { ok: false }>;

export function createRefreshSingleFlight(run: RefreshRunner): () => Promise<boolean> {
  let inFlight: Promise<boolean> | null = null;

  return async () => {
    if (inFlight) return inFlight;
    inFlight = (async () => {
      try {
        const result = await run();
        return result.ok;
      } catch {
        return false;
      }
    })();
    try {
      return await inFlight;
    } finally {
      inFlight = null;
    }
  };
}

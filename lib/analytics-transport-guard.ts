/**
 * First-party analytics transport guard.
 *
 * When consent is withdrawn, residual gtag/Clarity heaps may still call fetch/sendBeacon.
 * We install at most one wrapper pair and restore the native functions when analytics is allowed again.
 */

const ANALYTICS_HOST_SUFFIXES = [
  "google-analytics.com",
  "analytics.google.com",
  "googletagmanager.com",
  "clarity.ms",
] as const;

const ANALYTICS_EXACT_HOSTS = ["c.bing.com"] as const;

export type AnalyticsTransportWindow = {
  __caAnalyticsBlocked?: boolean;
  __caBeaconPatched?: boolean;
  __caOrigSendBeacon?: typeof navigator.sendBeacon;
  __caOrigFetch?: typeof fetch;
};

/** True if `hostname` is exactly `domain` or a subdomain of `domain` (never suffix-of-label). */
export function hostnameMatchesDomain(hostname: string, domain: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/\.$/, "");
  const d = domain.trim().toLowerCase().replace(/\.$/, "");
  if (!host || !d) return false;
  if (host === d) return true;
  return host.endsWith(`.${d}`);
}

/**
 * Whether a request URL targets an approved analytics destination.
 * Uses URL parsing + exact/subdomain hostname checks — not substring matching.
 */
export function isAnalyticsTransportUrl(urlLike: string): boolean {
  let hostname: string;
  try {
    // Absolute or relative — relative resolves against a dummy https base.
    const absolute = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(urlLike)
      ? urlLike
      : `https://example.invalid${urlLike.startsWith("/") ? "" : "/"}${urlLike}`;
    hostname = new URL(absolute).hostname.toLowerCase();
  } catch {
    return false;
  }
  if (!hostname) return false;

  for (const exact of ANALYTICS_EXACT_HOSTS) {
    // Exact host only (Clarity Bing endpoint) — not arbitrary *.bing.com.
    if (hostname === exact) return true;
  }
  for (const suffix of ANALYTICS_HOST_SUFFIXES) {
    if (hostnameMatchesDomain(hostname, suffix)) return true;
  }
  return false;
}

function resolveRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

/** Install fetch/sendBeacon wrappers at most once. Safe to call repeatedly. */
export function installAnalyticsTransportGuard(target: AnalyticsTransportWindow & Window): void {
  if (target.__caBeaconPatched) return;

  if (typeof target.navigator?.sendBeacon === "function") {
    const origBeacon = target.navigator.sendBeacon;
    target.__caOrigSendBeacon = origBeacon;
    target.navigator.sendBeacon = ((url: string | URL, data?: BodyInit | null) => {
      if (target.__caAnalyticsBlocked && isAnalyticsTransportUrl(String(url))) {
        return false;
      }
      return origBeacon.call(target.navigator, url, data);
    }) as typeof navigator.sendBeacon;
  }

  if (typeof target.fetch === "function") {
    const origFetch = target.fetch;
    target.__caOrigFetch = origFetch;
    target.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      const url = resolveRequestUrl(input);
      if (target.__caAnalyticsBlocked && isAnalyticsTransportUrl(url)) {
        if (typeof Response !== "undefined") {
          return Promise.resolve(new Response(null, { status: 204, statusText: "No Content" }));
        }
        return Promise.resolve({
          ok: true,
          status: 204,
          statusText: "No Content",
        } as unknown as Response);
      }
      return origFetch.call(target, input, init);
    }) as typeof fetch;
  }

  target.__caBeaconPatched = true;
}

/** Restore native fetch/sendBeacon. Idempotent. */
export function uninstallAnalyticsTransportGuard(target: AnalyticsTransportWindow & Window): void {
  if (!target.__caBeaconPatched) {
    target.__caAnalyticsBlocked = false;
    return;
  }
  try {
    if (target.__caOrigSendBeacon) {
      target.navigator.sendBeacon = target.__caOrigSendBeacon;
    }
    if (target.__caOrigFetch) {
      target.fetch = target.__caOrigFetch;
    }
  } finally {
    delete target.__caOrigSendBeacon;
    delete target.__caOrigFetch;
    target.__caBeaconPatched = false;
    target.__caAnalyticsBlocked = false;
  }
}

export function setAnalyticsTransportBlocked(
  target: AnalyticsTransportWindow & Window,
  blocked: boolean
): void {
  if (blocked) {
    installAnalyticsTransportGuard(target);
    target.__caAnalyticsBlocked = true;
  } else {
    // Restore natives so accepted analytics uses unmodified transports (no stacked wrappers).
    uninstallAnalyticsTransportGuard(target);
  }
}

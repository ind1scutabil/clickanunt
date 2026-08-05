/**
 * IndexNow client (Bing / Yandex / participating engines).
 * Does NOT claim Google uses IndexNow.
 * Fail-closed when INDEXNOW_KEY is unset; never blocks listing publish.
 */
import { siteOriginForSeoFeeds } from "@/lib/seo/site-url-guard";

export type IndexNowStatus =
  | "sent"
  | "accepted"
  | "rate_limited"
  | "failed"
  | "not_configured"
  | "skipped_ineligible";

export type IndexNowResult = {
  status: IndexNowStatus;
  urlCount: number;
  detail?: string;
  httpStatus?: number;
};

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
const MAX_BATCH = 100;
const TIMEOUT_MS = 8_000;

export function getIndexNowKey(): string | null {
  const key = process.env.INDEXNOW_KEY?.trim();
  return key && key.length >= 8 ? key : null;
}

export function indexNowKeyLocationUrl(): string | null {
  const key = getIndexNowKey();
  if (!key) return null;
  return `${siteOriginForSeoFeeds()}/indexnow-key.txt`;
}

function isBlockedPath(pathname: string): boolean {
  if (pathname.startsWith("/api/")) return true;
  if (pathname.startsWith("/admin")) return true;
  if (pathname.startsWith("/dashboard")) return true;
  if (pathname.startsWith("/auth")) return true;
  if (pathname.startsWith("/messages")) return true;
  if (pathname.startsWith("/favorites")) return true;
  if (pathname.includes("/edit")) return true;
  if (pathname.includes("/promote")) return true;
  if (pathname === "/listings/new") return true;
  return false;
}

/** Only absolute canonical https URLs on the configured host, no query strings. */
export function filterIndexNowUrls(urls: string[]): string[] {
  const origin = siteOriginForSeoFeeds();
  const host = new URL(origin).host;
  const out: string[] = [];
  const seen = new Set<string>();

  for (const raw of urls) {
    try {
      const u = new URL(raw);
      if (u.protocol !== "https:") continue;
      if (u.host !== host) continue;
      if (u.search || u.hash) continue;
      if (isBlockedPath(u.pathname)) continue;
      const href = u.pathname === "/" ? `${u.origin}/` : `${u.origin}${u.pathname}`;
      if (seen.has(href)) continue;
      seen.add(href);
      out.push(href);
    } catch {
      /* skip */
    }
  }
  return out;
}

export async function submitIndexNow(urls: string[]): Promise<IndexNowResult> {
  const key = getIndexNowKey();
  if (!key) {
    return { status: "not_configured", urlCount: 0, detail: "INDEXNOW_KEY missing" };
  }

  const list = filterIndexNowUrls(urls).slice(0, MAX_BATCH);
  if (list.length === 0) {
    return { status: "skipped_ineligible", urlCount: 0, detail: "No eligible URLs" };
  }

  const origin = siteOriginForSeoFeeds();
  const host = new URL(origin).host;
  const keyLocation = indexNowKeyLocationUrl()!;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host,
        key,
        keyLocation,
        urlList: list,
      }),
      signal: controller.signal,
    });
    if (res.status === 200 || res.status === 202) {
      return { status: "accepted", urlCount: list.length, httpStatus: res.status };
    }
    if (res.status === 429) {
      return { status: "rate_limited", urlCount: list.length, httpStatus: 429 };
    }
    return {
      status: "failed",
      urlCount: list.length,
      httpStatus: res.status,
      detail: `HTTP ${res.status}`,
    };
  } catch (e) {
    return {
      status: "failed",
      urlCount: list.length,
      detail: e instanceof Error ? e.name : "network_error",
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Fire-and-forget helper for publish hooks — never throws to callers. */
export function enqueueIndexNowSafe(urls: string[]): void {
  void submitIndexNow(urls).catch(() => {
    /* IndexNow must not break publish */
  });
}

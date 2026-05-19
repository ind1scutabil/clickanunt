import type { NextRequest } from "next/server";
import { createHash } from "crypto";
import { getClientIp } from "@/lib/rateLimit";

const HEADER = "x-analytics-session-id";

export function getAnalyticsSessionIdFromRequest(request: NextRequest): string | null {
  const raw = request.headers.get(HEADER)?.trim();
  if (!raw || raw.length > 128) return null;
  return raw;
}

export function hashIpForAnalytics(ip: string | null | undefined): string | null {
  if (!ip || ip === "unknown") return null;
  const salt = process.env.ANALYTICS_IP_HASH_SALT || "analytics-ip-salt-change-in-prod";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 64);
}

function trimHeader(value: string | null, maxLen: number): string | null {
  if (!value) return null;
  const t = value.trim();
  if (!t) return null;
  return t.length > maxLen ? t.slice(0, maxLen) : t;
}

export function buildAnalyticsContext(request: NextRequest | null | undefined): {
  sessionId: string | null;
  ipHash: string | null;
  referrer: string | null;
  userAgent: string | null;
} {
  if (!request) {
    return { sessionId: null, ipHash: null, referrer: null, userAgent: null };
  }
  return {
    sessionId: getAnalyticsSessionIdFromRequest(request),
    ipHash: hashIpForAnalytics(getClientIp(request)),
    referrer: trimHeader(request.headers.get("referer"), 512),
    userAgent: trimHeader(request.headers.get("user-agent"), 256),
  };
}

/** Merge request context into event metadata (non-destructive). */
export function analyticsContextMetadata(
  request: NextRequest | null | undefined,
  metadata?: Record<string, unknown> | null
): Record<string, unknown> | null {
  const ctx = buildAnalyticsContext(request);
  const base =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? { ...metadata }
      : {};
  if (ctx.referrer) base.referrer = ctx.referrer;
  if (ctx.userAgent) base.userAgent = ctx.userAgent;
  return Object.keys(base).length > 0 ? base : null;
}

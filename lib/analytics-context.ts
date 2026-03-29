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

export function buildAnalyticsContext(request: NextRequest | null | undefined): {
  sessionId: string | null;
  ipHash: string | null;
} {
  if (!request) return { sessionId: null, ipHash: null };
  return {
    sessionId: getAnalyticsSessionIdFromRequest(request),
    ipHash: hashIpForAnalytics(getClientIp(request)),
  };
}

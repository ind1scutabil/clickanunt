"use client";

const STORAGE_KEY = "clickanunt_analytics_session_id";

function randomId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Stable session id for analytics (persists across page views).
 */
export function getOrCreateAnalyticsSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = window.sessionStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = randomId();
      window.sessionStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return randomId();
  }
}

export function analyticsSessionHeaders(): Record<string, string> {
  const id = getOrCreateAnalyticsSessionId();
  return id ? { "x-analytics-session-id": id } : {};
}

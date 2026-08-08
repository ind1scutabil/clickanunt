"use client";

import { useEffect, useState } from "react";
import { getCsrfToken } from "@/lib/security/csrf-client";
import { analyticsSessionHeaders } from "@/lib/analytics-session-client";

/**
 * Coalesce React StrictMode double-invoke (and fast remounts) onto one in-flight POST
 * per listing id. Cleared after settle so a later revisit can POST again; server dedupe
 * still owns the authoritative +0/+1 decision.
 */
const inFlightViews = new Map<string, Promise<number | null>>();

async function postListingView(listingId: string): Promise<number | null> {
  try {
    const csrf = await getCsrfToken();
    const res = await fetch(`/api/listings/${listingId}/view`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(csrf ? { "x-csrf-token": csrf } : {}),
        ...analyticsSessionHeaders(),
      },
      credentials: "include",
      // Keepalive covers tab close / soft navigations without sendBeacon (no custom headers there).
      keepalive: true,
      body: "{}",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { views?: number };
    return typeof data.views === "number" ? data.views : null;
  } catch {
    /* non-blocking — a failed beacon must never break the page */
    return null;
  }
}

/**
 * Records one listing view per visit.
 *
 * The detail page is server-rendered, so no listing GET happens on a normal visit —
 * this beacon is the only signal that the page was actually viewed. It is deliberately
 * unaware of whether the page was hydrated from SSR data or fetched client-side, so an
 * SSR page can never silently skip counting.
 *
 * Uses `fetch` + explicit headers (CSRF, session id), not `navigator.sendBeacon`, so
 * session/CSRF guarantees stay intact. Returns the authoritative counter once the
 * server answers, or null before that. Dedupe, owner/bot exclusion and rate limiting
 * are enforced server-side — never optimistic client increments.
 */
export function useListingViewBeacon(listingId: string | null | undefined): number | null {
  const [views, setViews] = useState<number | null>(null);

  useEffect(() => {
    if (!listingId) return;
    setViews(null);

    let cancelled = false;

    let pending = inFlightViews.get(listingId);
    if (!pending) {
      pending = postListingView(listingId).finally(() => {
        // Drop after this turn so StrictMode's second effect still coalesces, while a
        // later navigation/revisit can issue a fresh POST (server may still dedupe).
        queueMicrotask(() => {
          if (inFlightViews.get(listingId) === pending) {
            inFlightViews.delete(listingId);
          }
        });
      });
      inFlightViews.set(listingId, pending);
    }

    void pending.then((value) => {
      if (!cancelled && value != null) {
        setViews(value);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [listingId]);

  return views;
}

"use client";

import { useEffect, useState } from "react";
import {
  COOKIE_CONSENT_STORAGE_KEY,
  clearFirstPartyAnalyticsCookies,
  parseStoredCookieConsent,
} from "@/lib/cookie-consent";
import { setAnalyticsTransportBlocked } from "@/lib/analytics-transport-guard";
import { GoogleAnalytics } from "./GoogleAnalytics";
import { MicrosoftClarity } from "./MicrosoftClarity";

type CaWindow = Window &
  import("@/lib/analytics-transport-guard").AnalyticsTransportWindow & {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    clarity?: (...args: unknown[]) => void;
  };

/**
 * Stop future beacons and clear first-party analytics cookies.
 * Limitation: third-party cookies set by Google/Clarity hosts cannot be deleted from first-party JS.
 */
export function disableAnalyticsBeacons(): void {
  try {
    const gaId = process.env.NEXT_PUBLIC_GA_ID?.trim();
    if (gaId) {
      (window as unknown as Record<string, unknown>)[`ga-disable-${gaId}`] = true;
    }
    const w = window as CaWindow;
    try {
      w.gtag = function noopGtag() {};
      w.dataLayer = [];
    } catch {
      /* ignore */
    }
    if (typeof w.clarity === "function") {
      w.clarity("consent", false);
    }
    setAnalyticsTransportBlocked(w, true);
    clearFirstPartyAnalyticsCookies(document.cookie, window.location.hostname);
    for (const el of Array.from(
      document.querySelectorAll(
        'script[src*="googletagmanager.com/gtag/js"], script#ga4-config, script#microsoft-clarity, script[src*="clarity.ms"]'
      )
    )) {
      el.remove();
    }
  } catch {
    /* ignore */
  }
}

/** Re-enable native transports when analytics consent is granted again in the same tab. */
export function enableAnalyticsTransports(): void {
  try {
    const gaId = process.env.NEXT_PUBLIC_GA_ID?.trim();
    if (gaId) {
      delete (window as unknown as Record<string, unknown>)[`ga-disable-${gaId}`];
    }
    setAnalyticsTransportBlocked(window as CaWindow, false);
  } catch {
    /* ignore */
  }
}

/**
 * Loads GA / Clarity only after hydrated client state shows analytics === true.
 * Renders nothing until hydration completes (avoids pre-consent script flash).
 */
export function ConditionalAnalytics() {
  const [analyticsOn, setAnalyticsOn] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let alive = true;
    const read = () => {
      if (!alive) return;
      try {
        const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
        const c = parseStoredCookieConsent(raw);
        const on = c?.analytics === true;
        if (!on) disableAnalyticsBeacons();
        else enableAnalyticsTransports();
        setAnalyticsOn(on);
      } catch {
        disableAnalyticsBeacons();
        setAnalyticsOn(false);
      }
      setMounted(true);
    };
    read();
    window.addEventListener("cookie-consent-updated", read);
    return () => {
      alive = false;
      window.removeEventListener("cookie-consent-updated", read);
    };
  }, []);

  if (!mounted || !analyticsOn) {
    return null;
  }

  return (
    <>
      <GoogleAnalytics />
      <MicrosoftClarity />
    </>
  );
}

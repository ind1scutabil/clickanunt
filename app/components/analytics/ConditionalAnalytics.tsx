"use client";

import { useEffect, useState } from "react";
import {
  COOKIE_CONSENT_STORAGE_KEY,
  parseStoredCookieConsent,
} from "@/lib/cookie-consent";
import { GoogleAnalytics } from "./GoogleAnalytics";
import { MicrosoftClarity } from "./MicrosoftClarity";

/**
 * Încarcă GA / Clarity doar după consimțământ „Analitice” (citire din localStorage + eveniment).
 */
export function ConditionalAnalytics() {
  const [analyticsOn, setAnalyticsOn] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
        const c = parseStoredCookieConsent(raw);
        setAnalyticsOn(Boolean(c?.analytics));
      } catch {
        setAnalyticsOn(false);
      }
      setMounted(true);
    };
    read();
    window.addEventListener("cookie-consent-updated", read);
    return () => window.removeEventListener("cookie-consent-updated", read);
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

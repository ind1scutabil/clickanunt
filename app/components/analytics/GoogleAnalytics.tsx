"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { isClickAnuntSiteHostname } from "@/lib/cookie-consent";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Google Analytics 4 — production only, opt-in via env, canonical host only.
 *
 * Mount only from `ConditionalAnalytics` after explicit analytics consent.
 * Scripts are absent until accept (no Consent Mode pre-load).
 *
 * The host check exists because NEXT_PUBLIC_GA_ID is the SAME real property
 * ID in every environment's .env.production, including a developer's local
 * checkout — `npm run build && next start` anywhere, on any host, would
 * otherwise send real hits to the live GA4 property. Only the canonical
 * clickanunt.ro / www.clickanunt.ro host (and subdomains) may load the tag;
 * localhost, IPs, and any other host stay silent regardless of consent.
 */
export function GoogleAnalytics() {
  const id = process.env.NEXT_PUBLIC_GA_ID?.trim();
  const pathname = usePathname();
  const lastPathRef = useRef<string | null>(null);
  // GoogleAnalytics only ever mounts client-side (ConditionalAnalytics gates
  // it behind a post-hydration consent check), so window is always present here.
  const isCanonicalHost = typeof window !== "undefined" && isClickAnuntSiteHostname(window.location.hostname);

  useEffect(() => {
    if (!id || !isCanonicalHost || process.env.NODE_ENV !== "production") return;
    try {
      delete (window as unknown as Record<string, unknown>)[`ga-disable-${id}`];
    } catch {
      /* ignore */
    }
    return () => {
      try {
        (window as unknown as Record<string, unknown>)[`ga-disable-${id}`] = true;
      } catch {
        /* ignore */
      }
      lastPathRef.current = null;
    };
  }, [id]);

  useEffect(() => {
    if (!id || !isCanonicalHost || process.env.NODE_ENV !== "production") return;

    const sendIfReady = (): boolean => {
      if (typeof window.gtag !== "function") return false;
      if (lastPathRef.current === pathname) return true;
      lastPathRef.current = pathname;
      window.gtag("event", "page_view", {
        page_path: pathname,
        page_location: window.location.href,
        page_title: document.title,
      });
      return true;
    };

    if (sendIfReady()) return;
    const timer = window.setInterval(() => {
      if (sendIfReady()) window.clearInterval(timer);
    }, 50);
    return () => window.clearInterval(timer);
  }, [id, pathname]);

  if (process.env.NODE_ENV !== "production" || !id || !isCanonicalHost) {
    return null;
  }

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="ga4-config" strategy="afterInteractive">
        {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('config', '${id}', { anonymize_ip: true, send_page_view: false });
`}
      </Script>
    </>
  );
}

"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Google Analytics 4 — production only, opt-in via env.
 *
 * Mount only from `ConditionalAnalytics` after explicit analytics consent.
 * Scripts are absent until accept (no Consent Mode pre-load).
 */
export function GoogleAnalytics() {
  const id = process.env.NEXT_PUBLIC_GA_ID?.trim();
  const pathname = usePathname();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!id || process.env.NODE_ENV !== "production") return;
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
    if (!id || process.env.NODE_ENV !== "production") return;

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

  if (process.env.NODE_ENV !== "production" || !id) {
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

"use client";

import Script from "next/script";
import { useEffect } from "react";
import { isClickAnuntSiteHostname } from "@/lib/cookie-consent";

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
  }
}

/**
 * Microsoft Clarity — production only, opt-in via env, canonical host only.
 *
 * Mount only from `ConditionalAnalytics` after explicit analytics consent.
 * On unmount (consent withdrawn): call official `clarity('consent', false)` which
 * clears Clarity cookies it controls and stops cookie-based tracking until consent
 * is granted again. First-party `_cl*` names are also cleared from document.cookie.
 * Limitation: third-party cookies on clarity.ms / bing hosts cannot be deleted from
 * first-party JavaScript.
 *
 * Host check: same reasoning as GoogleAnalytics.tsx — NEXT_PUBLIC_CLARITY_ID is the
 * same real ID in every .env.production, so a local/test production build must not
 * be able to fire it either.
 */
export function MicrosoftClarity() {
  const id = process.env.NEXT_PUBLIC_CLARITY_ID?.trim();
  // MicrosoftClarity only ever mounts client-side (same ConditionalAnalytics gate
  // as GoogleAnalytics), so window is always present here.
  const isCanonicalHost = typeof window !== "undefined" && isClickAnuntSiteHostname(window.location.hostname);

  useEffect(() => {
    if (!id || !isCanonicalHost || process.env.NODE_ENV !== "production") return;
    return () => {
      try {
        if (typeof window.clarity === "function") {
          window.clarity("consent", false);
        }
      } catch {
        /* ignore */
      }
    };
  }, [id]);

  if (process.env.NODE_ENV !== "production" || !id || !isCanonicalHost) {
    return null;
  }

  return (
    <Script id="microsoft-clarity" strategy="afterInteractive">
      {`
(function(c,l,a,r,i,t,y){
  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "${id}");
`}
    </Script>
  );
}

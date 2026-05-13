"use client";

import Script from "next/script";

/**
 * Google Analytics 4 — production only, opt-in via env.
 *
 * Set in production `.env` / hosting:
 *   NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
 *
 * Montat exclusiv din `ConditionalAnalytics` după consimțământ „Analitice” în bannerul intern.
 * `anonymize_ip` este activ ca setare implicită orientată spre confidențialitate.
 */
export function GoogleAnalytics() {
  const id = process.env.NEXT_PUBLIC_GA_ID?.trim();
  /** Parentul `ConditionalAnalytics` montează această componentă doar după consimțământ analitic. */
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
gtag('js', new Date());
gtag('config', '${id}', { anonymize_ip: true });
`}
      </Script>
    </>
  );
}

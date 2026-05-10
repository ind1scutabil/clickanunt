"use client";

import Script from "next/script";

/**
 * Google Analytics 4 — production only, opt-in via env.
 *
 * Set in production `.env` / hosting:
 *   NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
 *
 * GDPR / consent: this component loads gtag when the env var is present.
 * Wire your CMP / consent banner to call `gtag('consent', 'update', …)` before
 * or after load as required by your legal review. `anonymize_ip` is enabled
 * as a baseline privacy-oriented default.
 */
export function GoogleAnalytics() {
  const id = process.env.NEXT_PUBLIC_GA_ID?.trim();
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

"use client";

import { useCookieConsent } from "./cookie-consent-context";

/** Permanent entry point on /cookies to reopen preferences (requires CookieConsentProvider). */
export function CookiesPageSettingsButton({ className }: { className?: string }) {
  const { openSettings } = useCookieConsent();
  return (
    <button type="button" onClick={() => openSettings()} className={className}>
      Deschide preferințele cookie
    </button>
  );
}

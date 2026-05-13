"use client";

import { useCookieConsent } from "./cookie-consent-context";

export function FooterCookieSettingsLink({ className }: { className?: string }) {
  const { openSettings } = useCookieConsent();
  return (
    <button type="button" onClick={() => openSettings()} className={className}>
      Setări cookie
    </button>
  );
}

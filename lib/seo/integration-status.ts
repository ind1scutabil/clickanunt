/**
 * Canonical status vocabulary for SEO / discovery integrations.
 * Never claim "OK" when credentials or providers are missing.
 */
export type SeoIntegrationStatus =
  | "OK"
  | "WARNING"
  | "ERROR"
  | "NOT_CONFIGURED"
  | "PROVIDER_UNCONFIRMED"
  | "MANUAL_ACTION_REQUIRED"
  | "IMPLEMENTED_UNCONFIGURED"
  | "MOCK_OUTBOX"
  | "BLOCKED_BY_CREDENTIALS"
  | "OUT_OF_SCOPE";

export type SeoIntegrationReport = {
  id: string;
  label: string;
  status: SeoIntegrationStatus;
  detail: string;
  configured: boolean;
};

export function searchConsoleConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL?.trim() &&
      process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY?.trim() &&
      process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL?.trim()
  );
}

export function indexNowConfigured(): boolean {
  return Boolean(process.env.INDEXNOW_KEY?.trim());
}

export function ga4Configured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_GA_ID?.trim());
}

export function googleSiteVerificationConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SITE_VERIFICATION?.trim() ||
      process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim()
  );
}

export function bingSiteVerificationConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION?.trim());
}

export function smtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim()
  );
}

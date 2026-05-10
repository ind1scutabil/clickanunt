import { siteOrigin } from '@/lib/site-url';

/**
 * In production builds, warns when canonical env is absent (canonicals fall back safely).
 * See SEO_FINAL_DEPLOYMENT_CHECKLIST.md — set NEXT_PUBLIC_SITE_URL.
 */
export function warnIfProductionSiteUrlMissing(): void {
  if (process.env.NODE_ENV !== 'production') return;
  const explicit =
    Boolean(process.env.NEXT_PUBLIC_SITE_URL?.trim()) || Boolean(process.env.NEXT_PUBLIC_APP_URL?.trim());
  if (!explicit) {
    console.warn(
      '[clickanunt][seo] NEXT_PUBLIC_SITE_URL is not set — using fallback https://www.clickanunt.ro for canonical/sitemap/graph. Set NEXT_PUBLIC_SITE_URL=https://www.clickanunt.ro in production.',
    );
  }
}

/** Safe origin for cron/sitemap/route handlers — logs once per process in prod builds. */
let warned = false;
export function siteOriginForSeoFeeds(): string {
  if (!warned && process.env.NODE_ENV === 'production') {
    warned = true;
    warnIfProductionSiteUrlMissing();
  }
  return siteOrigin();
}

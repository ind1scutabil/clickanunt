/**
 * Aggregated SEO health for admin dashboard — no secrets in payload.
 */
import { prisma } from "@/lib/prisma";
import { seoIndexableListingWhere } from "@/lib/seo/indexable-listing-where";
import {
  type SeoIntegrationReport,
  bingSiteVerificationConfigured,
  ga4Configured,
  googleSiteVerificationConfigured,
  indexNowConfigured,
  searchConsoleConfigured,
  smtpConfigured,
} from "@/lib/seo/integration-status";
import { LISTING_SITEMAP_CHUNK_SIZE } from "@/lib/seo/sitemap-constants";
import { siteOriginForSeoFeeds } from "@/lib/seo/site-url-guard";
import { emptySearchConsoleDashboardPayload } from "@/lib/seo/search-console-client";

export async function buildSeoAdminStatus() {
  const origin = siteOriginForSeoFeeds();
  let indexableListings = 0;
  let dbOk = true;
  try {
    if (process.env.USE_IN_MEMORY_DB !== "true") {
      indexableListings = await prisma.listing.count({
        where: seoIndexableListingWhere(),
      });
    }
  } catch {
    dbOk = false;
  }

  const listingChunks = Math.max(1, Math.ceil(indexableListings / LISTING_SITEMAP_CHUNK_SIZE));

  const integrations: SeoIntegrationReport[] = [
    {
      id: "canonical_origin",
      label: "Canonical origin",
      status: origin.includes("www.clickanunt.ro") ? "OK" : "WARNING",
      configured: true,
      detail: origin,
    },
    {
      id: "google_site_verification",
      label: "Google site verification meta",
      status: googleSiteVerificationConfigured() ? "OK" : "NOT_CONFIGURED",
      configured: googleSiteVerificationConfigured(),
      detail: googleSiteVerificationConfigured()
        ? "Verification env present"
        : "GOOGLE_SITE_VERIFICATION / NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION missing",
    },
    {
      id: "search_console_api",
      label: "Search Console API",
      status: searchConsoleConfigured() ? "MANUAL_ACTION_REQUIRED" : "NOT_CONFIGURED",
      configured: searchConsoleConfigured(),
      detail: searchConsoleConfigured()
        ? "Credentials named — live API enablement pending owner approval"
        : "Service account not configured",
    },
    {
      id: "ga4",
      label: "Google Analytics 4",
      status: ga4Configured() ? "OK" : "NOT_CONFIGURED",
      configured: ga4Configured(),
      detail: ga4Configured()
        ? "NEXT_PUBLIC_GA_ID set (consent-gated)"
        : "NEXT_PUBLIC_GA_ID missing",
    },
    {
      id: "bing_verification",
      label: "Bing Webmaster verification",
      status: bingSiteVerificationConfigured() ? "OK" : "NOT_CONFIGURED",
      configured: bingSiteVerificationConfigured(),
      detail: bingSiteVerificationConfigured()
        ? "NEXT_PUBLIC_BING_SITE_VERIFICATION set"
        : "Bing meta verification not configured",
    },
    {
      id: "indexnow",
      label: "IndexNow",
      status: indexNowConfigured() ? "OK" : "NOT_CONFIGURED",
      configured: indexNowConfigured(),
      detail: indexNowConfigured()
        ? "INDEXNOW_KEY set — submit on eligible publish events (Bing/Yandex; not Google)"
        : "INDEXNOW_KEY missing — client is fail-closed",
    },
    {
      id: "smtp_alerts",
      label: "SMTP (saved-search email)",
      status: smtpConfigured() ? "PROVIDER_UNCONFIRMED" : "NOT_CONFIGURED",
      configured: smtpConfigured(),
      detail: smtpConfigured()
        ? "SMTP env present — delivery not verified in this phase"
        : "SMTP incomplete — email alerts cannot be claimed",
    },
    {
      id: "merchant_center",
      label: "Google Merchant Center",
      status: "OUT_OF_SCOPE",
      configured: false,
      detail: "Feasibility only — no live feed in FAZA 21",
    },
    {
      id: "google_indexing_api",
      label: "Google Indexing API",
      status: "OUT_OF_SCOPE",
      configured: false,
      detail: "Not enabled — requires eligibility review and approval",
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    dbOk,
    origin,
    sitemaps: {
      index: `${origin}/sitemap.xml`,
      categories: `${origin}/sitemap-categories.xml`,
      cities: `${origin}/sitemap-cities.xml`,
      listingsIndex: `${origin}/sitemap-listings.xml`,
      autoHubs: `${origin}/sitemap-auto-hubs.xml`,
      imagesIndex: `${origin}/sitemap-images.xml`,
      listingChunkSize: LISTING_SITEMAP_CHUNK_SIZE,
      indexableListings,
      estimatedListingChunks: listingChunks,
    },
    robots: {
      path: `${origin}/robots.txt`,
      note: "Public edge may wrap robots via Cloudflare Content-Signals; origin Next robots remains authoritative for Allow/Sitemap.",
    },
    integrations,
    searchConsole: emptySearchConsoleDashboardPayload(),
    notes: [
      "Structured data does not guarantee rich results.",
      "IndexNow is not a Google protocol.",
      "No demo Search Console metrics are shown.",
    ],
  };
}

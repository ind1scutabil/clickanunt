/**
 * SEO utilities — metadata builders, structured data helpers, legacy XML generators.
 */

import type { Metadata } from 'next';
import { isCompanyLegalDetailsPublic } from '@/lib/company-config';
import { absoluteUrl, siteOrigin } from '@/lib/site-url';
import {
  buildOrganizationJsonLd,
  buildWebSiteJsonLd,
} from '@/lib/seo/site-jsonld';
import { buildBreadcrumbJsonLd } from '@/lib/seo/breadcrumb-jsonld';
import { buildItemListJsonLd } from '@/lib/seo/collection-jsonld';
import { buildFaqPageJsonLd } from '@/lib/seo/faq-jsonld';

export interface PageSEOConfig {
  title: string;
  description: string;
  keywords?: string[];
  /** Path only, e.g. "/auto/bucuresti" — combined with site origin for canonical. */
  canonicalPath?: string;
  /** Full canonical URL override (must be absolute if set). */
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'product';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  noindex?: boolean;
  nofollow?: boolean;
}

/**
 * Centralized Next.js `Metadata` factory (App Router).
 * Title is suffixed with «| ClickAnunț» when the brand is not already present.
 */
export function createPageMetadata(config: PageSEOConfig): Metadata {
  const {
    title,
    description,
    keywords = [],
    canonicalPath = '/',
    canonicalUrl,
    ogImage = '/images/og-default.jpg',
    ogType = 'website',
    author,
    publishedTime,
    modifiedTime,
    noindex = false,
    nofollow = false,
  } = config;

  const origin = siteOrigin();
  const path = canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`;
  const canonical = canonicalUrl ?? absoluteUrl(path === '//' ? '/' : path);

  const hasBrand = title.includes('ClickAnunț') || title.includes('ClickAnunt');
  const fullTitle = hasBrand ? title : `${title} | ClickAnunț`;

  const ogImageAbs = ogImage.startsWith('http') ? ogImage : absoluteUrl(ogImage.startsWith('/') ? ogImage : `/${ogImage}`);
  const openGraphType: 'website' | 'article' = ogType === 'article' ? 'article' : 'website';

  return {
    title: fullTitle,
    description,
    ...(keywords.length ? { keywords } : {}),
    authors: author ? [{ name: author }] : [{ name: 'ClickAnunț' }],
    robots: {
      index: !noindex,
      follow: !(noindex || nofollow),
      googleBot: { index: !noindex, follow: !(noindex || nofollow) },
    },
    alternates: { canonical },
    openGraph: {
      type: openGraphType,
      locale: 'ro_RO',
      url: canonical,
      title: fullTitle,
      description,
      siteName: 'ClickAnunț',
      images: [
        {
          url: ogImageAbs,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      ...(publishedTime ? { publishedTime } : {}),
      ...(modifiedTime ? { modifiedTime } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      site: '@clickanunt',
      creator: '@clickanunt',
      title: fullTitle,
      description,
      images: [ogImageAbs],
    },
  };
}

/** @deprecated Prefer `createPageMetadata` — old name avoided confusion with Next.js `generateMetadata`. */
export function generateMetadataLegacy(config: PageSEOConfig): Metadata {
  return createPageMetadata(config);
}

/** WebSite graph with SiteSearch → `/listings` (`q` matches `searchListingsSchema`). */
export function generateWebSiteSearchStructuredData() {
  return buildWebSiteJsonLd();
}

/** JSON-LD for marketplace listing (classified-style Product + Offer). */
export function generateListingStructuredData(listing: {
  id: string;
  title: string;
  description?: string;
  priceAmount: number;
  priceCurrency: string;
  photos?: string[];
  make?: string;
  model?: string;
  year?: number;
  mileage?: number;
  fuel?: string;
  transmission?: string;
  createdAt: string;
  updatedAt?: string;
}) {
  const siteUrl = siteOrigin();

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${siteUrl}/listings/${listing.id}`,
    name: listing.title,
    description: listing.description || listing.title,
    url: `${siteUrl}/listings/${listing.id}`,
    image:
      listing.photos?.map((photo) => (photo.startsWith('http') ? photo : `${siteUrl}${photo}`)) || [],
    offers: {
      '@type': 'Offer',
      price: listing.priceAmount,
      priceCurrency: listing.priceCurrency,
      availability: 'https://schema.org/InStock',
      url: `${siteUrl}/listings/${listing.id}`,
    },
    brand: listing.make
      ? {
          '@type': 'Brand',
          name: listing.make,
        }
      : undefined,
    model: listing.model,
    productionDate: listing.year?.toString(),
    mileageFromOdometer: listing.mileage
      ? {
          '@type': 'QuantitativeValue',
          value: listing.mileage,
          unitCode: 'KMT',
        }
      : undefined,
    fuelType: listing.fuel,
    vehicleTransmission: listing.transmission,
    datePublished: listing.createdAt,
    dateModified: listing.updatedAt || listing.createdAt,
  };
}

function publicCompanyPhoneForSchema(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_COMPANY_PHONE?.trim();
  return raw || undefined;
}

export function generateOrganizationStructuredData() {
  return buildOrganizationJsonLd();
}

export function generateBreadcrumbStructuredData(items: Array<{ name: string; url: string }>) {
  return buildBreadcrumbJsonLd(items);
}

/** ItemList grid / hub preview for JSON-LD (safe when items.length ≥ 1). */
export function generateItemListStructuredData(opts: {
  name: string;
  description?: string;
  canonicalUrlAbs: string;
  items: Array<{ title: string; path: string }>;
}) {
  return buildItemListJsonLd(opts);
}

/** FAQPage JSON-LD for hub pages (one script block; do not duplicate per question). */
export function generateFaqPageStructuredData(items: Array<{ question: string; answer: string }>) {
  return buildFaqPageJsonLd(items);
}

export function generateLocalBusinessStructuredData() {
  const siteUrl = siteOrigin();
  const showLegal = isCompanyLegalDetailsPublic();
  const companyPhone = publicCompanyPhoneForSchema();

  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': siteUrl,
    name: 'ClickAnunț',
    image: `${siteUrl}/images/logo.png`,
    url: siteUrl,
    ...(showLegal
      ? {
          ...(companyPhone ? { telephone: companyPhone } : {}),
          address: {
            '@type': 'PostalAddress',
            addressCountry: 'RO',
            addressLocality: 'București',
          },
          geo: {
            '@type': 'GeoCoordinates',
            latitude: 44.4268,
            longitude: 26.1025,
          },
        }
      : {}),
    email: 'contact@clickanunt.ro',
    priceRange: 'Gratuit',
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '09:00',
        closes: '18:00',
      },
    ],
  };
}

export function generateStructuredDataScripts(data: object | object[]): string {
  const dataArray = Array.isArray(data) ? data : [data];

  return dataArray
    .map((item) => `<script type="application/ld+json">${JSON.stringify(item, null, 0)}</script>`)
    .join('\n');
}

export interface SitemapEntry {
  url: string;
  lastModified?: Date;
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

export function generateSitemapXML(entries: SitemapEntry[]): string {
  const siteUrl = siteOrigin();

  const urls = entries
    .map((entry) => {
      const url = entry.url.startsWith('http') ? entry.url : `${siteUrl}${entry.url}`;
      const lastmod = entry.lastModified ? entry.lastModified.toISOString().split('T')[0] : '';

      return `
  <url>
    <loc>${escapeXml(url)}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}
    ${entry.changeFrequency ? `<changefreq>${entry.changeFrequency}</changefreq>` : ''}
    ${entry.priority !== undefined ? `<priority>${entry.priority}</priority>` : ''}
  </url>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function generateSitemapIndexXml(locations: string[]): string {
  const items = locations
    .map(
      (loc) => `
  <sitemap>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </sitemap>`
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items}
</sitemapindex>`;
}

export function generateRobotsTxt(options: {
  disallow?: string[];
  allow?: string[];
  sitemap?: string | string[];
} = {}): string {
  const siteUrl = siteOrigin();
  const {
    disallow = ['/api/', '/admin/', '/dashboard/'],
    allow = ['/'],
    sitemap = [`${siteUrl}/sitemap.xml`],
  } = options;

  const disallowRules = disallow.map((path) => `Disallow: ${path}`).join('\n');
  const allowRules = allow.map((path) => `Allow: ${path}`).join('\n');
  const sm = Array.isArray(sitemap) ? sitemap : [sitemap];
  const smBlock = sm.map((s) => `Sitemap: ${s}`).join('\n');

  return `User-agent: *
${allowRules}
${disallowRules}

${smBlock}`;
}

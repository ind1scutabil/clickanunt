/**
 * Global site-level JSON-LD entities: Organization, WebSite, SearchAction.
 *
 * Single source of truth — `lib/seo.ts` delegates here for back-compat and
 * `GlobalJsonLd` renders the output exactly once in the root layout, so no
 * duplicate Organization/WebSite blocks are ever emitted.
 *
 * Strictly factual: no fabricated aggregateRating, reviews, founders, fake
 * addresses or statistics. Optional fields (phone/address) are emitted only
 * when the company legal details are explicitly marked public in config.
 */

import { isCompanyLegalDetailsPublic } from '@/lib/company-config';
import { getVerifiedBrandSameAsUrls } from '@/lib/brand-social-urls';
import { siteOrigin } from '@/lib/site-url';

export interface SearchActionJsonLd {
  '@type': 'SearchAction';
  target: string;
  'query-input': string;
}

export interface WebSiteJsonLd {
  '@context': 'https://schema.org';
  '@type': 'WebSite';
  '@id': string;
  name: string;
  alternateName: string[];
  url: string;
  publisher: { '@id': string };
  potentialAction: SearchActionJsonLd;
}

/** ASCII / domain aliases people (and Google) type for the brand — no invented entities. */
export const BRAND_ALTERNATE_NAMES = [
  'ClickAnunt',
  'clickanunt',
  'ClickAnunț.ro',
  'ClickAnunt.ro',
  'clickanunt.ro',
] as const;

function publicCompanyPhoneForSchema(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_COMPANY_PHONE?.trim();
  return raw || undefined;
}

/**
 * SearchAction matching the real on-site search endpoint (`/listings?q=`),
 * which is consumed by `searchListingsSchema`.
 */
export function buildSearchActionJsonLd(): SearchActionJsonLd {
  const origin = siteOrigin();
  return {
    '@type': 'SearchAction',
    target: `${origin}/listings?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  };
}

/** WebSite entity with the on-site SearchAction, linked to Organization. */
export function buildWebSiteJsonLd(): WebSiteJsonLd {
  const siteUrl = siteOrigin();
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteUrl}/#website`,
    name: 'ClickAnunț',
    alternateName: [...BRAND_ALTERNATE_NAMES],
    url: siteUrl,
    publisher: { '@id': `${siteUrl}/#organization` },
    potentialAction: buildSearchActionJsonLd(),
  };
}

/**
 * Organization entity. Phone + PostalAddress are conditional on
 * `isCompanyLegalDetailsPublic()`; nothing fabricated.
 */
export function buildOrganizationJsonLd() {
  const siteUrl = siteOrigin();
  const showLegal = isCompanyLegalDetailsPublic();
  const companyPhone = publicCompanyPhoneForSchema();
  const sameAs = getVerifiedBrandSameAsUrls();
  const logoUrl = `${siteUrl}/brand/clickanunt-logo.png`;

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${siteUrl}/#organization`,
    name: 'ClickAnunț',
    alternateName: [...BRAND_ALTERNATE_NAMES],
    url: `${siteUrl}/`,
    logo: {
      '@type': 'ImageObject',
      url: logoUrl,
      contentUrl: logoUrl,
      width: 1254,
      height: 1254,
    },
    description:
      'ClickAnunț (clickanunt.ro) este platforma de anunțuri gratuite din România — auto, imobiliare, electronice, locuri de muncă și servicii.',
    contactPoint: {
      '@type': 'ContactPoint',
      ...(showLegal && companyPhone ? { telephone: companyPhone } : {}),
      contactType: 'customer service',
      email: 'contact@clickanunt.ro',
      availableLanguage: ['Romanian'],
    },
    ...(sameAs.length > 0 ? { sameAs } : {}),
    ...(showLegal
      ? {
          address: {
            '@type': 'PostalAddress',
            addressCountry: 'RO',
            addressLocality: 'București',
          },
        }
      : {}),
  };
}

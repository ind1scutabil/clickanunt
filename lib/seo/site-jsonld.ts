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
  name: string;
  url: string;
  potentialAction: SearchActionJsonLd;
}

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

/** WebSite entity with the on-site SearchAction. */
export function buildWebSiteJsonLd(): WebSiteJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'ClickAnunț',
    url: siteOrigin(),
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

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'ClickAnunț',
    url: siteUrl,
    logo: `${siteUrl}/images/logo.png`,
    description: 'Platforma de anunțuri gratuite din România',
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

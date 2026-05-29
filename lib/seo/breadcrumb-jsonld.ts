/**
 * BreadcrumbList JSON-LD. Items are resolved to absolute URLs and emitted in
 * the same order they are passed (position is 1-based). Must mirror the
 * visible breadcrumb trail on the page.
 *
 * Single source of truth — `lib/seo.ts#generateBreadcrumbStructuredData`
 * delegates here for back-compat.
 */

import { siteOrigin } from '@/lib/site-url';

export interface BreadcrumbJsonLdItem {
  name: string;
  /** Absolute URL or site-relative path beginning with "/". */
  url: string;
}

export function buildBreadcrumbJsonLd(items: BreadcrumbJsonLdItem[]) {
  const origin = siteOrigin();
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${origin}${item.url}`,
    })),
  };
}

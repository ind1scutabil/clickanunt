/**
 * CollectionPage / CategoryPage / ItemList JSON-LD for listing index, search,
 * category, subcategory and city hub pages.
 *
 * Factual-only: `ItemList` includes exactly the real listings loaded/shown on
 * the page; `numberOfItems` equals that count. Never emits fabricated counts,
 * prices or availability. Callers omit these blocks entirely for empty/thin
 * pages (preserving existing noindex behavior).
 *
 * Note on `@type`: schema.org has no standalone "CategoryPage" type, so the
 * category/subcategory/city builder emits a valid `CollectionPage` enriched
 * with `about` Thing entities (factual labels only).
 */

import { absoluteUrl } from '@/lib/site-url';

export interface ItemListEntry {
  title: string;
  /** Site-relative path beginning with "/" or absolute URL. */
  path: string;
}

export interface ItemListJsonLdOptions {
  name: string;
  description?: string;
  /** Absolute canonical URL of the collection page. */
  canonicalUrlAbs: string;
  items: ItemListEntry[];
}

/**
 * ItemList entity. Pass `includeContext: false` when nesting inside a
 * CollectionPage (the parent carries the single top-level `@context`).
 */
export function buildItemListJsonLd(opts: ItemListJsonLdOptions, includeContext = true) {
  return {
    ...(includeContext ? { '@context': 'https://schema.org' } : {}),
    '@type': 'ItemList',
    name: opts.name,
    ...(opts.description ? { description: opts.description } : {}),
    url: opts.canonicalUrlAbs,
    numberOfItems: opts.items.length,
    itemListElement: opts.items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.title,
      item: absoluteUrl(it.path.startsWith('/') ? it.path : `/${it.path}`),
    })),
  };
}

export interface CollectionPageJsonLdOptions {
  name: string;
  description?: string;
  /** Absolute canonical URL of the page. */
  canonicalUrlAbs: string;
  items: ItemListEntry[];
}

/**
 * Generic CollectionPage for listing index / search collections. Nests the
 * factual ItemList as `mainEntity` (only when there are real items).
 */
export function buildCollectionPageJsonLd(opts: CollectionPageJsonLdOptions) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: opts.name,
    ...(opts.description ? { description: opts.description } : {}),
    url: opts.canonicalUrlAbs,
    ...(opts.items.length > 0
      ? {
          mainEntity: buildItemListJsonLd(
            {
              name: opts.name,
              description: opts.description,
              canonicalUrlAbs: opts.canonicalUrlAbs,
              items: opts.items,
            },
            false,
          ),
        }
      : {}),
  };
}

export interface CategoryPageJsonLdOptions extends CollectionPageJsonLdOptions {
  /** Factual entity labels this page is about (category, subcategory, city). */
  about?: string[];
}

/**
 * CollectionPage specialised for a real category / subcategory / city hub.
 * `about` carries the factual entity labels (no fabricated descriptors).
 */
export function buildCategoryPageJsonLd(opts: CategoryPageJsonLdOptions) {
  const about = (opts.about ?? []).filter((a) => typeof a === 'string' && a.trim().length > 0);
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: opts.name,
    ...(opts.description ? { description: opts.description } : {}),
    url: opts.canonicalUrlAbs,
    ...(about.length > 0
      ? { about: about.map((name) => ({ '@type': 'Thing', name })) }
      : {}),
    ...(opts.items.length > 0
      ? {
          mainEntity: buildItemListJsonLd(
            {
              name: opts.name,
              description: opts.description,
              canonicalUrlAbs: opts.canonicalUrlAbs,
              items: opts.items,
            },
            false,
          ),
        }
      : {}),
  };
}

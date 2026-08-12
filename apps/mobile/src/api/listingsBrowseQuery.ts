export type ListingsFeedParams = {
  page?: number;
  limit?: number;
  status?: string;
  /** Exact category string from GET /api/categories (DB). */
  category?: string;
  /** Subcategory label from taxonomy (same as web ListingsView). */
  subcategory?: string;
  /** Min 2 chars — same FTS pipeline as web `GET /api/listings?q=` */
  q?: string;
  sort?: 'newest' | 'priceAsc' | 'priceDesc' | 'featured';
  /** Same query params as web ListingsView / GET /api/listings */
  county?: string;
  city?: string;
  make?: string;
  model?: string;
};

/** Pure — safe for Jest without React Native modules. */
export function listingsBrowseQueryString(params: ListingsFeedParams = {}): string {
  const sp = new URLSearchParams();
  sp.set('status', params.status ?? 'active');
  sp.set('limit', String(params.limit ?? 24));
  sp.set('page', String(params.page ?? 1));
  sp.set('sort', params.sort ?? 'newest');
  if (params.category) {
    sp.set('category', params.category);
  }
  if (params.subcategory?.trim()) {
    sp.set('subcategory', params.subcategory.trim());
  }
  if (params.q && params.q.trim().length >= 2) {
    sp.set('q', params.q.trim());
  }
  if (params.county?.trim()) {
    sp.set('county', params.county.trim());
  }
  if (params.city?.trim()) {
    sp.set('city', params.city.trim());
  }
  if (params.make?.trim()) {
    sp.set('make', params.make.trim());
  }
  if (params.model?.trim()) {
    sp.set('model', params.model.trim());
  }
  return sp.toString();
}

/** Append page results without duplicating ids already present. */
export function mergeListingsByIdUnique<T extends { id: string }>(
  previous: T[],
  incoming: T[]
): T[] {
  if (!incoming.length) return previous;
  const seen = new Set(previous.map((item) => item.id));
  const next = [...previous];
  for (const item of incoming) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    next.push(item);
  }
  return next;
}

/** Parse browse envelope `hasMore` (top-level or pagination.hasMore). */
export function parseListingsHasMore(data: {
  hasMore?: boolean;
  pagination?: { hasMore?: boolean };
}): boolean {
  if (typeof data.hasMore === 'boolean') return data.hasMore;
  return Boolean(data.pagination?.hasMore);
}

/** Normalize browse API envelope → hasMore (top-level or pagination.hasMore). */
export function parseListingsFeedHasMore(data: {
  hasMore?: boolean;
  pagination?: { hasMore?: boolean } | null;
}): boolean {
  if (typeof data.hasMore === 'boolean') return data.hasMore;
  return Boolean(data.pagination?.hasMore);
}

/** When filters change, next load must start at page 1 (caller resets list). */
export function nextBrowsePageAfterFilterChange(): 1 {
  return 1;
}

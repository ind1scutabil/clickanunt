/**
 * Cross-cutting JSON types for API responses (serialized from Prisma/Date → ISO strings).
 */

/** ISO-8601 datetime string as returned in JSON (NextResponse.json). */
export type IsoDateTimeString = string;

/** ISO-8601 date-only string where APIs return calendar dates. */
export type IsoDateString = string;

/**
 * Standard money fields on listings (DB: Int + currency code).
 */
export type PriceFields = {
  priceAmount: number;
  priceCurrency: string;
};

/**
 * Listing photos: absolute/relative URLs or blob: for previews; normalized on read for many routes.
 */
export type ListingPhotosJson = string[];

/** Cursor pagination for GET /api/listings (see lib/pagination `buildPagination`). */
export type ListingsCursorPagination = {
  hasMore: boolean;
  nextCursor: string | null;
  prevCursor: string | null;
  count: number;
};

/** Offset-style pagination for GET /api/search. */
export type SearchOffsetPagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

/**
 * Common error JSON bodies ({ error: string, ... }).
 * Routes may add domain-specific keys (e.g. login lockout).
 */
export type ApiErrorBody = {
  error: string;
  details?: string;
  locked?: boolean;
  lockedUntil?: string;
};

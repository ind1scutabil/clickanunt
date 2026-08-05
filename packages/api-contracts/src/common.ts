/**
 * Cross-cutting JSON types for API responses (serialized from Prisma/Date → ISO strings).
 */

/** ISO-8601 datetime string as returned in JSON (NextResponse.json). */
export type IsoDateTimeString = string;

/** ISO-8601 date-only string where APIs return calendar dates. */
export type IsoDateString = string;

/**
 * Standard money / salary fields on listings.
 * Commercial: priceType + optional amount. Jobs: salary* (optional).
 */
export type PriceTypeDto =
  | 'FIXED'
  | 'NEGOTIABLE'
  | 'FREE'
  | 'ON_REQUEST'
  | 'FROM';

export type SalaryPeriodDto = 'HOUR' | 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

export type PriceFields = {
  priceType?: PriceTypeDto | null;
  /** Major units; null for FREE / ON_REQUEST / Jobs without product price. */
  priceAmount?: number | null;
  priceCurrency?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  salaryPeriod?: SalaryPeriodDto | null;
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

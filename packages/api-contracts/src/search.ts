import type { IsoDateTimeString, SearchOffsetPagination } from './common';

/**
 * GET /api/search — slim rows (deprecated; same FTS engine as `GET /api/listings?q=`).
 * Prefer full listing feed from `/api/listings` for new clients.
 */
export type SearchResultRowDto = {
  id: string;
  title: string;
  category: string | null;
  priceAmount: number | null;
  priceCurrency: string | null;
  city: string | null;
  county: string | null;
  photos: string[] | null;
  createdAt: IsoDateTimeString;
  isPromoted: boolean | null;
  rank: number;
};

export type SearchResponseDto = {
  results: SearchResultRowDto[];
  pagination: SearchOffsetPagination;
};

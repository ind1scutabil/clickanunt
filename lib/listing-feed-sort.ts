import type { Prisma } from '@prisma/client';

/** Matches `searchListingsSchema.sort` in `lib/security/validation-schemas.ts`. */
export type ListingFeedSort = 'newest' | 'featured' | 'priceAsc' | 'priceDesc';

export function parseListingFeedSort(raw: string | undefined | null): ListingFeedSort {
  if (raw === 'featured' || raw === 'priceAsc' || raw === 'priceDesc' || raw === 'newest') {
    return raw;
  }
  return 'newest';
}

export function prismaOrderByForListingSort(sort: ListingFeedSort): Prisma.ListingOrderByWithRelationInput[] {
  switch (sort) {
    case 'featured':
      return [{ feedBoost: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }];
    case 'newest':
      return [{ createdAt: 'desc' }, { id: 'desc' }];
    case 'priceAsc':
      // Null / FREE / ON_REQUEST amounts sort last on ascending (Postgres nulls last).
      return [{ priceAmount: { sort: 'asc', nulls: 'last' } }, { id: 'desc' }];
    case 'priceDesc':
      // Null amounts last on descending so paid listings stay at the top.
      return [{ priceAmount: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }];
    default:
      return [{ createdAt: 'desc' }, { id: 'desc' }];
  }
}

/** Keyset cursor in `lib/pagination.ts` is only valid for featured (feedBoost) ordering. */
export function feedBoostKeysetPaginationEnabled(sort: ListingFeedSort): boolean {
  return sort === 'featured';
}

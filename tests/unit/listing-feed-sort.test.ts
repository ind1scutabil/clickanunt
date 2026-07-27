import {
  parseListingFeedSort,
  prismaOrderByForListingSort,
  feedBoostKeysetPaginationEnabled,
} from '@/lib/listing-feed-sort';

describe('listing feed sort', () => {
  it('parses known sort params', () => {
    expect(parseListingFeedSort('newest')).toBe('newest');
    expect(parseListingFeedSort('featured')).toBe('featured');
    expect(parseListingFeedSort('priceAsc')).toBe('priceAsc');
    expect(parseListingFeedSort('priceDesc')).toBe('priceDesc');
  });

  it('defaults invalid sort to newest', () => {
    expect(parseListingFeedSort(undefined)).toBe('newest');
    expect(parseListingFeedSort('')).toBe('newest');
    expect(parseListingFeedSort('bogus')).toBe('newest');
  });

  it('maps to Prisma orderBy for each mode', () => {
    expect(prismaOrderByForListingSort('featured')).toEqual([
      { feedBoost: 'desc' },
      { createdAt: 'desc' },
      { id: 'desc' },
    ]);
    expect(prismaOrderByForListingSort('newest')).toEqual([{ createdAt: 'desc' }, { id: 'desc' }]);
    expect(prismaOrderByForListingSort('priceAsc')).toEqual([
      { priceAmount: { sort: 'asc', nulls: 'last' } },
      { id: 'desc' },
    ]);
    expect(prismaOrderByForListingSort('priceDesc')).toEqual([
      { priceAmount: { sort: 'desc', nulls: 'last' } },
      { id: 'desc' },
    ]);
  });

  it('uses feed keyset only for featured', () => {
    expect(feedBoostKeysetPaginationEnabled('featured')).toBe(true);
    expect(feedBoostKeysetPaginationEnabled('newest')).toBe(false);
    expect(feedBoostKeysetPaginationEnabled('priceAsc')).toBe(false);
    expect(feedBoostKeysetPaginationEnabled('priceDesc')).toBe(false);
  });
});

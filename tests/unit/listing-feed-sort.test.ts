/** @jest-environment node */
import {
  parseListingFeedSort,
  prismaOrderByForListingSort,
  feedBoostKeysetPaginationEnabled,
  isPriceFeedSort,
  ftsOrderBySql,
} from '@/lib/listing-feed-sort';
import { Prisma } from '@prisma/client';

function flattenSql(sql: Prisma.Sql): { text: string; values: unknown[] } {
  const text: string[] = [];
  const values: unknown[] = [];
  const walk = (node: unknown) => {
    if (node && typeof node === 'object' && 'strings' in (node as object) && 'values' in (node as object)) {
      const s = node as Prisma.Sql;
      for (let i = 0; i < s.strings.length; i++) {
        text.push(s.strings[i]);
        if (i < s.values.length) {
          const v = s.values[i];
          if (v && typeof v === 'object' && 'strings' in (v as object)) {
            walk(v);
          } else {
            values.push(v);
            text.push('?');
          }
        }
      }
      return;
    }
    values.push(node);
    text.push('?');
  };
  walk(sql);
  return { text: text.join(''), values };
}

describe('listing feed sort', () => {
  it('parses known sort params', () => {
    expect(parseListingFeedSort('newest')).toBe('newest');
    expect(parseListingFeedSort('featured')).toBe('featured');
    expect(parseListingFeedSort('priceAsc')).toBe('priceAsc');
    expect(parseListingFeedSort('priceDesc')).toBe('priceDesc');
    expect(parseListingFeedSort('relevance', { hasTextQuery: true })).toBe('relevance');
  });

  it('defaults missing sort to relevance when q present, else newest', () => {
    expect(parseListingFeedSort(undefined, { hasTextQuery: true })).toBe('relevance');
    expect(parseListingFeedSort('', { hasTextQuery: true })).toBe('relevance');
    expect(parseListingFeedSort(undefined)).toBe('newest');
    expect(parseListingFeedSort('')).toBe('newest');
  });

  it('falls back invalid sort; relevance without q becomes newest', () => {
    expect(parseListingFeedSort('bogus')).toBe('newest');
    expect(parseListingFeedSort('bogus', { hasTextQuery: true })).toBe('relevance');
    expect(parseListingFeedSort('relevance', { hasTextQuery: false })).toBe('newest');
  });

  it('maps to Prisma orderBy for each mode', () => {
    expect(prismaOrderByForListingSort('featured')).toEqual([
      { feedBoost: 'desc' },
      { createdAt: 'desc' },
      { id: 'desc' },
    ]);
    expect(prismaOrderByForListingSort('newest')).toEqual([
      { createdAt: 'desc' },
      { id: 'desc' },
    ]);
    expect(prismaOrderByForListingSort('relevance')).toEqual([
      { createdAt: 'desc' },
      { id: 'desc' },
    ]);
    expect(prismaOrderByForListingSort('priceAsc')).toEqual([
      { priceAmount: { sort: 'asc', nulls: 'last' } },
      { createdAt: 'desc' },
      { id: 'desc' },
    ]);
    expect(prismaOrderByForListingSort('priceDesc')).toEqual([
      { priceAmount: { sort: 'desc', nulls: 'last' } },
      { createdAt: 'desc' },
      { id: 'desc' },
    ]);
  });

  it('uses feed keyset only for featured', () => {
    expect(feedBoostKeysetPaginationEnabled('featured')).toBe(true);
    expect(feedBoostKeysetPaginationEnabled('newest')).toBe(false);
    expect(feedBoostKeysetPaginationEnabled('relevance')).toBe(false);
    expect(feedBoostKeysetPaginationEnabled('priceAsc')).toBe(false);
  });

  it('detects price sorts', () => {
    expect(isPriceFeedSort('priceAsc')).toBe(true);
    expect(isPriceFeedSort('priceDesc')).toBe(true);
    expect(isPriceFeedSort('newest')).toBe(false);
  });

  it('builds allowlisted FTS ORDER BY without interpolating sort string', () => {
    const rank = Prisma.sql`ts_rank("search_vector", to_tsquery('romanian', ${'x:*'}))`;
    for (const mode of ['relevance', 'newest', 'featured', 'priceAsc', 'priceDesc'] as const) {
      const { text } = flattenSql(ftsOrderBySql(mode, rank, 'RON'));
      expect(text).toMatch(/ORDER BY/i);
      expect(text).toMatch(/id DESC/i);
    }
    const priceAsc = flattenSql(ftsOrderBySql('priceAsc', rank, 'RON'));
    expect(priceAsc.values).toContain('RON');
    const newest = flattenSql(ftsOrderBySql('newest', rank, null));
    expect(newest.text).toContain('"createdAt" DESC');
  });
});

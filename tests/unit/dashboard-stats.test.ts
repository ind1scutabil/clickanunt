/**
 * @jest-environment node
 */

import { totalViewsFromAggregate } from '@/lib/dashboard-stats';

describe('dashboard-stats', () => {
  it('totalViewsFromAggregate matches legacy reduce over rows', () => {
    const rows = [{ views: 10 }, { views: null }, { views: 5 }, { views: 0 }];
    const legacy = rows.reduce((s, r) => s + (r.views || 0), 0);
    const agg = totalViewsFromAggregate({
      views: rows.reduce((s, r) => s + (r.views || 0), 0),
    });
    expect(agg).toBe(legacy);
    expect(agg).toBe(15);
  });

  it('handles empty aggregate', () => {
    expect(totalViewsFromAggregate(null)).toBe(0);
    expect(totalViewsFromAggregate({ views: null })).toBe(0);
  });
});

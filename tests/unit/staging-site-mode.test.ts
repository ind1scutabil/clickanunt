/**
 * @jest-environment node
 */

import { isStagingSite, stagingRobotsMetadata } from '@/lib/staging/site-mode';
import { isLikelyProductionDatabaseUrl } from '@/lib/staging/production-isolation';

describe('staging site mode', () => {
  const orig = process.env.STAGING_SITE;

  afterEach(() => {
    if (orig === undefined) delete process.env.STAGING_SITE;
    else process.env.STAGING_SITE = orig;
  });

  it('is off by default', () => {
    delete process.env.STAGING_SITE;
    expect(isStagingSite()).toBe(false);
    expect(stagingRobotsMetadata()).toBe('index, follow');
  });

  it('noindex when STAGING_SITE=1', () => {
    process.env.STAGING_SITE = '1';
    expect(isStagingSite()).toBe(true);
    const robots = stagingRobotsMetadata();
    expect(typeof robots).toBe('object');
    expect(robots).toMatchObject({ index: false, follow: false });
  });
});

describe('production isolation', () => {
  it('detects production db host patterns', () => {
    expect(isLikelyProductionDatabaseUrl('postgresql://x@46.225.69.155/db')).toBe(true);
    expect(isLikelyProductionDatabaseUrl('postgresql://x@staging.internal/db')).toBe(false);
  });
});

/**
 * @jest-environment node
 */

import { PROD_HOST_PATTERNS, isProductionHost } from '../../scripts/staging/lib/guard.mjs';

describe('staging guard', () => {
  it('detects clickanunt.ro as production host', () => {
    expect(isProductionHost(new URL('https://www.clickanunt.ro'))).toBe(true);
    expect(isProductionHost(new URL('https://clickanunt.ro'))).toBe(true);
  });

  it('allows non-production hosts', () => {
    expect(isProductionHost(new URL('http://localhost:3000'))).toBe(false);
    expect(isProductionHost(new URL('https://staging.example.com'))).toBe(false);
  });

  it('PROD_HOST_PATTERNS is non-empty', () => {
    expect(PROD_HOST_PATTERNS.length).toBeGreaterThan(0);
  });
});

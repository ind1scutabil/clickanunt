/** @jest-environment node */
import {
  CANONICAL_WWW_ORIGIN,
  isApexHostname,
  resolveClientApiUrl,
} from '@/lib/client-canonical-www';

describe('client-canonical-www', () => {
  it('detects apex host', () => {
    expect(isApexHostname('clickanunt.ro')).toBe(true);
    expect(isApexHostname('clickanunt.ro:443')).toBe(true);
    expect(isApexHostname('www.clickanunt.ro')).toBe(false);
  });

  it('resolves API paths to www on apex', () => {
    const prev = global.window;
    Object.defineProperty(global, 'window', {
      value: { location: { hostname: 'clickanunt.ro' } },
      configurable: true,
    });
    expect(resolveClientApiUrl('/api/listings')).toBe(
      `${CANONICAL_WWW_ORIGIN}/api/listings`
    );
    Object.defineProperty(global, 'window', { value: prev, configurable: true });
  });

  it('keeps relative paths on www', () => {
    const prev = global.window;
    Object.defineProperty(global, 'window', {
      value: { location: { hostname: 'www.clickanunt.ro' } },
      configurable: true,
    });
    expect(resolveClientApiUrl('/api/listings')).toBe('/api/listings');
    Object.defineProperty(global, 'window', { value: prev, configurable: true });
  });
});

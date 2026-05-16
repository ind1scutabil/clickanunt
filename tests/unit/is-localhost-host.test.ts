import {
  isLocalhostHostname,
  shouldApplyProductionTransportSecurity,
} from '@/lib/security/is-localhost-host';

describe('isLocalhostHostname', () => {
  it('detects common loopback hosts', () => {
    expect(isLocalhostHostname('localhost')).toBe(true);
    expect(isLocalhostHostname('localhost:3000')).toBe(true);
    expect(isLocalhostHostname('127.0.0.1')).toBe(true);
    expect(isLocalhostHostname('127.0.0.1:3000')).toBe(true);
    expect(isLocalhostHostname('[::1]:3000')).toBe(true);
  });

  it('does not treat production hosts as localhost', () => {
    expect(isLocalhostHostname('www.clickanunt.ro')).toBe(false);
    expect(isLocalhostHostname('clickanunt.ro')).toBe(false);
  });
});

describe('shouldApplyProductionTransportSecurity', () => {
  const prev = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = prev;
  });

  it('skips transport hardening on localhost in production mode', () => {
    process.env.NODE_ENV = 'production';
    expect(shouldApplyProductionTransportSecurity('localhost:3000')).toBe(false);
  });

  it('applies transport hardening on real domains in production mode', () => {
    process.env.NODE_ENV = 'production';
    expect(shouldApplyProductionTransportSecurity('www.clickanunt.ro')).toBe(true);
  });
});

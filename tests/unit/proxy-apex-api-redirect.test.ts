/** @jest-environment node */
import { NextRequest } from 'next/server';
import { proxy } from '@/proxy';

describe('proxy apex API redirect', () => {
  it('uses 308 for /api/* on bare apex', () => {
    const req = new NextRequest('https://clickanunt.ro/api/listings', {
      method: 'POST',
    });
    const res = proxy(req);
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe('https://www.clickanunt.ro/api/listings');
  });

  it('uses 301 for pages on bare apex', () => {
    const req = new NextRequest('https://clickanunt.ro/listings/new');
    const res = proxy(req);
    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toBe('https://www.clickanunt.ro/listings/new');
  });
});

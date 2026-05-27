/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { peekSecureRateLimit } from '@/lib/rate-limit-distributed';

const decodeAccessJwtPayload = jest.fn();

jest.mock('@/lib/auth', () => ({
  decodeAccessJwtPayload: (...args: unknown[]) => decodeAccessJwtPayload(...args),
}));

import { getMessagingApiAuthPayload } from '@/lib/messages-request-auth';

describe('listing publish auth (cookie before stale Bearer)', () => {
  const userId = 'a1b2c3d4-e5f6-4789-a012-3456789abcde';

  beforeEach(() => {
    decodeAccessJwtPayload.mockReset();
    decodeAccessJwtPayload.mockImplementation(async (token: string) => {
      if (token === 'valid-cookie-jwt') {
        return { userId, email: 'admin@test.ro', role: 'admin', type: 'access' };
      }
      return null;
    });
  });

  it('tries cookie before Authorization when Bearer is stale', async () => {
    const req = new NextRequest('http://localhost/api/listings', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer stale-localstorage-jwt',
        Cookie: 'accessToken=valid-cookie-jwt',
      },
    });

    const payload = await getMessagingApiAuthPayload(req);
    expect(payload?.userId).toBe(userId);
    expect(decodeAccessJwtPayload.mock.calls[0][0]).toBe('valid-cookie-jwt');
    expect(decodeAccessJwtPayload).toHaveBeenCalledTimes(1);
  });

  it('returns null when no token validates', async () => {
    decodeAccessJwtPayload.mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/listings', {
      method: 'POST',
      headers: { Authorization: 'Bearer stale-localstorage-jwt' },
    });

    expect(await getMessagingApiAuthPayload(req)).toBeNull();
  });

  it('authenticated user uses per-user publish peek, not anonymous IP cap', async () => {
    const peek = await peekSecureRateLimit(
      'listing_publish',
      '203.0.113.50',
      userId,
      '',
      'admin'
    );
    expect(peek.allowed).toBe(true);
  });
});

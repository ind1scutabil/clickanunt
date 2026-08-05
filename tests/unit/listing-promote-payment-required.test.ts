/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

const mockGetUser = jest.fn();
const mockValidate = jest.fn();
const mockFindUnique = jest.fn();

jest.mock('@/lib/auth', () => ({
  getUserFromRequest: (...args: unknown[]) => mockGetUser(...args),
}));

jest.mock('@/lib/security/middleware', () => ({
  validateSecureRequest: (...args: unknown[]) => mockValidate(...args),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    listing: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/listing-feed-boost', () => ({
  computeFeedBoost: jest.fn(() => 0),
}));

import { POST } from '@/app/api/listings/[id]/promote/route';

const LISTING_ID = '11111111-1111-4111-8111-111111111111';

function promoteRequest(body: Record<string, unknown>) {
  return new NextRequest(`http://localhost/api/listings/${LISTING_ID}/promote`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': 't' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/listings/[id]/promote unpaid activation guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidate.mockResolvedValue({ success: true });
    mockGetUser.mockResolvedValue({ id: 'user-1' });
    mockFindUnique.mockResolvedValue({
      id: LISTING_ID,
      ownerUserId: 'user-1',
    });
  });

  it('refuses to activate promotion without verified Stripe payment', async () => {
    const res = await POST(promoteRequest({
      packageId: 'featured',
      amountBani: 1900,
      paymentMethod: 'paypal',
    }), { params: Promise.resolve({ id: LISTING_ID }) });

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.code).toBe('STRIPE_PAYMENT_REQUIRED');
  });

  it('still requires auth', async () => {
    mockGetUser.mockResolvedValue(null);
    const res = await POST(promoteRequest({
      packageId: 'featured',
      amountBani: 1900,
    }), { params: Promise.resolve({ id: LISTING_ID }) });
    expect(res.status).toBe(401);
  });

  it('still enforces ownership', async () => {
    mockFindUnique.mockResolvedValue({
      id: LISTING_ID,
      ownerUserId: 'other-user',
    });
    const res = await POST(promoteRequest({
      packageId: 'featured',
      amountBani: 1900,
    }), { params: Promise.resolve({ id: LISTING_ID }) });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.code).toBeUndefined();
    expect(json.error).toMatch(/proprietar/i);
  });
});

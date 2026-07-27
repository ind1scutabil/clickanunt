/** @jest-environment node */
/** Stripe webhook handler — signature, idempotency, event routing. */
import { NextRequest } from 'next/server';
import Stripe from 'stripe';

const mockVerify = jest.fn();
const mockRedisSet = jest.fn();
const mockFindUnique = jest.fn();
const mockUpdateMany = jest.fn();

jest.mock('@/lib/stripe', () => ({
  verifyWebhookSignature: (...args: unknown[]) => mockVerify(...args),
  stripe: {
    paymentMethods: { retrieve: jest.fn() },
  },
}));

jest.mock('@/lib/redis', () => ({
  getRedisClient: () => ({
    set: (...args: unknown[]) => mockRedisSet(...args),
  }),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    payment: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      updateMany: (...args: unknown[]) => mockUpdateMany(...args),
    },
    listing: { findUnique: jest.fn(), update: jest.fn() },
    invoice: { findUnique: jest.fn() },
  },
}));

jest.mock('@/lib/invoice', () => ({
  createInvoice: jest.fn(),
  markInvoiceAsPaid: jest.fn(),
  generateInvoiceItemsFromPayment: jest.fn(() => []),
}));

jest.mock('@/lib/invoice-mailer', () => ({
  sendInvoiceEmail: jest.fn(),
  sendPaymentConfirmationEmail: jest.fn(),
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn(),
}));

jest.mock('@/lib/admin-notifications', () => ({
  createAdminNotification: jest.fn(),
}));

jest.mock('@/lib/analytics-events', () => ({
  recordAnalyticsEvent: jest.fn(),
  ANALYTICS_EVENT: { promotion_purchased: 'x', promotion_activated: 'y' },
}));

jest.mock('@/lib/invoice-user-profile', () => ({
  formatUserInvoiceMetadata: jest.fn(),
}));

jest.mock('@/lib/user-notifications', () => ({
  notifyListingPromoted: jest.fn(),
}));

jest.mock('@/lib/listing-feed-boost', () => ({
  computeFeedBoost: jest.fn(() => 1),
}));

jest.mock('@/lib/promotion-packages', () => ({
  getListingPromotionApplyFromUiPackage: jest.fn(),
  inferUiPackageIdFromStripeType: jest.fn(() => null),
  PROMOTION_UI_IDS: [],
}));

import { POST } from '@/app/api/payments/webhook/route';
import { POST as stripeAliasPOST } from '@/app/api/webhooks/stripe/route';

function webhookRequest(body: string, signature?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (signature) headers['stripe-signature'] = signature;
  return new NextRequest('http://localhost/api/payments/webhook', {
    method: 'POST',
    headers,
    body,
  });
}

function baseEvent(overrides: Partial<Stripe.Event> = {}): Stripe.Event {
  return {
    id: 'evt_test_123',
    object: 'event',
    api_version: '2026-01-28.clover',
    created: 1_700_000_000,
    livemode: false,
    pending_webhooks: 0,
    request: null,
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: 'pi_test_123',
        object: 'payment_intent',
        amount: 2900,
        currency: 'ron',
        metadata: { listingId: 'listing-1', packageType: 'featured_7_days' },
      } as Stripe.PaymentIntent,
    },
    ...overrides,
  } as Stripe.Event;
}

describe('Stripe webhook POST', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisSet.mockResolvedValue('OK');
    mockUpdateMany.mockResolvedValue({ count: 1 });
    mockFindUnique.mockResolvedValue({
      id: 'pay-1',
      userId: 'user-1',
      status: 'pending',
      purpose: 'promote_listing',
      amount: 2900,
      currency: 'ron',
      metadata: { listingId: 'listing-1', packageType: 'featured_7_days' },
      user: { id: 'user-1', email: 'a@b.com', name: 'Test' },
    });
  });

  it('returns 400 when stripe-signature header is missing', async () => {
    const res = await POST(webhookRequest('{}'));
    expect(res.status).toBe(400);
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it('returns 400 when signature verification fails', async () => {
    mockVerify.mockImplementation(() => {
      throw new Error('Invalid webhook signature');
    });
    const res = await POST(webhookRequest('{}', 't=1,v1=bad'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Invalid signature/i);
  });

  it('returns 200 for valid signed unknown event type', async () => {
    mockVerify.mockReturnValue(
      baseEvent({ type: 'customer.created' as Stripe.Event['type'] })
    );
    const res = await POST(webhookRequest('{}', 't=1,v1=ok'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
  });

  it('returns 200 for payment_intent.succeeded without Redis pre-claim', async () => {
    mockVerify.mockReturnValue(baseEvent());
    const res = await POST(webhookRequest('{}', 't=1,v1=ok'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
    expect(json.duplicate).toBeUndefined();
    expect(mockFindUnique).toHaveBeenCalled();
  });

  it('processes payment_intent.succeeded once (idempotent on already succeeded)', async () => {
    mockVerify.mockReturnValue(baseEvent());
    mockFindUnique.mockResolvedValue({
      id: 'pay-1',
      userId: 'user-1',
      status: 'succeeded',
      purpose: 'promote_listing',
      amount: 2900,
      currency: 'ron',
      metadata: {},
      user: { id: 'user-1', email: 'a@b.com', name: 'Test' },
    });

    const res = await POST(webhookRequest('{}', 't=1,v1=ok'));
    expect(res.status).toBe(200);
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it('refuses side-effects when PaymentIntent amount mismatches DB payment', async () => {
    mockVerify.mockReturnValue(baseEvent());
    mockFindUnique.mockResolvedValue({
      id: 'pay-1',
      userId: 'user-1',
      status: 'pending',
      purpose: 'promote_listing',
      amount: 1900,
      currency: 'ron',
      metadata: { listingId: 'listing-1', packageType: 'featured_7_days' },
      user: { id: 'user-1', email: 'a@b.com', name: 'Test' },
    });

    const res = await POST(webhookRequest('{}', 't=1,v1=ok'));
    expect(res.status).toBe(200);
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it('/api/webhooks/stripe delegates to the same handler', async () => {
    mockVerify.mockReturnValue(
      baseEvent({ type: 'invoice.paid' as Stripe.Event['type'] })
    );
    const res = await stripeAliasPOST(webhookRequest('{}', 't=1,v1=ok'));
    expect(res.status).toBe(200);
  });
});

describe('verifyWebhookSignature (integration)', () => {
  const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = originalSecret;
    jest.resetModules();
  });

  it('accepts payload signed with STRIPE_WEBHOOK_SECRET', async () => {
    const secret = 'whsec_test_webhook_secret_for_unit_tests';
    process.env.STRIPE_WEBHOOK_SECRET = secret;
    process.env.STRIPE_SECRET_KEY = 'sk_test_unit_webhook';
    jest.resetModules();
    const { verifyWebhookSignature } = await import('@/lib/stripe');
    const payload = JSON.stringify({ id: 'evt_1', object: 'event' });
    const header = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret,
    });
    const event = verifyWebhookSignature(payload, header);
    expect(event).toBeDefined();
  });
});

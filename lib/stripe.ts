/**
 * Stripe Integration Library
 * Gestionează plățile cu card, Apple Pay, Google Pay
 */

import Stripe from 'stripe';
import { logger } from './observability';

/** Evită bootstrap la primul import: citește STRIPE_SECRET_KEY la runtime (după încărcarea .env de PM2). */
const STRIPE_API_VERSION: Stripe.StripeConfig['apiVersion'] = '2026-01-28.clover';

let stripeCachedKey: string | undefined;
let stripeClient: Stripe | undefined;

function getStripeSecretKey(): string {
  const k = process.env.STRIPE_SECRET_KEY?.trim();
  if (!k) {
    throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
  }
  return k;
}

export function getStripeServer(): Stripe {
  const key = getStripeSecretKey();
  if (!stripeClient || stripeCachedKey !== key) {
    stripeCachedKey = key;
    stripeClient = new Stripe(key, {
      apiVersion: STRIPE_API_VERSION,
      typescript: true,
    });
    logger.info('Stripe SDK initialized', {
      mode: key.startsWith('sk_live_') ? 'live' : key.startsWith('sk_test_') ? 'test' : 'unknown',
    });
  }
  return stripeClient;
}

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  logger.warn('STRIPE_WEBHOOK_SECRET is not set - webhook verification will fail');
}

/** Compat: delegare către clientul Stripe creat leneș (aceeași instanță). */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const client = getStripeServer();
    const value = (client as unknown as Record<string, unknown>)[prop as string];
    return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(client) : value;
  },
});

// Tipuri pentru pachete de promovare
export enum PromotionPackage {
  FEATURED_7_DAYS = 'featured_7_days',
  FEATURED_30_DAYS = 'featured_30_days',
  TOP_POSITION_1_DAY = 'top_position_1_day',
  HOMEPAGE_BANNER_7_DAYS = 'homepage_banner_7_days',
}

// Prețuri pentru pachete (în bani, RON * 100)
export const PROMOTION_PRICES: Record<PromotionPackage, number> = {
  [PromotionPackage.FEATURED_7_DAYS]: 2900, // 29 RON
  [PromotionPackage.FEATURED_30_DAYS]: 9900, // 99 RON
  [PromotionPackage.TOP_POSITION_1_DAY]: 1500, // 15 RON
  [PromotionPackage.HOMEPAGE_BANNER_7_DAYS]: 14900, // 149 RON
};

// Descrieri pentru pachete
export const PROMOTION_DESCRIPTIONS: Record<PromotionPackage, string> = {
  [PromotionPackage.FEATURED_7_DAYS]: 'Anunț evidențiat 7 zile',
  [PromotionPackage.FEATURED_30_DAYS]: 'Anunț evidențiat 30 zile',
  [PromotionPackage.TOP_POSITION_1_DAY]: 'Poziție top 1 zi',
  [PromotionPackage.HOMEPAGE_BANNER_7_DAYS]: 'Banner homepage 7 zile',
};

/**
 * Creare PaymentIntent pentru promovare anunț
 */
export async function createPaymentIntent(options: {
  userId: string;
  listingId: string;
  packageType: PromotionPackage;
  customerEmail?: string;
  metadata?: Record<string, string>;
  amount?: number;
}): Promise<Stripe.PaymentIntent> {
  const { userId, listingId, packageType, customerEmail, metadata = {}, amount: overrideAmount } = options;

  const amount = overrideAmount ?? PROMOTION_PRICES[packageType];
  const description = PROMOTION_DESCRIPTIONS[packageType];

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'ron',
      description,
      receipt_email: customerEmail,
      metadata: {
        userId,
        listingId,
        packageType,
        purpose: 'promote_listing',
        ...metadata,
      },
      // Stripe activează automat toate metodele (card, Apple Pay, Google Pay)
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
    });

    logger.info('Payment intent created', {
      paymentIntentId: paymentIntent.id,
      userId,
      listingId,
      amount,
      packageType,
    });

    return paymentIntent;
  } catch (error) {
    logger.error('Failed to create payment intent', { error, userId, listingId });
    throw error;
  }
}

/**
 * Verificare semnătură webhook Stripe
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }

  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    logger.info('Webhook signature verified', { eventType: event.type });
    return event;
  } catch (error) {
    logger.error('Webhook signature verification failed', { error });
    throw new Error('Invalid webhook signature');
  }
}

/**
 * Retrieve PaymentIntent
 */
export async function getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
  try {
    return await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch (error) {
    logger.error('Failed to retrieve payment intent', { error, paymentIntentId });
    throw error;
  }
}

/**
 * Refund payment
 */
export async function refundPayment(
  paymentIntentId: string,
  amount?: number,
  reason?: Stripe.RefundCreateParams.Reason
): Promise<Stripe.Refund> {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount,
      reason,
    });

    logger.info('Refund created', {
      refundId: refund.id,
      paymentIntentId,
      amount: refund.amount,
      reason,
    });

    return refund;
  } catch (error) {
    logger.error('Failed to create refund', { error, paymentIntentId });
    throw error;
  }
}

/**
 * Creare Customer în Stripe
 */
export async function createCustomer(options: {
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.Customer> {
  try {
    const customer = await stripe.customers.create({
      email: options.email,
      name: options.name,
      metadata: options.metadata,
    });

    logger.info('Stripe customer created', { customerId: customer.id, email: options.email });
    return customer;
  } catch (error) {
    logger.error('Failed to create Stripe customer', { error, email: options.email });
    throw error;
  }
}

/**
 * Cancel PaymentIntent
 */
export async function cancelPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
  try {
    const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
    logger.info('Payment intent cancelled', { paymentIntentId });
    return paymentIntent;
  } catch (error) {
    logger.error('Failed to cancel payment intent', { error, paymentIntentId });
    throw error;
  }
}

/**
 * Validare pachet promovare
 */
export function isValidPromotionPackage(packageType: string): packageType is PromotionPackage {
  return Object.values(PromotionPackage).includes(packageType as PromotionPackage);
}

/**
 * Get preț pentru pachet
 */
export function getPackagePrice(packageType: PromotionPackage): number {
  return PROMOTION_PRICES[packageType];
}

/**
 * Get descriere pentru pachet
 */
export function getPackageDescription(packageType: PromotionPackage): string {
  return PROMOTION_DESCRIPTIONS[packageType];
}

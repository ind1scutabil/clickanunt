/**
 * API: Stripe Webhook Handler
 * POST /api/payments/webhook - Handler evenimente Stripe
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature, stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/observability';
import { logPaymentEvent } from '@/lib/observability/domain-events';
import { createInvoice, markInvoiceAsPaid, generateInvoiceItemsFromPayment } from '@/lib/invoice';
import { sendInvoiceEmail, sendPaymentConfirmationEmail } from '@/lib/invoice-mailer';
import { createAuditLog } from '@/lib/audit';
import { ANALYTICS_EVENT, recordAnalyticsEvent } from '@/lib/analytics-events';
import { formatUserInvoiceMetadata } from '@/lib/invoice-user-profile';
import { PaymentStatus, PaymentMethod } from '@prisma/client';
import Stripe from 'stripe';
import { AdminNotificationSeverity } from '@prisma/client';
import { ADMIN_NOTIFICATION_TYPE } from '@/lib/admin-notification-types';
import { createAdminNotification } from '@/lib/admin-notifications';
import {
  getListingPromotionApplyFromUiPackage,
  inferUiPackageIdFromStripeType,
  PROMOTION_UI_IDS,
  type PromotionUiId,
} from '@/lib/promotion-packages';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function logStripeWebhookEvent(event: Stripe.Event, phase: 'received' | 'duplicate' | 'unhandled') {
  logger.info('Stripe webhook event', {
    phase,
    eventId: event.id,
    eventType: event.type,
    livemode: event.livemode,
    created: event.created,
  });
}

/**
 * Handler webhook Stripe
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    if (!rawBody) {
      logPaymentEvent('webhook_empty_body', {}, 'error');
      return NextResponse.json({ error: 'Empty body' }, { status: 400 });
    }

    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      logPaymentEvent('webhook_missing_signature', {}, 'error');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = verifyWebhookSignature(rawBody, signature);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logPaymentEvent('webhook_invalid_signature', { reason: message }, 'error');
      logger.warn('Stripe webhook signature verification failed', {
        reason: message,
        hasWebhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim()),
      });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    logStripeWebhookEvent(event, 'received');

    // Durable idempotency is payment.status / updateMany (and invoice-by-paymentId).
    // Redis is an optional post-success soft cache only — never claim before side-effects.

    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.canceled':
        await handlePaymentCanceled(event.data.object as Stripe.PaymentIntent);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      case 'checkout.session.completed':
        // Checkout not used for promotions today; acknowledge so Stripe does not retry.
        logStripeWebhookEvent(event, 'unhandled');
        break;

      case 'invoice.created':
      case 'invoice.paid':
      case 'invoice.payment_succeeded':
        // Platform invoices are created on payment_intent.succeeded.
        logStripeWebhookEvent(event, 'unhandled');
        break;

      default:
        logStripeWebhookEvent(event, 'unhandled');
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Webhook processing failed';
    logger.error('Webhook processing failed', {
      error: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Handler: Payment succeeded
 */
async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const { id, amount, currency, metadata } = paymentIntent;

  logger.info('Payment succeeded', { paymentIntentId: id, amount, metadata });

  // Find payment în DB
  const payment = await prisma.payment.findUnique({
    where: { stripePaymentIntentId: id },
    include: { user: true },
  });

  if (!payment) {
    logger.error('Payment not found in database', { paymentIntentId: id });
    return;
  }

  // Idempotency guard (fail-closed on DB state): if we've already marked the payment,
  // skip all side-effects (invoice creation, listing promotion, emails).
  if (payment.status === PaymentStatus.succeeded) {
    logger.info('Duplicate payment_intent.succeeded ignored (already succeeded)', {
      paymentIntentId: id,
      paymentId: payment.id,
    });
    return;
  }

  // Fail closed: Stripe amount/currency must match the pending Payment row created server-side.
  const expectedCurrency = String(payment.currency || '').toLowerCase();
  const actualCurrency = String(currency || '').toLowerCase();
  if (payment.amount !== amount || expectedCurrency !== actualCurrency) {
    logger.error('PaymentIntent amount/currency mismatch — refusing promotion/invoice side-effects', {
      paymentIntentId: id,
      paymentId: payment.id,
      expectedAmount: payment.amount,
      actualAmount: amount,
      expectedCurrency,
      actualCurrency,
    });
    void createAdminNotification({
      type: ADMIN_NOTIFICATION_TYPE.PAYMENT_SUCCEEDED,
      severity: AdminNotificationSeverity.critical,
      title: 'Plată Stripe — nepotrivire sumă/monedă',
      message: `PaymentIntent ${id} nu corespunde înregistrării ${payment.id}; side-effects blocate.`,
      entityType: 'payment',
      entityId: payment.id,
      metadata: { expectedAmount: payment.amount, actualAmount: amount },
    });
    return;
  }

  // Determine payment method
  // Note: charges is not always available in PaymentIntent object
  // We'll fetch it separately or use payment_method
  let paymentMethod: PaymentMethod = PaymentMethod.card;

  // Try to get payment method from payment_intent
  if (paymentIntent.payment_method) {
    try {
      const pm = await stripe.paymentMethods.retrieve(
        typeof paymentIntent.payment_method === 'string'
          ? paymentIntent.payment_method
          : paymentIntent.payment_method.id
      );
      
      if (pm.card?.wallet) {
        const walletType = pm.card.wallet.type;
        if (walletType === 'apple_pay') paymentMethod = PaymentMethod.apple_pay;
        else if (walletType === 'google_pay') paymentMethod = PaymentMethod.google_pay;
      }
    } catch (error) {
      logger.warn('Could not retrieve payment method details', { error });
    }
  }

  // Update payment status atomically.
  // This prevents duplicates under concurrent webhook delivery.
  const updated = await prisma.payment.updateMany({
    where: {
      id: payment.id,
      status: { not: PaymentStatus.succeeded },
    },
    data: {
      status: PaymentStatus.succeeded,
      method: paymentMethod,
      paidAt: new Date(),
    },
  });

  if (updated.count === 0) {
    logger.info('Duplicate payment_intent.succeeded ignored (race condition)', {
      paymentIntentId: id,
      paymentId: payment.id,
    });
    return;
  }

  logger.info('Payment status updated to succeeded', {
    paymentId: payment.id,
    method: paymentMethod,
  });

  const pm = payment.metadata as Record<string, unknown> | null;
  const promoListingIdEarly =
    pm && typeof pm.listingId === 'string' ? pm.listingId : null;
  if (payment.purpose === 'promote_listing' || payment.purpose === 'promotion') {
    void recordAnalyticsEvent({
      eventType: ANALYTICS_EVENT.promotion_purchased,
      userId: payment.userId,
      listingId: promoListingIdEarly,
      metadata: {
        paymentId: payment.id,
        amount,
        currency,
        purpose: payment.purpose,
      },
    });
  }

  // Generare factură automată
  try {
    const packageType = (payment.metadata as any)?.packageType || 'Unknown package';
    const description = `Promovare anunț - ${packageType}`;

    const items = generateInvoiceItemsFromPayment(description, amount, 19);

    // Extrage date legale din user profile pentru facturare
    let invoiceMetadata = {
      clientName: payment.user.name || 'Unknown',
      clientEmail: payment.user.email,
    };

    try {
      const userBillingData = await formatUserInvoiceMetadata(payment.userId);
      invoiceMetadata = {
        ...userBillingData,
      };
    } catch (error) {
      logger.warn('Could not get user billing profile, using defaults', { userId: payment.userId, error });
    }

    const invoice = await createInvoice({
      userId: payment.userId,
      paymentId: payment.id,
      items,
      clientName: invoiceMetadata.clientName,
      clientEmail: invoiceMetadata.clientEmail,
      clientAddress: (invoiceMetadata as any).clientAddress,
      clientCui: (invoiceMetadata as any).clientCui,
    });

    // Marcare factură ca plătită
    await markInvoiceAsPaid(invoice.id);

    logger.info('Invoice created and marked as paid', {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      paymentId: payment.id,
    });

    // Fetch invoice data for email
    const invoiceData = await prisma.invoice.findUnique({
      where: { id: invoice.id },
    });

    // Send invoice email
    if (invoiceData && payment.user.email) {
      const { subtotal, vatAmount, vatRate } = invoiceData.metadata as any;
      const invoiceResult = await sendInvoiceEmail({
        to: payment.user.email,
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoiceMetadata.clientName,
        amount: invoiceData.amount,
        currency: invoiceData.currency,
        issuedAt: invoiceData.issuedAt || new Date(),
        dueAt: invoiceData.dueAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: items,
        subtotal: subtotal || invoiceData.amount,
        vatAmount: vatAmount || 0,
        metadata: (invoiceData.metadata || {}) as Record<string, unknown>,
      });

      if (invoiceResult.success) {
        logger.info('Invoice email sent', {
          invoiceNumber: invoice.invoiceNumber,
          to: payment.user.email,
        });
      } else {
        logger.warn('Failed to send invoice email', {
          invoiceNumber: invoice.invoiceNumber,
          error: invoiceResult.error,
        });
      }
    }

    // Send payment confirmation email
    if (payment.user.email) {
      const confirmationResult = await sendPaymentConfirmationEmail({
        to: payment.user.email,
        clientName: invoiceMetadata.clientName,
        amount: amount,
        currency: payment.currency.toUpperCase(),
        invoiceNumber: invoice.invoiceNumber,
        paymentMethod: paymentMethod,
        transactionId: payment.id,
      });

      if (confirmationResult.success) {
        logger.info('Payment confirmation email sent', {
          paymentId: payment.id,
          to: payment.user.email,
        });
      }
    }
  } catch (error) {
    logger.error('Failed to create invoice or send emails', { error, paymentId: payment.id });
  }

  // Update listing promotion status (dacă există)
  const listingId = payment.metadata && typeof payment.metadata === 'object' && 'listingId' in payment.metadata 
    ? payment.metadata.listingId as string 
    : null;
  
  if (listingId) {
    try {
      const meta = payment.metadata as Record<string, unknown> | null;
      const stripePackageType =
        meta && typeof meta.packageType === 'string' ? meta.packageType : '';
      const rawUi = meta?.promotionUiPackageId;
      let uiId: PromotionUiId | null =
        typeof rawUi === 'string' && (PROMOTION_UI_IDS as readonly string[]).includes(rawUi)
          ? (rawUi as PromotionUiId)
          : null;
      if (!uiId) {
        uiId = inferUiPackageIdFromStripeType(stripePackageType);
      }

      const STRIPE_ONLY_FALLBACK: Record<string, { type: string; days: number; featured: boolean }> = {
        homepage_banner_7_days: { type: 'featured', days: 7, featured: true },
      };

      const { computeFeedBoost } = await import('@/lib/listing-feed-boost');

      let promotionTypeStr: string;
      let featured: boolean;
      let promotionEnd: Date;

      if (uiId) {
        const apply = await getListingPromotionApplyFromUiPackage(uiId);
        // Duration must come from Payment.metadata snapshot at intent creation.
        // Never re-read FeatureFlag duration after payment (fail closed if missing/invalid).
        const snapRaw = meta?.durationDays;
        let snapDays: number | null = null;
        if (typeof snapRaw === 'number' && Number.isInteger(snapRaw)) {
          snapDays = snapRaw;
        } else if (typeof snapRaw === 'string' && snapRaw.trim() !== '') {
          const parsed = Number.parseInt(snapRaw, 10);
          if (Number.isInteger(parsed) && String(parsed) === snapRaw.trim()) {
            snapDays = parsed;
          }
        }
        const MAX_PROMOTION_DURATION_DAYS = 365;
        if (
          snapDays == null ||
          snapDays < 1 ||
          snapDays > MAX_PROMOTION_DURATION_DAYS
        ) {
          logger.error(
            'Listing promotion skipped: missing or invalid durationDays snapshot on Payment',
            {
              listingId,
              paymentId: payment.id,
              durationDays: snapRaw ?? null,
            }
          );
          promotionTypeStr = '';
          featured = false;
          promotionEnd = new Date();
        } else {
          promotionTypeStr = apply.promotionType;
          featured = apply.featured;
          promotionEnd = new Date();
          promotionEnd.setDate(promotionEnd.getDate() + snapDays);
        }
      } else if (stripePackageType && STRIPE_ONLY_FALLBACK[stripePackageType]) {
        const fb = STRIPE_ONLY_FALLBACK[stripePackageType];
        promotionTypeStr = fb.type;
        featured = fb.featured;
        promotionEnd = new Date();
        promotionEnd.setDate(promotionEnd.getDate() + fb.days);
      } else {
        logger.warn('Listing promotion skipped: unknown package mapping', {
          listingId,
          stripePackageType,
        });
        promotionTypeStr = '';
        featured = false;
        promotionEnd = new Date();
      }

      if (promotionTypeStr) {
        const listingBeforePromo = await prisma.listing.findUnique({
          where: { id: listingId },
          select: {
            title: true,
            ownerUserId: true,
            status: true,
            isPromoted: true,
            promotionExpiresAt: true,
          },
        });

        if (!listingBeforePromo) {
          logger.error('Listing not found for promotion activation', { listingId, paymentId: payment.id });
        } else if (listingBeforePromo.ownerUserId !== payment.userId) {
          logger.error('Listing ownership mismatch — refusing promotion activation', {
            listingId,
            paymentId: payment.id,
            paymentUserId: payment.userId,
            listingOwnerId: listingBeforePromo.ownerUserId,
          });
          void createAdminNotification({
            type: ADMIN_NOTIFICATION_TYPE.PROMOTION_ACTIVATED,
            severity: AdminNotificationSeverity.critical,
            title: 'Promovare blocată — ownership mismatch',
            message: `Payment ${payment.id} vs listing ${listingId} owner mismatch.`,
            entityType: 'payment',
            entityId: payment.id,
            metadata: { listingId },
          });
        } else if (listingBeforePromo.status !== 'active') {
          logger.warn('Listing not active — skipping promotion activation', {
            listingId,
            status: listingBeforePromo.status,
            paymentId: payment.id,
          });
        } else {
        await prisma.listing.update({
          where: { id: listingId },
          data: {
            isPromoted: true,
            isFeatured: featured,
            feedBoost: computeFeedBoost(true, featured),
            promotionType: promotionTypeStr as any,
            promotionStartedAt: new Date(),
            promotionExpiresAt: promotionEnd,
            updatedAt: new Date(),
          },
        });

        if (listingBeforePromo) {
          const { notifyListingPromoted } = await import('@/lib/user-notifications');
          void notifyListingPromoted({
            userId: listingBeforePromo.ownerUserId,
            listingTitle: listingBeforePromo.title,
            promotionExpiresAt: promotionEnd,
            wasPromoted: listingBeforePromo.isPromoted,
            previousPromotionExpiresAt: listingBeforePromo.promotionExpiresAt,
          });
        }

        logger.info('Listing promotion activated', {
          listingId,
          stripePackageType,
          promotionUiPackageId: uiId,
          promotionEnd,
          promotionType: promotionTypeStr,
          isFeatured: featured,
        });

        await createAuditLog({
          userId: payment.userId,
          action: 'promotion_activated',
          resource: 'listing',
          resourceId: listingId,
          details: {
            paymentId: payment.id,
            packageType: stripePackageType,
            promotionUiPackageId: uiId,
          },
        });

        void recordAnalyticsEvent({
          eventType: ANALYTICS_EVENT.promotion_activated,
          userId: payment.userId,
          listingId,
          metadata: {
            paymentId: payment.id,
            packageType: promotionTypeStr,
            source: 'stripe_webhook',
          },
        });

        void createAdminNotification({
          type: ADMIN_NOTIFICATION_TYPE.PROMOTION_ACTIVATED,
          severity: AdminNotificationSeverity.success,
          title: 'Promovare activată',
          message: `Anunț ${listingId}: promovare ${promotionTypeStr} activată după plată.`,
          entityType: 'listing',
          entityId: listingId,
          metadata: { paymentId: payment.id },
        });
        }
      }
    } catch (error) {
      logger.error('Failed to update listing promotion', {
        error,
        listingId,
      });
    }
  }

  // Audit log
  await createAuditLog({
    action: 'payment_succeeded',
    resource: 'payment',
    resourceId: payment.id,
    userId: payment.userId,
    details: {
      paymentId: payment.id,
      amount,
      currency,
      method: paymentMethod,
      listingId: listingId,
    },
  });

  void createAdminNotification({
    type: ADMIN_NOTIFICATION_TYPE.PAYMENT_SUCCEEDED,
    severity: AdminNotificationSeverity.success,
    title: 'Plată reușită',
    message: `Plată ${payment.id} — ${(amount / 100).toFixed(2)} ${String(currency).toUpperCase()} (${payment.purpose}).`,
    entityType: 'payment',
    entityId: payment.id,
    metadata: { userId: payment.userId, listingId, purpose: payment.purpose },
  });
}

/**
 * Handler: Payment failed
 */
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const { id, last_payment_error } = paymentIntent;

  logger.warn('Payment failed', {
    paymentIntentId: id,
    error: last_payment_error?.message,
  });

  const payment = await prisma.payment.findUnique({
    where: { stripePaymentIntentId: id },
  });

  if (!payment) {
    logger.error('Payment not found in database', { paymentIntentId: id });
    return;
  }

  if (payment.status === PaymentStatus.failed) {
    logger.info('Duplicate payment_intent.payment_failed ignored (already failed)', {
      paymentIntentId: id,
      paymentId: payment.id,
    });
    return;
  }

  // Terminal states must not be overwritten by a late failed event.
  if (
    payment.status === PaymentStatus.succeeded ||
    payment.status === PaymentStatus.refunded ||
    payment.status === PaymentStatus.cancelled
  ) {
    logger.warn('Ignoring payment_failed for terminal payment status', {
      paymentIntentId: id,
      paymentId: payment.id,
      status: payment.status,
    });
    return;
  }

  const updated = await prisma.payment.updateMany({
    where: {
      id: payment.id,
      status: PaymentStatus.pending,
    },
    data: {
      status: PaymentStatus.failed,
      metadata: {
        ...(payment.metadata as object || {}),
        errorMessage: last_payment_error?.message || 'Payment failed',
      }
    },
  });

  if (updated.count === 0) {
    logger.info('Duplicate payment_intent.payment_failed ignored (race condition)', {
      paymentIntentId: id,
      paymentId: payment.id,
    });
    return;
  }

  await createAuditLog({
    action: 'payment_failed',
    resource: 'payment',
    resourceId: payment.id,
    userId: payment.userId,
    details: {
      paymentId: payment.id,
      error: last_payment_error?.message,
    },
  });

  void createAdminNotification({
    type: ADMIN_NOTIFICATION_TYPE.PAYMENT_FAILED,
    severity: AdminNotificationSeverity.critical,
    title: 'Plată eșuată',
    message: `Plată ${payment.id} a eșuat: ${last_payment_error?.message || 'necunoscut'}.`,
    entityType: 'payment',
    entityId: payment.id,
    metadata: {
      userId: payment.userId,
      stripePaymentIntentId: id,
    },
  });
}

/**
 * Handler: Payment canceled
 */
async function handlePaymentCanceled(paymentIntent: Stripe.PaymentIntent) {
  const { id } = paymentIntent;

  logger.info('Payment canceled', { paymentIntentId: id });

  const payment = await prisma.payment.findUnique({
    where: { stripePaymentIntentId: id },
  });

  if (!payment) return;

  if (payment.status === PaymentStatus.cancelled) {
    logger.info('Duplicate payment_intent.canceled ignored (already cancelled)', {
      paymentIntentId: id,
      paymentId: payment.id,
    });
    return;
  }

  const updated = await prisma.payment.updateMany({
    where: {
      id: payment.id,
      status: PaymentStatus.pending,
    },
    data: { status: PaymentStatus.cancelled },
  });

  if (updated.count === 0) {
    logger.info('Duplicate payment_intent.canceled ignored (race condition)', {
      paymentIntentId: id,
      paymentId: payment.id,
    });
    return;
  }

  await createAuditLog({
    action: 'payment_cancelled',
    resource: 'payment',
    resourceId: payment.id,
    userId: payment.userId,
    details: { paymentId: payment.id },
  });
}

/**
 * Handler: Charge refunded
 */
async function handleChargeRefunded(charge: Stripe.Charge) {
  const { payment_intent, amount_refunded } = charge;

  logger.info('Charge refunded', {
    paymentIntentId: payment_intent,
    amountRefunded: amount_refunded,
  });

  if (typeof payment_intent !== 'string') return;

  const payment = await prisma.payment.findUnique({
    where: { stripePaymentIntentId: payment_intent },
  });

  if (!payment) return;

  if (payment.status === PaymentStatus.refunded) {
    logger.info('Duplicate charge.refunded ignored (already refunded)', {
      paymentIntentId: payment_intent,
      paymentId: payment.id,
    });
    return;
  }

  const updated = await prisma.payment.updateMany({
    where: {
      id: payment.id,
      status: { not: PaymentStatus.refunded },
    },
    data: {
      status: PaymentStatus.refunded,
      metadata: {
        ...(payment.metadata as object || {}),
        refundedAt: new Date().toISOString(),
      }
    },
  });

  if (updated.count === 0) {
    logger.info('Duplicate charge.refunded ignored (race condition)', {
      paymentIntentId: payment_intent,
      paymentId: payment.id,
    });
    return;
  }

  await createAuditLog({
    action: 'payment_refunded',
    resource: 'payment',
    resourceId: payment.id,
    userId: payment.userId,
    details: {
      paymentId: payment.id,
      amountRefunded: amount_refunded,
    },
  });
}

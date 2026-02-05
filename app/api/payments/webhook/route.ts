/**
 * API: Stripe Webhook Handler
 * POST /api/payments/webhook - Handler evenimente Stripe
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature, stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/observability';
import { createInvoice, markInvoiceAsPaid, generateInvoiceItemsFromPayment } from '@/lib/invoice';
import { createAuditLog } from '@/lib/audit';
import { PaymentStatus, PaymentMethod } from '@prisma/client';
import Stripe from 'stripe';

export const runtime = 'nodejs';

// Disable body parsing pentru Stripe webhooks
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper: Read raw body
async function getRawBody(req: NextRequest): Promise<string> {
  const chunks: Uint8Array[] = [];
  const reader = req.body?.getReader();
  
  if (!reader) {
    throw new Error('No request body');
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const buffer = Buffer.concat(chunks);
  return buffer.toString('utf8');
}

/**
 * Handler webhook Stripe
 */
export async function POST(req: NextRequest) {
  try {
    // Get raw body și signature
    const rawBody = await getRawBody(req);
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      logger.error('Missing Stripe signature');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Verificare semnătură
    let event: Stripe.Event;
    try {
      event = verifyWebhookSignature(rawBody, signature);
    } catch (error) {
      logger.error('Webhook signature verification failed', { error });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    logger.info('Webhook received', { eventType: event.type, eventId: event.id });

    // Handle evenimente
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

      default:
        logger.info('Unhandled webhook event type', { eventType: event.type });
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    logger.error('Webhook processing failed', { error });
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
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

  // Update payment status
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: PaymentStatus.succeeded,
      method: paymentMethod,
      paidAt: new Date(),
    },
  });

  logger.info('Payment status updated to succeeded', {
    paymentId: payment.id,
    method: paymentMethod,
  });

  // Generare factură automată
  try {
    const packageType = (payment.metadata as any)?.packageType || 'Unknown package';
    const description = `Promovare anunț - ${packageType}`;

    const items = generateInvoiceItemsFromPayment(description, amount, 19);

    const invoice = await createInvoice({
      userId: payment.userId,
      paymentId: payment.id,
      items,
      clientName: payment.user.name || 'Unknown',
      clientEmail: payment.user.email,
    });

    // Marcare factură ca plătită
    await markInvoiceAsPaid(invoice.id);

    logger.info('Invoice created and marked as paid', {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      paymentId: payment.id,
    });
  } catch (error) {
    logger.error('Failed to create invoice', { error, paymentId: payment.id });
  }

  // Update listing promotion status (dacă există)
  if (payment.entityType === 'listing' && payment.entityId) {
    try {
      const packageType = (payment.metadata as any)?.packageType;
      let promotionEnd: Date | undefined;

      // Calcul dată expirare promovare
      if (packageType?.includes('7_days')) {
        promotionEnd = new Date();
        promotionEnd.setDate(promotionEnd.getDate() + 7);
      } else if (packageType?.includes('30_days')) {
        promotionEnd = new Date();
        promotionEnd.setDate(promotionEnd.getDate() + 30);
      } else if (packageType?.includes('1_day')) {
        promotionEnd = new Date();
        promotionEnd.setDate(promotionEnd.getDate() + 1);
      }

      // Update listing cu promovare (presupunem că există câmpuri isFeatured, featuredUntil)
      // Dacă nu există, se pot adăuga în viitor
      logger.info('Listing promotion activated', {
        listingId: payment.entityId,
        packageType,
        promotionEnd,
      });

      // TODO: Update listing cu promovare când se adaugă câmpurile în schema
      // await prisma.listing.update({
      //   where: { id: payment.entityId },
      //   data: {
      //     isFeatured: true,
      //     featuredUntil: promotionEnd,
      //   },
      // });
    } catch (error) {
      logger.error('Failed to update listing promotion', {
        error,
        listingId: payment.entityId,
      });
    }
  }

  // Audit log
  await createAuditLog({
    action: 'payment_succeeded',
    entityType: 'payment',
    entityId: payment.id,
    userId: payment.userId,
    metadata: {
      paymentId: payment.id,
      amount,
      currency,
      method: paymentMethod,
      listingId: payment.entityId,
    },
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

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: PaymentStatus.failed,
      errorMessage: last_payment_error?.message || 'Payment failed',
    },
  });

  await createAuditLog({
    action: 'payment_failed',
    entityType: 'payment',
    entityId: payment.id,
    userId: payment.userId,
    metadata: {
      paymentId: payment.id,
      error: last_payment_error?.message,
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

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: PaymentStatus.cancelled },
  });

  await createAuditLog({
    action: 'payment_cancelled',
    entityType: 'payment',
    entityId: payment.id,
    userId: payment.userId,
    metadata: { paymentId: payment.id },
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

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: PaymentStatus.refunded,
      refundedAt: new Date(),
    },
  });

  await createAuditLog({
    action: 'payment_refunded',
    entityType: 'payment',
    entityId: payment.id,
    userId: payment.userId,
    metadata: {
      paymentId: payment.id,
      amountRefunded: amount_refunded,
    },
  });
}

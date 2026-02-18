/**
 * API: Stripe Webhook Handler
 * POST /api/payments/webhook - Handler evenimente Stripe
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature, stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/observability';
import { createInvoice, markInvoiceAsPaid, generateInvoiceItemsFromPayment } from '@/lib/invoice';
import { sendInvoiceEmail, sendPaymentConfirmationEmail } from '@/lib/invoice-mailer';
import { createAuditLog } from '@/lib/audit';
import { formatUserInvoiceMetadata } from '@/lib/invoice-user-profile';
import { PaymentStatus, PaymentMethod } from '@prisma/client';
import Stripe from 'stripe';

export const runtime = 'nodejs';

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
      const packageType = (payment.metadata as any)?.packageType;
      
      // Map package types to configuration
      const promotionConfig: Record<string, { type: string, days: number, featured: boolean }> = {
        'top': { type: 'boost_7days', days: 7, featured: true },
        'urgent': { type: 'boost_72h', days: 3, featured: false },
        'featured': { type: 'featured', days: 5, featured: true },
        'refresh': { type: 'boost_24h', days: 1, featured: false }
      };

      const config = promotionConfig[packageType] || promotionConfig['featured'];
      const promotionEnd = new Date();
      promotionEnd.setDate(promotionEnd.getDate() + config.days);

      // Update listing with promotion
      await prisma.listing.update({
        where: { id: listingId },
        data: {
          isPromoted: true,
          isFeatured: config.featured,
          promotionType: config.type as any,
          promotionStartedAt: new Date(),
          promotionExpiresAt: promotionEnd,
          updatedAt: new Date() // Refresh position in listings
        }
      });

      logger.info('Listing promotion activated', {
        listingId,
        packageType,
        promotionEnd,
        promotionType: config.type,
        isFeatured: config.featured
      });


        // Audit log
        await createAuditLog({
          userId: payment.userId,
          action: 'promotion_activated',
          resource: 'listing',
          resourceId: listingId,
          details: {
            paymentId: payment.id,
            packageType: payment.metadata && typeof payment.metadata === 'object' && 'packageType' in payment.metadata 
              ? payment.metadata.packageType 
              : null
          }
        });
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
      metadata: {
        ...(payment.metadata as object || {}),
        errorMessage: last_payment_error?.message || 'Payment failed',
      }
    },
  });

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

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: PaymentStatus.refunded,
      metadata: {
        ...(payment.metadata as object || {}),
        refundedAt: new Date().toISOString(),
      }
    },
  });

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

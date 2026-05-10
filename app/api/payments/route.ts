/**
 * API: Payments - Create Payment Intent
 * POST /api/payments - Creare intent plată Stripe
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createPaymentIntent, PromotionPackage, isValidPromotionPackage } from '@/lib/stripe';
import { computeExpectedFinalBaniForUiPackage, inferUiPackageIdFromStripeType } from '@/lib/promotion-packages';
import { logger } from '@/lib/observability';
import { validateSecureRequest } from '@/lib/security/middleware';
// import { checkRateLimit } from '@/lib/rateLimit'; // Not implemented yet
import { PaymentStatus } from '@prisma/client';
import { getStripeProductionPaymentBlockReason } from '@/lib/stripe-publishable-key';

export const runtime = 'nodejs';

const STRIPE_USER_FACING_BLOCKED =
  'Plățile cu card real nu sunt active momentan din cauza unei configurări incomplete. Încearcă mai târziu sau contactează suportul ClickAnunț.';

export async function POST(req: NextRequest) {
  try {
    // CSRF + rate limiting for payment creation (protects promote actions)
    const security = await validateSecureRequest(req, {
      requireCSRF: true,
      rateLimit: 'payment',
    });

    if (!security.success) {
      const status = security.rateLimitError
        ? 429
        : security.csrfError
        ? 403
        : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const stripeBlockReason = getStripeProductionPaymentBlockReason();
    if (stripeBlockReason) {
      logger.error('Stripe: plata blocată (POST /api/payments)', { detail: stripeBlockReason });
      return NextResponse.json({ error: STRIPE_USER_FACING_BLOCKED }, { status: 503 });
    }

    // Rate limiting: TODO - implement rate limiting
    // const rateLimitResult = await checkRateLimit('payment_creation', req);
    // if (!rateLimitResult.success) {
    //   return NextResponse.json(
    //     { error: 'Too many payment attempts. Please try again later.' },
    //     { status: 429 }
    //   );
    // }

    // Verificare autentificare
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Parse body
    const body = await req.json();
    const { listingId, packageType, packageId } = body as {
      listingId?: string;
      packageType?: string;
      packageId?: string;
    };

    // Validare input
    if (!listingId || !packageType) {
      return NextResponse.json(
        { error: 'Missing required fields: listingId, packageType' },
        { status: 400 }
      );
    }

    if (!isValidPromotionPackage(packageType)) {
      return NextResponse.json(
        { error: 'Invalid package type' },
        { status: 400 }
      );
    }

    // Verificare listing există și aparține user-ului
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (listing.ownerUserId !== decoded.userId) {
      return NextResponse.json(
        { error: 'You can only promote your own listings' },
        { status: 403 }
      );
    }

    // Verificare listing este aprobat
    if (listing.status !== 'active') {
      return NextResponse.json(
        { error: 'Only active listings can be promoted' },
        { status: 400 }
      );
    }

    // Get user info pentru email
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { email: true, name: true },
    });

    let amountOverride: number | undefined;
    const uiPid = packageId != null && typeof packageId === 'string' ? packageId.trim() : '';
    if (uiPid) {
      const resolved = await computeExpectedFinalBaniForUiPackage(decoded.userId, uiPid);
      if ('error' in resolved) {
        return NextResponse.json({ error: resolved.error }, { status: 400 });
      }
      amountOverride = resolved.bani;
    }

    const promotionUiMeta = uiPid || inferUiPackageIdFromStripeType(packageType) || '';

    // Creare PaymentIntent în Stripe
    const paymentIntent = await createPaymentIntent({
      userId: decoded.userId,
      listingId,
      packageType: packageType as PromotionPackage,
      customerEmail: user?.email,
      metadata: {
        userName: user?.name || 'Unknown',
        listingTitle: listing.title.substring(0, 100),
        ...(promotionUiMeta ? { promotionUiPackageId: promotionUiMeta } : {}),
      },
      ...(amountOverride !== undefined ? { amount: amountOverride } : {}),
    });

    // Salvare Payment în DB
    const payment = await prisma.payment.create({
      data: {
        userId: decoded.userId,
        stripePaymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency.toUpperCase(),
        status: PaymentStatus.pending,
        purpose: 'promote_listing',
        description: `Promotion for listing ${listingId}`,
        metadata: {
          packageType,
          listingTitle: listing.title,
          listingId,
          promotionUiPackageId: promotionUiMeta,
          finalAmount: paymentIntent.amount,
        },
      },
    });

    logger.info('Payment created', {
      paymentId: payment.id,
      userId: decoded.userId,
      listingId,
      amount: paymentIntent.amount,
      packageType,
    });

    return NextResponse.json({
      paymentId: payment.id,
      clientSecret: paymentIntent.client_secret,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      packageType,
    });
  } catch (error: any) {
    logger.error('Payment creation failed', { error });
    return NextResponse.json(
      { error: error.message || 'Failed to create payment' },
      { status: 500 }
    );
  }
}


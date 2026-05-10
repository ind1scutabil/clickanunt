/**
 * API: Create Payment Intent (CSRF Auth)
 * POST /api/payments/create-intent - Create Stripe PaymentIntent with CSRF authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateSecureRequest } from '@/lib/security/middleware';
import { createPaymentIntent, PromotionPackage, isValidPromotionPackage, PROMOTION_PRICES } from '@/lib/stripe';
import {
  inferUiPackageIdFromStripeType,
  resolvePromotionPaymentBaseBani,
} from '@/lib/promotion-packages';
import { applyUserPromotionDiscountToBaseBani } from '@/lib/promotion-pricing';
import { logger } from '@/lib/observability';
import { PaymentStatus } from '@prisma/client';
import { verifyToken } from '@/lib/auth';
import { getStripeProductionPaymentBlockReason } from '@/lib/stripe-publishable-key';

export const runtime = 'nodejs';

const STRIPE_USER_FACING_BLOCKED =
  'Plățile cu card real nu sunt active momentan din cauza unei configurări incomplete. Încearcă mai târziu sau contactează suportul ClickAnunț.';

function getSafePaymentErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid api key') || normalized.includes('stripe_secret_key')) {
    return 'Plata nu este configurata corect. Te rugam sa contactezi suportul.';
  }

  return 'Nu am putut initializa plata. Te rugam sa incerci din nou.';
}

export async function POST(req: NextRequest) {
  try {
    // Validate CSRF and rate limit
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
      logger.error('Stripe: plata blocată în producție (trebuie chei LIVE în .env pe VPS)', {
        detail: stripeBlockReason,
      });
      return NextResponse.json({ error: STRIPE_USER_FACING_BLOCKED }, { status: 503 });
    }

    // Parse body
    const body = await req.json();
    const { listingId, packageType, customerEmail, packageId } = body as {
      listingId?: string;
      packageType?: string;
      customerEmail?: string;
      packageId?: string;
    };

    // Validate input
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

    // Get listing to find owner
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        title: true,
        status: true,
        ownerUserId: true,
      }
    });

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    // Verify listing is active
    if (listing.status !== 'active') {
      return NextResponse.json(
        { error: 'Only active listings can be promoted' },
        { status: 400 }
      );
    }

    const headerToken = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')?.trim();
    const cookieToken = req.cookies.get('accessToken')?.value;
    const accessToken = headerToken || cookieToken;
    if (!accessToken) {
      return NextResponse.json({ error: 'Autentificare necesară' }, { status: 401 });
    }
    const session = await verifyToken(accessToken);
    const sessionUserId = session?.userId;
    if (!sessionUserId || sessionUserId !== listing.ownerUserId) {
      return NextResponse.json(
        { error: 'Doar proprietarul anunțului poate iniția plata' },
        { status: 403 }
      );
    }

    const userId = listing.ownerUserId;

    // Get user info for receipt email AND discount
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        email: true, 
        name: true,
        promotionDiscountPercent: true,
      },
    });

    // Preț din configurația salvată (admin) când trimite packageId; altfel fallback Stripe
    let baseAmount: number;
    const uiPackageId =
      packageId != null && typeof packageId === 'string' ? packageId.trim() : '';
    if (uiPackageId) {
      const resolved = await resolvePromotionPaymentBaseBani(uiPackageId, packageType);
      if ('error' in resolved) {
        return NextResponse.json({ error: resolved.error }, { status: 400 });
      }
      baseAmount = resolved.amount;
    } else {
      baseAmount = PROMOTION_PRICES[packageType as PromotionPackage];
    }
    
    const finalAmount = applyUserPromotionDiscountToBaseBani(
      baseAmount,
      user?.promotionDiscountPercent
    );
    const discountApplied =
      user?.promotionDiscountPercent && user.promotionDiscountPercent > 0
        ? Math.floor((baseAmount * user.promotionDiscountPercent) / 100)
        : 0;

    const promotionUiPackageIdForMeta =
      uiPackageId || inferUiPackageIdFromStripeType(packageType) || '';

    logger.info('Promotion checkout amounts', {
      userId,
      baseAmount,
      finalAmount,
      discountApplied,
      promotionUiPackageId: promotionUiPackageIdForMeta || undefined,
    });

    // Create PaymentIntent in Stripe with discounted price
    const paymentIntent = await createPaymentIntent({
      userId,
      listingId,
      packageType: packageType as PromotionPackage,
      customerEmail: customerEmail || user?.email,
      metadata: {
        userName: user?.name || 'Unknown',
        listingTitle: listing.title.substring(0, 100),
        baseAmount: baseAmount.toString(),
        discountPercent: user?.promotionDiscountPercent?.toString() || '0',
        discountApplied: discountApplied.toString(),
        ...(promotionUiPackageIdForMeta ? { promotionUiPackageId: promotionUiPackageIdForMeta } : {}),
      },
      // Override amount with discounted price
      amount: finalAmount,
    });

    // Save Payment in DB
    const payment = await prisma.payment.create({
      data: {
        userId,
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
          baseAmount,
          discountPercent: user?.promotionDiscountPercent || 0,
          discountApplied,
          finalAmount,
          ...(promotionUiPackageIdForMeta ? { promotionUiPackageId: promotionUiPackageIdForMeta } : {}),
        },
      },
    });

    logger.info('Payment intent created via CSRF auth', {
      paymentId: payment.id,
      stripePaymentIntentId: paymentIntent.id,
      userId,
      listingId,
      amount: paymentIntent.amount,
      packageType,
      discount: user?.promotionDiscountPercent || 0,
    });

    return NextResponse.json({
      paymentId: payment.id,
      clientSecret: paymentIntent.client_secret,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      packageType,
      discount: {
        percent: user?.promotionDiscountPercent || 0,
        applied: discountApplied,
        baseAmount,
        finalAmount,
      },
    });
  } catch (error: any) {
    // Write error to file for debugging (PM2 doesn't capture console in production)
    const fs = require('fs');
    const errorLog = {
      timestamp: new Date().toISOString(),
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    };
    fs.appendFileSync('/tmp/payment-errors.log', JSON.stringify(errorLog, null, 2) + '\n---\n');
    
    console.error('❌ PAYMENT INTENT ERROR:', error);
    console.error('❌ ERROR STACK:', error?.stack);
    console.error('❌ ERROR MESSAGE:', error?.message);
    logger.error('Payment intent creation failed', { error });
    return NextResponse.json(
      { error: getSafePaymentErrorMessage(error) },
      { status: 500 }
    );
  }
}

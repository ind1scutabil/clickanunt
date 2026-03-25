/**
 * API: Create Payment Intent (CSRF Auth)
 * POST /api/payments/create-intent - Create Stripe PaymentIntent with CSRF authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateSecureRequest } from '@/lib/security/middleware';
import { createPaymentIntent, PromotionPackage, isValidPromotionPackage, PROMOTION_PRICES } from '@/lib/stripe';
import { logger } from '@/lib/observability';
import { PaymentStatus } from '@prisma/client';

export const runtime = 'nodejs';

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

    // Parse body
    const body = await req.json();
    const { listingId, packageType, customerEmail } = body;

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

    console.log('🔍 CREATE INTENT DEBUG:', {
      userId,
      userFound: !!user,
      userEmail: user?.email,
      promotionDiscountPercent: user?.promotionDiscountPercent,
    });

    // Get base price from package
    const baseAmount = PROMOTION_PRICES[packageType as PromotionPackage];
    
    // Apply user discount if available
    let finalAmount = baseAmount;
    let discountApplied = 0;
    
    if (user?.promotionDiscountPercent && user.promotionDiscountPercent > 0) {
      discountApplied = Math.floor((baseAmount * user.promotionDiscountPercent) / 100);
      finalAmount = baseAmount - discountApplied;
      
      // Minimum 2 RON (200 bani) - Stripe requirement
      if (finalAmount < 200) {
        finalAmount = 200;
      }
      
      logger.info('Discount applied', {
        userId,
        baseAmount,
        discountPercent: user.promotionDiscountPercent,
        discountApplied,
        finalAmount,
      });
    } else {
      console.log('⚠️ NO DISCOUNT APPLIED:', {
        hasUser: !!user,
        promotionDiscountPercent: user?.promotionDiscountPercent,
        isGreaterThanZero: (user?.promotionDiscountPercent || 0) > 0,
      });
    }

    console.log('💰 FINAL AMOUNT:', { baseAmount, finalAmount, discountApplied });

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
      },
      // Override amount with discounted price
      amount: finalAmount,
    });

    console.log('🔍 PAYMENT INTENT CREATED:', {
      paymentIntentId: paymentIntent.id,
      hasClientSecret: !!paymentIntent.client_secret,
      clientSecret: paymentIntent.client_secret?.substring(0, 20) || 'MISSING',
      status: paymentIntent.status,
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
        },
      },
    });

    logger.info('Payment intent created via CSRF auth', {
      paymentId: payment.id,
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

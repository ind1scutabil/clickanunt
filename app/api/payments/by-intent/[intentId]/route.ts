/**
 * GET /api/payments/by-intent/[intentId]
 * Owner-only payment status for promote success UX (webhook remains authority).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ intentId: string }> }
) {
  try {
    const { intentId } = await params;
    if (!intentId || !/^pi_[A-Za-z0-9_]+$/.test(intentId)) {
      return NextResponse.json({ error: 'Invalid payment intent id' }, { status: 400 });
    }

    const headerToken = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')?.trim();
    const cookieToken = req.cookies.get('accessToken')?.value;
    const accessToken = headerToken || cookieToken;
    if (!accessToken) {
      return NextResponse.json({ error: 'Autentificare necesară' }, { status: 401 });
    }
    const session = await verifyToken(accessToken);
    if (!session?.userId) {
      return NextResponse.json({ error: 'Autentificare necesară' }, { status: 401 });
    }

    const payment = await prisma.payment.findUnique({
      where: { stripePaymentIntentId: intentId },
      select: {
        id: true,
        userId: true,
        status: true,
        amount: true,
        currency: true,
        purpose: true,
        paidAt: true,
        metadata: true,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (payment.userId !== session.userId) {
      return NextResponse.json({ error: 'Acces interzis' }, { status: 403 });
    }

    const meta = payment.metadata as Record<string, unknown> | null;
    const listingId = meta && typeof meta.listingId === 'string' ? meta.listingId : null;

    let promotionActive = false;
    let promotionExpiresAt: string | null = null;
    if (listingId) {
      const listing = await prisma.listing.findUnique({
        where: { id: listingId },
        select: {
          ownerUserId: true,
          isPromoted: true,
          promotionExpiresAt: true,
        },
      });
      if (listing && listing.ownerUserId === session.userId) {
        promotionActive = Boolean(listing.isPromoted);
        promotionExpiresAt = listing.promotionExpiresAt?.toISOString() ?? null;
      }
    }

    return NextResponse.json({
      paymentId: payment.id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      purpose: payment.purpose,
      paidAt: payment.paidAt,
      listingId,
      promotionActive,
      promotionExpiresAt,
      /**
       * Client success is informational only. Activation is confirmed when
       * status=succeeded AND promotionActive (webhook applied).
       */
      confirmed: payment.status === 'succeeded' && promotionActive,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to load payment status' }, { status: 500 });
  }
}

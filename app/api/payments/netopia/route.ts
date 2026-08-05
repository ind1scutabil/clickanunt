import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { validateSecureRequest } from '@/lib/security/middleware';
import { prisma } from '@/lib/prisma';

/**
 * Netopia card initiation is disabled pending a secure redesign.
 * Previously accepted client-controlled userId/amount without session binding.
 * IPN route remains for any legacy in-flight notifications.
 */
export async function POST(req: NextRequest) {
  const security = await validateSecureRequest(req, {
    requireCSRF: true,
    rateLimit: 'payment',
  });

  if (!security.success) {
    const status = security.rateLimitError ? 429 : security.csrfError ? 403 : 400;
    return NextResponse.json({ error: security.error }, { status });
  }

  const user = await getUserFromRequest(req);
  if (!user?.id) {
    return NextResponse.json({ error: 'Autentificare necesară' }, { status: 401 });
  }

  return NextResponse.json(
    {
      error: 'Netopia payments are disabled. Use Stripe card checkout for promotions.',
      code: 'NETOPIA_DISABLED',
    },
    { status: 403 }
  );
}

/** Owner-only payment status lookup (no arbitrary ID leakage). */
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user?.id) {
      return NextResponse.json({ error: 'Autentificare necesară' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const paymentId = searchParams.get('payment_id');

    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID required' }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        userId: true,
        status: true,
        amount: true,
        currency: true,
        createdAt: true,
        paidAt: true,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (payment.userId !== user.id) {
      return NextResponse.json({ error: 'Acces interzis' }, { status: 403 });
    }

    return NextResponse.json({
      id: payment.id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      createdAt: payment.createdAt,
      paidAt: payment.paidAt,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to get payment' }, { status: 500 });
  }
}

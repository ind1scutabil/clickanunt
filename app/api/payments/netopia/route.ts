import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createNetopiaClient, NETOPIA_STATUS } from '@/lib/netopia';
import { validateSecureRequest } from '@/lib/security/middleware';

// Create Netopia payment
export async function POST(req: NextRequest) {
  try {
    const security = await validateSecureRequest(req, {
      requireCSRF: true,
      rateLimit: 'payment',
    });

    if (!security.success) {
      const status = security.rateLimitError ? 429 : security.csrfError ? 403 : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const body = await req.json();
    const { userId, promotionId, amount, currency = 'RON' } = body;

    if (!userId || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        userId,
        amount,
        currency,
        status: 'pending',
        method: 'card',
        purpose: promotionId ? 'promotion' : 'subscription',
        description: `Payment for ${promotionId ? 'promotion' : 'subscription'}`,
        metadata: {
          promotionId,
          provider: 'netopia',
        },
      },
    });

    // Create Netopia payment request
    const netopia = createNetopiaClient();
    const paymentRequest = await netopia.createPayment({
      orderId: payment.id,
      amount: amount * 100, // Convert to bani (cents)
      currency,
      details: `Plată ${promotionId ? 'promovare' : 'abonament'} - Order ${payment.id}`,
      billing: {
        email: user.email,
        phone: user.phone || '',
        firstName: user.name?.split(' ')[0] || '',
        lastName: user.name?.split(' ').slice(1).join(' ') || '',
        country: 'RO',
      },
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payments/success?payment_id=${payment.id}`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payments/cancel?payment_id=${payment.id}`,
      notifyUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/netopia/ipn`,
    });

    // Update payment with Netopia reference
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        metadata: {
          ...payment.metadata as any,
          netopiaUrl: paymentRequest.url,
        },
      },
    });

    return NextResponse.json({
      paymentId: payment.id,
      redirectUrl: paymentRequest.url,
      data: paymentRequest.data,
      envKey: paymentRequest.env_key,
    });
  } catch (error: any) {
    console.error('Netopia payment creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}

// Get payment status
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const paymentId = searchParams.get('payment_id');

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID required' },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        status: true,
        amount: true,
        currency: true,
        metadata: true,
        createdAt: true,
        paidAt: true,
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(payment);
  } catch (error: any) {
    console.error('Get payment error:', error);
    return NextResponse.json(
      { error: 'Failed to get payment' },
      { status: 500 }
    );
  }
}

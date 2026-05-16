import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { validateSecureRequest } from '@/lib/security/middleware';
import { SUBSCRIPTION_PLANS } from '@/lib/verification';

const subscriptionTierSchema = z
  .object({
    tier: z.enum(['business', 'premium']),
  })
  .strict();

async function requireAuthenticatedUser(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { user };
}

/**
 * Upgrade subscription
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser(req);
    if ('error' in auth) return auth.error;

    const security = await validateSecureRequest(req, {
      requireCSRF: true,
      rateLimit: 'api',
      schema: subscriptionTierSchema,
    });

    if (!security.success) {
      const status = security.rateLimitError
        ? 429
        : security.csrfError
          ? 403
          : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const { tier } = security.data as z.infer<typeof subscriptionTierSchema>;
    const session = { user: { id: auth.user.id } };

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (
      (tier === 'business' && user.subscriptionTier !== 'free') ||
      (tier === 'premium' && user.subscriptionTier === 'premium')
    ) {
      return NextResponse.json(
        { error: 'Already subscribed to this or higher tier' },
        { status: 400 }
      );
    }

    const plan = SUBSCRIPTION_PLANS[tier as keyof typeof SUBSCRIPTION_PLANS];

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    const freeBoosts = tier === 'business' ? 3 : tier === 'premium' ? 5 : 0;
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionTier: tier as 'business' | 'premium',
        subscriptionExpiresAt: expiresAt,
        subscriptionRenewsAt: expiresAt,
        freeBoostsRemaining: freeBoosts,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'upgrade_subscription',
        resource: 'subscription',
        resourceId: user.id,
        details: {
          fromTier: user.subscriptionTier,
          toTier: tier,
          price: plan.price,
        },
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '',
        userAgent: req.headers.get('user-agent') || '',
      },
    });

    return NextResponse.json({
      message: 'Subscription upgraded successfully',
      subscription: {
        tier: updatedUser.subscriptionTier,
        expiresAt: updatedUser.subscriptionExpiresAt,
        freeBoostsRemaining: updatedUser.freeBoostsRemaining,
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to upgrade subscription' },
      { status: 500 }
    );
  }
}

/**
 * Cancel subscription
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser(req);
    if ('error' in auth) return auth.error;

    const security = await validateSecureRequest(req, {
      requireCSRF: true,
      rateLimit: 'api',
    });

    if (!security.success) {
      const status = security.rateLimitError
        ? 429
        : security.csrfError
          ? 403
          : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const session = { user: { id: auth.user.id } };

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.subscriptionTier === 'free') {
      return NextResponse.json(
        { error: 'No active subscription to cancel' },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionRenewsAt: null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'cancel_subscription',
        resource: 'subscription',
        resourceId: user.id,
        details: {
          tier: user.subscriptionTier,
          expiresAt: user.subscriptionExpiresAt,
        },
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '',
        userAgent: req.headers.get('user-agent') || '',
      },
    });

    return NextResponse.json({
      message: 'Subscription will be canceled at end of period',
      subscription: {
        tier: updatedUser.subscriptionTier,
        expiresAt: updatedUser.subscriptionExpiresAt,
        willRenew: false,
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}

/**
 * Get subscription status
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser(req);
    if ('error' in auth) return auth.error;

    const user = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: {
        subscriptionTier: true,
        subscriptionExpiresAt: true,
        subscriptionRenewsAt: true,
        freeBoostsRemaining: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const plan = SUBSCRIPTION_PLANS[user.subscriptionTier as keyof typeof SUBSCRIPTION_PLANS];

    return NextResponse.json({
      tier: user.subscriptionTier,
      expiresAt: user.subscriptionExpiresAt,
      willRenew: !!user.subscriptionRenewsAt,
      renewsAt: user.subscriptionRenewsAt,
      freeBoostsRemaining: user.freeBoostsRemaining,
      plan: {
        name: plan.name,
        price: plan.price,
        features: plan.features,
        limits: plan.limits,
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to get subscription' },
      { status: 500 }
    );
  }
}

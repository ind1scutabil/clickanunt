import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SUBSCRIPTION_PLANS } from '@/lib/verification';

/**
 * Upgrade subscription
 */
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const session = { user: { id: userId } };

    const body = await req.json();
    const { tier } = body;

    if (!tier || !['business', 'premium'].includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid subscription tier' },
        { status: 400 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if already on this tier or higher
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
    
    // Calculate expiry date (1 month from now)
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    // Update user subscription
    const freeBoosts = tier === 'business' ? 3 : tier === 'premium' ? 5 : 0;
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionTier: tier as any,
        subscriptionExpiresAt: expiresAt,
        subscriptionRenewsAt: expiresAt,
        freeBoostsRemaining: freeBoosts,
      },
    });

    // Create audit log
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
  } catch (error: any) {
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
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const session = { user: { id: userId } };

    // Get user
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

    // Set to expire at current period end
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionRenewsAt: null, // Don't renew
        // Keep subscriptionTier until expiry date
      },
    });

    // Create audit log
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
  } catch (error: any) {
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
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const session = { user: { id: userId } };

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
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
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to get subscription' },
      { status: 500 }
    );
  }
}

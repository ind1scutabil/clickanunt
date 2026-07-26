import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { isAdminOrOwner } from "@/lib/rbac";
import { validateSecureRequest } from "@/lib/security/middleware";
import { createAuditLog } from "@/lib/audit";
import {
  normalizeSubscriptionTier,
  subscriptionTierLabel,
  type KnownSubscriptionTier,
} from "@/lib/subscription-tier";

/**
 * Internal admin workflow only — account subscriptions are manual (Business via /business → /contact).
 * Standard authenticated users must not self-grant or cancel tiers.
 * No UI consumer for POST/DELETE as of marketplace audit; kept for authorized ops + tests.
 */

const adminSetTierSchema = z
  .object({
    tier: z.enum(["free", "business", "premium"]),
    userId: z.string().uuid(),
  })
  .strict();

const adminCancelSchema = z
  .object({
    userId: z.string().uuid(),
  })
  .strict();

function clientMeta(req: NextRequest) {
  return {
    ipAddress:
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "",
    userAgent: req.headers.get("user-agent") || "",
  };
}

function freeBoostsForTier(tier: KnownSubscriptionTier): number {
  if (tier === "business") return 3;
  if (tier === "premium") return 5;
  return 0;
}

async function requireAuthenticatedUser(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { user };
}

function forbidUnlessAdmin(user: { role?: string | null }) {
  if (!isAdminOrOwner(user as Parameters<typeof isAdminOrOwner>[0])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

/**
 * Admin-only: set a user's subscription tier (manual commercial model).
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser(req);
    if ("error" in auth) return auth.error;

    const denied = forbidUnlessAdmin(auth.user);
    if (denied) return denied;

    const security = await validateSecureRequest(req, {
      requireCSRF: true,
      rateLimit: "api",
      schema: adminSetTierSchema,
    });

    if (!security.success) {
      const status = security.rateLimitError
        ? 429
        : security.csrfError
          ? 403
          : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const { tier, userId } = security.data as z.infer<typeof adminSetTierSchema>;

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        subscriptionTier: true,
        subscriptionExpiresAt: true,
        subscriptionRenewsAt: true,
        freeBoostsRemaining: true,
      },
    });

    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const fromTier = normalizeSubscriptionTier(target.subscriptionTier);
    const expiresAt =
      tier === "free"
        ? null
        : (() => {
            const d = new Date();
            d.setMonth(d.getMonth() + 1);
            return d;
          })();

    const updatedUser = await prisma.user.update({
      where: { id: target.id },
      data: {
        subscriptionTier: tier,
        subscriptionExpiresAt: expiresAt,
        subscriptionRenewsAt: tier === "free" ? null : expiresAt,
        freeBoostsRemaining: freeBoostsForTier(tier),
      },
      select: {
        subscriptionTier: true,
        subscriptionExpiresAt: true,
        freeBoostsRemaining: true,
      },
    });

    const meta = clientMeta(req);
    await createAuditLog({
      userId: auth.user.id,
      action: "subscription.admin_set_tier",
      resource: "subscription",
      resourceId: target.id,
      details: {
        actorRole: auth.user.role,
        targetUserId: target.id,
        fromTier,
        toTier: tier,
      },
      ...meta,
    });

    return NextResponse.json({
      message: "Subscription updated",
      subscription: {
        tier: normalizeSubscriptionTier(updatedUser.subscriptionTier),
        expiresAt: updatedUser.subscriptionExpiresAt,
        freeBoostsRemaining: updatedUser.freeBoostsRemaining,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to update subscription" },
      { status: 500 }
    );
  }
}

/**
 * Admin-only: cancel renewal for a target user (tier remains until expiry).
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser(req);
    if ("error" in auth) return auth.error;

    const denied = forbidUnlessAdmin(auth.user);
    if (denied) return denied;

    const security = await validateSecureRequest(req, {
      requireCSRF: true,
      rateLimit: "api",
      schema: adminCancelSchema,
    });

    if (!security.success) {
      const status = security.rateLimitError
        ? 429
        : security.csrfError
          ? 403
          : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const { userId } = security.data as z.infer<typeof adminCancelSchema>;

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        subscriptionTier: true,
        subscriptionExpiresAt: true,
        subscriptionRenewsAt: true,
      },
    });

    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const tier = normalizeSubscriptionTier(target.subscriptionTier);
    if (tier === "free") {
      return NextResponse.json(
        { error: "No active subscription to cancel" },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: target.id },
      data: {
        subscriptionRenewsAt: null,
      },
      select: {
        subscriptionTier: true,
        subscriptionExpiresAt: true,
        subscriptionRenewsAt: true,
      },
    });

    const meta = clientMeta(req);
    await createAuditLog({
      userId: auth.user.id,
      action: "subscription.admin_cancel_renewal",
      resource: "subscription",
      resourceId: target.id,
      details: {
        actorRole: auth.user.role,
        targetUserId: target.id,
        tier,
        expiresAt: target.subscriptionExpiresAt,
      },
      ...meta,
    });

    return NextResponse.json({
      message: "Subscription will be canceled at end of period",
      subscription: {
        tier: normalizeSubscriptionTier(updatedUser.subscriptionTier),
        expiresAt: updatedUser.subscriptionExpiresAt,
        willRenew: false,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}

/**
 * Authenticated user: read own subscription status only.
 * Query userId for another account is ignored / forbidden.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser(req);
    if ("error" in auth) return auth.error;

    const requestedUserId = req.nextUrl.searchParams.get("userId");
    if (requestedUserId && requestedUserId !== auth.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const tier = normalizeSubscriptionTier(user.subscriptionTier);

    // Do not expose placeholder/unverified commercial prices from legacy plan tables.
    return NextResponse.json({
      tier,
      label: subscriptionTierLabel(tier),
      expiresAt: user.subscriptionExpiresAt,
      willRenew: !!user.subscriptionRenewsAt,
      renewsAt: user.subscriptionRenewsAt,
      freeBoostsRemaining: user.freeBoostsRemaining,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to get subscription" },
      { status: 500 }
    );
  }
}

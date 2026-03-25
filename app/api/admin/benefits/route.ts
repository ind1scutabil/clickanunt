/**
 * API Route: Admin - Global Benefits
 */

export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { validateSecureRequest } from "@/lib/security/middleware";
import type { UserRole } from "@prisma/client";
import { z } from "zod";

type PromotionBenefits = {
  promotions?: Record<string, { count?: number; expiresAt?: string | null }>;
};

const benefitsSchema = z.object({
  globalDiscount: z.coerce.number().min(0).max(100).default(0),
  freePromotions: z.coerce.number().min(0).default(0),
  promotionType: z.enum(['top', 'urgent', 'featured', 'refresh']),
  creditsBonus: z.coerce.number().min(0).default(0),
  applyTo: z.enum(['all', 'new', 'active', 'inactive']).default('all'),
  expiryDays: z.coerce.number().min(1).default(30),
}).strict();

function getSegmentWhere(segment: string) {
  const now = new Date();
  const days30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const days7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  switch (segment) {
    case 'active':
      return { isBanned: false, lastLoginAt: { gte: days30 } };
    case 'inactive':
      return { OR: [{ lastLoginAt: { lt: days30 } }, { lastLoginAt: null }] };
    case 'new':
      return { createdAt: { gte: days7 } };
    case 'banned':
      return { isBanned: true };
    default:
      return {};
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user || !hasPermission(user.role as UserRole, Permission.SETTINGS_UPDATE)) {
      return NextResponse.json({ error: "Acces interzis" }, { status: 403 });
    }

    const security = await validateSecureRequest(request, {
      requireCSRF: true,
      schema: benefitsSchema,
    });

    if (!security.success) {
      const status = security.csrfError ? 403 : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const {
      globalDiscount,
      freePromotions,
      promotionType,
      creditsBonus,
      applyTo,
      expiryDays,
    } = security.data as z.infer<typeof benefitsSchema>;

    const discountValue = globalDiscount;
    const freeCount = freePromotions;
    const creditsValue = creditsBonus;
    const expiryValue = expiryDays;

    const where = getSegmentWhere(applyTo);
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        creditsBalance: true,
        promotionDiscountPercent: true,
        promotionBenefits: true,
      },
    });

    const expiresAt = new Date(Date.now() + expiryValue * 24 * 60 * 60 * 1000);
    let updated = 0;

    for (const target of users) {
      const benefits = (target.promotionBenefits as PromotionBenefits) || {};
      const promotions = benefits.promotions || {};
      const current = promotions[promotionType] || { count: 0, expiresAt: null };

      promotions[promotionType] = {
        count: (current.count || 0) + freeCount,
        expiresAt: expiresAt.toISOString(),
      };

      await prisma.user.update({
        where: { id: target.id },
        data: {
          creditsBalance: (target.creditsBalance || 0) + creditsValue,
          promotionDiscountPercent: discountValue,
          promotionBenefits: { ...benefits, promotions },
        },
      });
      updated++;
    }

    await createAuditLog({
      userId: user.id,
      action: 'benefits.apply',
      resource: 'user',
      details: {
        segment: applyTo || 'all',
        discount: discountValue,
        credits: creditsValue,
        freePromotions: freeCount,
        promotionType,
        expiryDays: expiryValue,
      },
    });

    return NextResponse.json({
      success: true,
      updated,
      message: 'Beneficiile au fost aplicate',
    });
  } catch (error) {
    console.error('Apply benefits error:', error);
    return NextResponse.json({ error: "Eroare la aplicarea beneficiilor" }, { status: 500 });
  }
}

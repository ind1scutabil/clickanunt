/**
 * API Route: Admin - Global Benefits
 */

export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import type { UserRole } from "@prisma/client";

type PromotionBenefits = {
  promotions?: Record<string, { count?: number; expiresAt?: string | null }>;
};

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

    const body = await request.json();
    const {
      globalDiscount,
      freePromotions,
      promotionType,
      creditsBonus,
      applyTo,
      expiryDays,
    } = body;

    const discountValue = Math.max(0, Math.min(100, parseInt(globalDiscount ?? '0', 10)));
    const freeCount = Math.max(0, parseInt(freePromotions ?? '0', 10));
    const creditsValue = Math.max(0, parseInt(creditsBonus ?? '0', 10));
    const expiryValue = Math.max(1, parseInt(expiryDays ?? '30', 10));

    if (!promotionType) {
      return NextResponse.json({ error: "Tipul de promovare este necesar" }, { status: 400 });
    }

    const where = getSegmentWhere(applyTo || 'all');
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

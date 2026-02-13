/**
 * API Route: Admin - Bulk User Actions by Segment
 */

export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { validateSecureRequest } from "@/lib/security/middleware";
import type { UserRole } from "@prisma/client";

type PromotionBenefits = {
  promotions?: Record<string, { count?: number; expiresAt?: string | null }>;
};

type BulkUsersRequest = {
  segment?: string;
  action?: string;
  percent?: string | number;
  freePromos?: string | number;
  promotionType?: string;
  expiryDays?: string | number;
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

    if (!user || !hasPermission(user.role as UserRole, Permission.USERS_UPDATE_ANY)) {
      return NextResponse.json({ error: "Acces interzis" }, { status: 403 });
    }

    const security = await validateSecureRequest(request, {
      requireCSRF: true,
    });

    if (!security.success) {
      const status = security.csrfError ? 403 : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const body = security.data as BulkUsersRequest;
    const { segment, action, percent, freePromos, promotionType, expiryDays } = body;

    if (!segment || !action) {
      return NextResponse.json({ error: "Segment și acțiune sunt necesare" }, { status: 400 });
    }

    const where = getSegmentWhere(segment);
    const users = await prisma.user.findMany({
      where,
      select: { id: true, promotionBenefits: true },
    });

    let updated = 0;
    const expiryValue = Math.max(1, parseInt(String(expiryDays ?? 30), 10));
    const expiresAt = new Date(Date.now() + expiryValue * 24 * 60 * 60 * 1000);

    if (action === 'deactivate') {
      const result = await prisma.user.updateMany({
        where: { ...where, role: { not: 'owner' } },
        data: {
          isBanned: true,
          bannedAt: new Date(),
          banReason: 'Dezactivare bulk (admin)',
        },
      });
      updated = result.count;
    } else if (action === 'activate') {
      const result = await prisma.user.updateMany({
        where,
        data: { isBanned: false, bannedAt: null, banReason: null },
      });
      updated = result.count;
    } else if (action === 'grant_discount') {
      const discountValue = Math.max(0, Math.min(100, parseInt(String(percent ?? 0), 10)));
      const result = await prisma.user.updateMany({
        where,
        data: { promotionDiscountPercent: discountValue },
      });
      updated = result.count;
    } else if (action === 'grant_free_promos') {
      const count = Math.max(0, parseInt(String(freePromos ?? 0), 10));
      const promoType = promotionType || 'top';

      for (const target of users) {
        const benefits = (target.promotionBenefits as PromotionBenefits) || {};
        const promotions = benefits.promotions || {};
        const current = promotions[promoType] || { count: 0, expiresAt: null };

        promotions[promoType] = {
          count: (current.count || 0) + count,
          expiresAt: expiresAt.toISOString(),
        };

        await prisma.user.update({
          where: { id: target.id },
          data: { promotionBenefits: { ...benefits, promotions } },
        });
        updated++;
      }
    } else {
      return NextResponse.json({ error: "Acțiune invalidă" }, { status: 400 });
    }

    await createAuditLog({
      userId: user.id,
      action: `bulk.${action}`,
      resource: 'user',
      details: { segment, action, updated },
    });

    return NextResponse.json({ success: true, updated });
  } catch (error) {
    console.error('Bulk users error:', error);
    return NextResponse.json({ error: "Eroare la bulk action" }, { status: 500 });
  }
}

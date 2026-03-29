/**
 * API Route: Admin - Update User Benefits (Individual)
 */

export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { validateSecureRequest } from "@/lib/security/middleware";
import type { UserRole } from "@prisma/client";
import { z } from "zod";

const benefitsSchema = z.object({
  creditsBonus: z.number().min(0).optional(),
  globalDiscount: z.number().min(0).max(100).optional(),
  freePromotions: z.number().min(0).optional(),
  promotionType: z.enum(['top', 'urgent', 'featured', 'refresh']).optional(),
  expiryDays: z.number().min(1).optional(),
});

type PromotionBenefits = {
  promotions?: Record<string, { count?: number; expiresAt?: string | null }>;
};

class RequestTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RequestTimeoutError';
  }
}

async function withTimeout(promise: Promise<any>, ms: number, label: string): Promise<any> {
  let timeoutId: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<any>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new RequestTimeoutError(`Timeout: ${label} after ${ms}ms`));
    }, ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const timeoutMs = 15000;

    const adminUser = await withTimeout(getUserFromRequest(request), timeoutMs, 'getUserFromRequest');

    if (!adminUser || !hasPermission(adminUser.role as UserRole, Permission.SETTINGS_UPDATE)) {
      return NextResponse.json({ error: "Acces interzis" }, { status: 403 });
    }

    const security = await withTimeout(
      validateSecureRequest(request, {
        requireCSRF: true,
        schema: benefitsSchema,
      }),
      timeoutMs,
      'validateSecureRequest'
    );

    if (!security.success) {
      const status = security.csrfError ? 403 : 400;
      console.warn('[BENEFITS] security_failed', {
        status,
        csrfError: security.csrfError,
        validationError: security.validationError,
        rateLimitError: security.rateLimitError,
        error: security.error,
      });
      return NextResponse.json({ error: security.error }, { status });
    }

    const data = security.data as z.infer<typeof benefitsSchema>;

    const targetUser = await withTimeout(db.findUserById(id), timeoutMs, 'findUserById');
    if (!targetUser) {
      return NextResponse.json({ error: "Utilizatorul nu a fost găsit" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (data.creditsBonus !== undefined) {
      updateData.creditsBalance = Math.max(0, (targetUser.creditsBalance || 0) + data.creditsBonus);
    }

    if (data.globalDiscount !== undefined) {
      updateData.promotionDiscountPercent = data.globalDiscount;
    }

    if (data.freePromotions !== undefined && data.promotionType) {
      const benefits = (targetUser.promotionBenefits as PromotionBenefits) || {};
      const promotions = benefits.promotions || {};
      const current = promotions[data.promotionType] || { count: 0, expiresAt: null };

      const expiryDays = data.expiryDays || 30;
      const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

      promotions[data.promotionType] = {
        count: data.freePromotions > 0 ? (current.count || 0) + data.freePromotions : 0,
        expiresAt: data.freePromotions > 0 ? expiresAt.toISOString() : null,
      };

      updateData.promotionBenefits = { ...benefits, promotions };
      updateData.freeBoostsRemaining = data.freePromotions;
    } else if (data.freePromotions !== undefined) {
      updateData.freeBoostsRemaining = data.freePromotions;
    }

    await withTimeout(db.updateUser(id, updateData), timeoutMs, 'updateUser');

    await withTimeout(
      createAuditLog({
        userId: adminUser.id,
        action: 'benefits.user_update',
        resource: 'user',
        resourceId: id,
        details: {
          targetEmail: targetUser.email,
          credits: data.creditsBonus,
          discount: data.globalDiscount,
          freePromotions: data.freePromotions,
          promotionType: data.promotionType,
          expiryDays: data.expiryDays,
        },
      }),
      timeoutMs,
      'createAuditLog'
    );

    return NextResponse.json({
      success: true,
      message: 'Beneficiile au fost actualizate cu succes',
      user: {
        id: targetUser.id,
        email: targetUser.email,
        creditsBalance: typeof updateData.creditsBalance === 'number' ? updateData.creditsBalance : targetUser.creditsBalance,
        promotionDiscountPercent: updateData.promotionDiscountPercent ?? targetUser.promotionDiscountPercent,
        promotionBenefits: updateData.promotionBenefits ?? targetUser.promotionBenefits,
      },
    });
  } catch (error) {
    console.error('Update user benefits error:', error);
    if (error instanceof RequestTimeoutError) {
      return NextResponse.json(
        { error: 'Timeout la actualizarea beneficiilor. Reîncearcă.' },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { error: "Eroare la actualizarea beneficiilor" },
      { status: 500 }
    );
  }
}
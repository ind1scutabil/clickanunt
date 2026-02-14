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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminUser = await getUserFromRequest(request);

    if (!adminUser || !hasPermission(adminUser.role as UserRole, Permission.SETTINGS_UPDATE)) {
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

    const data = security.data as z.infer<typeof benefitsSchema>;

    // Find target user
    const targetUser = await db.findUserById(id);
    if (!targetUser) {
      return NextResponse.json({ error: "Utilizatorul nu a fost găsit" }, { status: 404 });
    }

    const updateData: any = {};

    // Add credits
    if (data.creditsBonus && data.creditsBonus > 0) {
      updateData.creditsBalance = (targetUser.creditsBalance || 0) + data.creditsBonus;
    }

    // Set discount
    if (data.globalDiscount !== undefined) {
      updateData.promotionDiscountPercent = data.globalDiscount;
    }

    // Add free promotions
    if (data.freePromotions && data.freePromotions > 0 && data.promotionType) {
      const benefits = (targetUser.promotionBenefits as PromotionBenefits) || {};
      const promotions = benefits.promotions || {};
      const current = promotions[data.promotionType] || { count: 0, expiresAt: null };
      
      const expiryDays = data.expiryDays || 30;
      const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

      promotions[data.promotionType] = {
        count: (current.count || 0) + data.freePromotions,
        expiresAt: expiresAt.toISOString(),
      };

      updateData.promotionBenefits = { ...benefits, promotions };
    }

    // Update user
    await db.updateUser(id, updateData);

    // Create audit log
    await createAuditLog({
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
    });

    return NextResponse.json({
      success: true,
      message: 'Beneficiile au fost actualizate cu succes',
      user: {
        id: targetUser.id,
        email: targetUser.email,
        creditsBalance: updateData.creditsBalance || targetUser.creditsBalance,
        promotionDiscountPercent: updateData.promotionDiscountPercent ?? targetUser.promotionDiscountPercent,
      },
    });
  } catch (error) {
    console.error('Update user benefits error:', error);
    return NextResponse.json(
      { error: "Eroare la actualizarea beneficiilor" },
      { status: 500 }
    );
  }
}

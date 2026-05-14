export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateSecureRequest } from "@/lib/security/middleware";
import { userNotificationPreferencesSchema } from "@/lib/security/validation-schemas";
import {
  getAccountSettingsFromBenefits,
  mergeAccountSettingsIntoBenefits,
} from "@/lib/user-account-settings-json";

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
    }

    const security = await validateSecureRequest(request, {
      requireCSRF: true,
      rateLimit: "api",
      schema: userNotificationPreferencesSchema,
    });

    if (!security.success) {
      const status = security.rateLimitError
        ? 429
        : security.csrfError
          ? 403
          : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const prefs = security.data as Record<string, boolean | undefined>;

    const existing = await prisma.user.findUnique({
      where: { id: user.id },
      select: { promotionBenefits: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Utilizator inexistent" }, { status: 404 });
    }

    const current = getAccountSettingsFromBenefits(existing.promotionBenefits);
    const partial: Partial<typeof current.notifications> = {};
    (['email', 'sms', 'push', 'newMessages', 'priceAlerts', 'newsletter'] as const).forEach(
      (k) => {
        if (prefs[k] !== undefined) partial[k] = prefs[k] as boolean;
      }
    );

    const merged = mergeAccountSettingsIntoBenefits(existing.promotionBenefits, {
      notifications: { ...current.notifications, ...partial },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { promotionBenefits: merged as Prisma.InputJsonValue },
    });

    return NextResponse.json({
      success: true,
      notifications: getAccountSettingsFromBenefits(merged).notifications,
    });
  } catch {
    return NextResponse.json(
      { error: "Eroare la salvarea preferințelor" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateSecureRequest } from "@/lib/security/middleware";
import { userProfileSettingsPatchSchema } from "@/lib/security/validation-schemas";
import {
  getAccountSettingsFromBenefits,
  mergeAccountSettingsIntoBenefits,
} from "@/lib/user-account-settings-json";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        role: true,
        accountType: true,
        createdAt: true,
        trustScore: true,
        emailVerified: true,
        phoneVerified: true,
        creditsBalance: true,
        promotionDiscountPercent: true,
        promotionBenefits: true,
        twoFactorEnabled: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { location, notifications } = getAccountSettingsFromBenefits(
      dbUser.promotionBenefits
    );

    return NextResponse.json({
      ...dbUser,
      location,
      notificationPreferences: notifications,
    });
  } catch {
    return NextResponse.json({ error: "Eroare la preluare date" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
    }

    const security = await validateSecureRequest(request, {
      requireCSRF: true,
      rateLimit: "api",
      schema: userProfileSettingsPatchSchema,
    });

    if (!security.success) {
      const status = security.rateLimitError
        ? 429
        : security.csrfError
          ? 403
          : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const body = security.data as {
      name?: string;
      phone?: string;
      location?: string;
    };

    const existing = await prisma.user.findUnique({
      where: { id: user.id },
      select: { promotionBenefits: true, name: true, phone: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Utilizator inexistent" }, { status: 404 });
    }

    const data: {
      name?: string | null;
      phone?: string | null;
      promotionBenefits?: Prisma.InputJsonValue;
    } = {};

    if (body.name !== undefined) {
      data.name = body.name;
    }
    if (body.phone !== undefined) {
      const p = body.phone.trim();
      data.phone = p.length === 0 ? null : p;
    }

    if (body.location !== undefined) {
      const loc = body.location.trim().slice(0, 200);
      const merged = mergeAccountSettingsIntoBenefits(existing.promotionBenefits, {
        profile: { location: loc },
      });
      data.promotionBenefits = merged as Prisma.InputJsonValue;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nicio modificare" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        role: true,
        accountType: true,
        createdAt: true,
        promotionBenefits: true,
      },
    });

    const { location, notifications } = getAccountSettingsFromBenefits(
      updated.promotionBenefits
    );

    return NextResponse.json({
      success: true,
      user: {
        ...updated,
        location,
        notificationPreferences: notifications,
      },
      message: "Profil actualizat cu succes",
    });
  } catch {
    return NextResponse.json({ error: "Eroare la actualizare" }, { status: 500 });
  }
}

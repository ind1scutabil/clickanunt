export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import type { UserRole } from "@prisma/client";
import { canAccessAdminNotifications } from "@/lib/admin-notification-access";
import { validateSecureRequest } from "@/lib/security/middleware";

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || !canAccessAdminNotifications(user.role as UserRole)) {
      return NextResponse.json({ error: "Acces interzis" }, { status: 403 });
    }

    const sec = await validateSecureRequest(request, { requireCSRF: true });
    if (!sec.success) {
      return NextResponse.json(
        { error: sec.error || "Validare eșuată" },
        { status: sec.csrfError ? 403 : 400 }
      );
    }

    const now = new Date();
    const result = await prisma.adminNotification.updateMany({
      where: { readAt: null },
      data: { readAt: now },
    });

    return NextResponse.json({
      success: true,
      updated: result.count,
    });
  } catch {
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}

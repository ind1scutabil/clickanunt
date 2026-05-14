export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import type { UserRole } from "@prisma/client";
import { canAccessAdminNotifications } from "@/lib/admin-notification-access";
import { validateSecureRequest } from "@/lib/security/middleware";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const row = await prisma.adminNotification.update({
      where: { id },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ success: true, notification: row });
  } catch (e: unknown) {
    const code =
      e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : "";
    if (code === "P2025") {
      return NextResponse.json({ error: "Notificare inexistentă" }, { status: 404 });
    }
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}

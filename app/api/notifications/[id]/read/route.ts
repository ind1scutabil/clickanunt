export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { validateSecureRequest } from "@/lib/security/middleware";

/**
 * POST /api/notifications/[id]/read
 * Mark one in-app notification as read (owner only).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sec = await validateSecureRequest(request, { requireCSRF: true });
    if (!sec.success) {
      return NextResponse.json(
        { error: sec.error || "Validare eșuată" },
        { status: sec.csrfError ? 403 : 400 }
      );
    }

    const { id } = await params;
    const existing = await prisma.userNotification.findFirst({
      where: { id, userId: user.id },
      select: { id: true, isRead: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Notificare inexistentă" }, { status: 404 });
    }

    if (existing.isRead) {
      return NextResponse.json(
        { success: true, alreadyRead: true },
        { headers: { "Cache-Control": "private, no-store" } }
      );
    }

    const row = await prisma.userNotification.update({
      where: { id: existing.id },
      data: { isRead: true, readAt: new Date() },
      select: {
        id: true,
        isRead: true,
        readAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        notification: {
          id: row.id,
          isRead: row.isRead,
          readAt: row.readAt?.toISOString() ?? null,
        },
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (e) {
    console.error("POST /api/notifications/[id]/read", e);
    return NextResponse.json({ error: "Failed to mark read" }, { status: 500 });
  }
}

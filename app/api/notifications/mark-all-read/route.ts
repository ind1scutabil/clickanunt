export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { validateSecureRequest } from "@/lib/security/middleware";

/**
 * POST /api/notifications/mark-all-read
 * Mark all of the caller's in-app notifications as read.
 */
export async function POST(request: NextRequest) {
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

    const result = await prisma.userNotification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return NextResponse.json(
      { success: true, updated: result.count },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (e) {
    console.error("POST /api/notifications/mark-all-read", e);
    return NextResponse.json({ error: "Failed to mark all read" }, { status: 500 });
  }
}

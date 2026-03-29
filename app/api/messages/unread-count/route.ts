import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/messages/unread-count
 * Lightweight: total unread messages for current user (navbar badge).
 * Avoids loading full conversation list.
 */
export async function GET(request: NextRequest) {
  try {
    const headerToken = request.headers.get("authorization")?.replace("Bearer ", "")?.trim();
    const cookieToken = request.cookies.get("accessToken")?.value;
    const candidateTokens = [headerToken, cookieToken].filter(
      (t): t is string => !!t && t !== "null" && t !== "undefined"
    );
    let payload = null;
    for (const candidate of candidateTokens) {
      payload = await verifyToken(candidate);
      if (payload) break;
    }

    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId =
      (payload as { userId?: string; sub?: string }).userId ||
      (payload as { sub?: string }).sub;
    if (!userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const count = await prisma.message.count({
      where: {
        receiverId: userId,
        isRead: false,
      },
    });

    return NextResponse.json({ count }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error: unknown) {
    console.error("[unread-count]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

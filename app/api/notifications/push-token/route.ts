export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { validateSecureRequest } from "@/lib/security/middleware";

const pushTokenSchema = z
  .object({
    expoPushToken: z.string().min(10).max(2000),
    platform: z.enum(["ios", "android", "web"]),
  })
  .strict();

/**
 * POST /api/notifications/push-token
 * Persist device token for future push delivery (no external push calls in this phase).
 */
export async function POST(req: NextRequest) {
  try {
    const security = await validateSecureRequest(req, {
      requireCSRF: true,
      rateLimit: "api",
      schema: pushTokenSchema,
    });

    if (!security.success) {
      return NextResponse.json(
        { error: security.error || "Unauthorized" },
        { status: security.rateLimitError ? 429 : security.csrfError ? 403 : 400 }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const tokenPayload = await verifyToken(token);
    if (!tokenPayload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const userId =
      (tokenPayload as { userId?: string; sub?: string }).userId ||
      (tokenPayload as { sub?: string }).sub;
    if (!userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { expoPushToken, platform } = security.data as z.infer<typeof pushTokenSchema>;

    await prisma.pushDeviceToken.upsert({
      where: { token: expoPushToken },
      create: {
        userId,
        token: expoPushToken,
        platform,
      },
      update: {
        userId,
        platform,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, stored: true });
  } catch (e) {
    console.error("POST /api/notifications/push-token", e);
    return NextResponse.json({ error: "Failed to store push token" }, { status: 500 });
  }
}

export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { validateSecureRequest } from "@/lib/security/middleware";
import { pushTokenDeleteSchema } from "@/lib/security/validation-schemas";

const pushTokenSchema = z
  .object({
    expoPushToken: z.string().min(10).max(2000),
    platform: z.enum(["ios", "android", "web"]),
  })
  .strict();

/**
 * POST /api/notifications/push-token
 * Persist device token only. No Expo/FCM send is implemented — delivery remains
 * "persistat, dar nelivrat" until a real push provider is wired.
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

    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { expoPushToken, platform } = security.data as z.infer<typeof pushTokenSchema>;

    await prisma.pushDeviceToken.upsert({
      where: { token: expoPushToken },
      create: {
        userId: user.id,
        token: expoPushToken,
        platform,
      },
      update: {
        userId: user.id,
        platform,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        success: true,
        stored: true,
        delivery: "not_implemented",
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (e) {
    console.error("POST /api/notifications/push-token", e);
    return NextResponse.json({ error: "Failed to store push token" }, { status: 500 });
  }
}

/**
 * DELETE /api/notifications/push-token
 * Remove the given Expo token for the current user only (no cross-user delete).
 * Backward compatible: POST registration unchanged.
 */
export async function DELETE(req: NextRequest) {
  try {
    const security = await validateSecureRequest(req, {
      requireCSRF: true,
      rateLimit: "api",
      schema: pushTokenDeleteSchema,
    });

    if (!security.success) {
      return NextResponse.json(
        { error: security.error || "Unauthorized" },
        { status: security.rateLimitError ? 429 : security.csrfError ? 403 : 400 }
      );
    }

    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { expoPushToken } = security.data as z.infer<typeof pushTokenDeleteSchema>;

    const result = await prisma.pushDeviceToken.deleteMany({
      where: {
        token: expoPushToken,
        userId: user.id,
      },
    });

    return NextResponse.json(
      {
        success: true,
        deleted: result.count > 0,
        count: result.count,
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (e) {
    console.error("DELETE /api/notifications/push-token", e);
    return NextResponse.json({ error: "Failed to delete push token" }, { status: 500 });
  }
}

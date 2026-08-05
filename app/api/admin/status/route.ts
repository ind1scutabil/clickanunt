export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { Permission } from "@/lib/rbac";
import { requireAdminApiPermission } from "@/lib/admin-api-auth";

/**
 * GET /api/admin/status
 * Counts staff roles — no email enumeration without auth.
 */
export async function GET(request: NextRequest) {
  try {
    const gate = await requireAdminApiPermission(
      request,
      Permission.USERS_VIEW_ALL
    );
    if (!gate.ok) return gate.response;

    const [adminCount, ownerCount] = await Promise.all([
      prisma.user.count({
        where: { role: "admin", deletedAt: null },
      }),
      prisma.user.count({
        where: { role: "owner", deletedAt: null },
      }),
    ]);

    return NextResponse.json({
      adminExists: adminCount + ownerCount > 0,
      adminCount,
      ownerCount,
    });
  } catch (error) {
    logger.error({ error }, "Error checking admin status");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

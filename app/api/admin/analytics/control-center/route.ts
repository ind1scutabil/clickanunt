/**
 * GET /api/admin/analytics/control-center
 * Enterprise aggregates: KPIs, trends, sessions, funnel, risk, revenue, audit slice.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/rbac";
import type { UserRole } from "@prisma/client";
import { buildAdminControlCenterPayload } from "@/lib/admin-control-center";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (
      !user ||
      (!hasPermission(user.role as UserRole, Permission.ANALYTICS_VIEW) &&
        !hasPermission(user.role as UserRole, Permission.USERS_VIEW_ALL))
    ) {
      return NextResponse.json({ error: "Acces interzis" }, { status: 403 });
    }

    const payload = await buildAdminControlCenterPayload();
    return NextResponse.json({ success: true, ...payload });
  } catch (e) {
    console.error("admin control center error", e);
    return NextResponse.json(
      { error: "Eroare la agregările control center" },
      { status: 500 }
    );
  }
}

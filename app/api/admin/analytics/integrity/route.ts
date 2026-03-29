/**
 * GET — orphan analytics_events counts
 * POST — delete orphan analytics_events (audit before/after)
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/rbac";
import type { UserRole } from "@prisma/client";
import { validateSecureRequest } from "@/lib/security/middleware";
import { countAnalyticsOrphans, deleteAnalyticsOrphans } from "@/lib/analytics-integrity";
import { auditActions } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (
      !user ||
      !hasPermission(user.role as UserRole, Permission.ANALYTICS_VIEW)
    ) {
      return NextResponse.json({ error: "Acces interzis" }, { status: 403 });
    }

    const counts = await countAnalyticsOrphans();
    return NextResponse.json({ success: true, counts });
  } catch (e) {
    console.error("analytics integrity GET", e);
    return NextResponse.json({ error: "Eroare" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (
      !user ||
      !hasPermission(user.role as UserRole, Permission.ANALYTICS_VIEW)
    ) {
      return NextResponse.json({ error: "Acces interzis" }, { status: 403 });
    }

    const security = await validateSecureRequest(request, {
      requireCSRF: true,
    });
    if (!security.success) {
      return NextResponse.json(
        { error: security.error },
        { status: security.csrfError ? 403 : 400 }
      );
    }

    const orphanedBefore = await countAnalyticsOrphans();
    const { deleted, remaining } = await deleteAnalyticsOrphans();

    await auditActions.analyticsOrphanCleanup(
      { id: user.id, email: user.email ?? "", role: user.role },
      orphanedBefore,
      deleted,
      remaining
    );

    return NextResponse.json({
      success: true,
      deleted,
      remaining,
    });
  } catch (e) {
    console.error("analytics integrity POST", e);
    return NextResponse.json({ error: "Eroare" }, { status: 500 });
  }
}

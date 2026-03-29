export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/rbac";
import type { UserRole } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const adminUser = await getUserFromRequest(request);
    if (!adminUser || !hasPermission(adminUser.role as UserRole, Permission.USERS_VIEW_ALL)) {
      return NextResponse.json({ error: "Acces interzis" }, { status: 403 });
    }

    const activeListings = await prisma.listing.count({
      where: { status: "active" },
    });

    return NextResponse.json({
      success: true,
      activeListings,
    });
  } catch (error) {
    console.error("Get admin listing stats error:", error);
    return NextResponse.json(
      { error: "Eroare la obținerea statisticilor anunțurilor" },
      { status: 500 }
    );
  }
}


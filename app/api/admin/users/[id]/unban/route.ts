/**
 * API Route: Admin - Unban User
 */

export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission, Permission, canModifyUser } from "@/lib/rbac";
import { auditActions } from "@/lib/audit";
import { validateSecureRequest } from "@/lib/security/middleware";
import type { UserRole } from "@prisma/client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserFromRequest(request as any);

    const security = await validateSecureRequest(request, {
      requireCSRF: true,
    });

    if (!security.success) {
      const status = security.csrfError ? 403 : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    if (!user || !hasPermission(user.role as UserRole, Permission.USERS_BAN)) {
      return NextResponse.json(
        { error: "Acces interzis" },
        { status: 403 }
      );
    }

    // Verifică dacă user există
    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "Utilizatorul nu există" },
        { status: 404 }
      );
    }

    // Verifică dacă are permisiune
    if (!canModifyUser(user.role as UserRole, targetUser.role as UserRole)) {
      return NextResponse.json(
        { error: "Nu poți unbana acest utilizator" },
        { status: 403 }
      );
    }

    // Unban user
    const unbannedUser = await prisma.user.update({
      where: { id },
      data: {
        isBanned: false,
        bannedAt: null,
        bannedBy: null,
        banReason: null,
      },
    });

    // Audit log
    await auditActions.userUnbanned(user, targetUser.id, targetUser);

    return NextResponse.json({
      success: true,
      message: "Utilizator unbanat cu succes",
      user: {
        id: unbannedUser.id,
        email: unbannedUser.email,
        isBanned: unbannedUser.isBanned,
      },
    });
  } catch (error) {
    console.error('Unban user error:', error);
    return NextResponse.json(
      { error: "Eroare la unbanarea utilizatorului" },
      { status: 500 }
    );
  }
}

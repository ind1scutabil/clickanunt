/**
 * API Route: Admin - Ban User
 */

export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission, Permission, canModifyUser } from "@/lib/rbac";
import { auditActions } from "@/lib/audit";
import type { UserRole } from "@prisma/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserFromRequest(request as any);

    if (!user || !hasPermission(user.role as UserRole, Permission.USERS_BAN)) {
      return NextResponse.json(
        { error: "Acces interzis" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { reason } = body;

    if (!reason) {
      return NextResponse.json(
        { error: "Motivul ban-ului este necesar" },
        { status: 400 }
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

    // Verifică dacă are permisiune să modifice acest user
    if (!canModifyUser(user.role as UserRole, targetUser.role as UserRole)) {
      return NextResponse.json(
        { error: "Nu poți bana acest utilizator" },
        { status: 403 }
      );
    }

    // Ban user
    const bannedUser = await prisma.user.update({
      where: { id },
      data: {
        isBanned: true,
        bannedAt: new Date(),
        bannedBy: user.userId,
        banReason: reason,
      },
    });

    // Audit log
    await auditActions.userBanned(user, targetUser.id, reason, targetUser);

    return NextResponse.json({
      success: true,
      message: "Utilizator banat cu succes",
      user: {
        id: bannedUser.id,
        email: bannedUser.email,
        isBanned: bannedUser.isBanned,
        bannedAt: bannedUser.bannedAt,
        banReason: bannedUser.banReason,
      },
    });
  } catch (error) {
    console.error('Ban user error:', error);
    return NextResponse.json(
      { error: "Eroare la banarea utilizatorului" },
      { status: 500 }
    );
  }
}

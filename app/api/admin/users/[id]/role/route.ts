/**
 * API Route: Admin - Schimbă Role User
 */

export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission, Permission, canSetRole } from "@/lib/rbac";
import { auditActions } from "@/lib/audit";
import type { UserRole } from "@prisma/client";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserFromRequest(request as any);

    if (!user || !hasPermission(user.role as UserRole, Permission.USERS_CHANGE_ROLE)) {
      return NextResponse.json(
        { error: "Acces interzis" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { role } = body;

    if (!role) {
      return NextResponse.json(
        { error: "Rolul este necesar" },
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

    // Verifică dacă poate seta acest rol
    if (!canSetRole(user.role as UserRole, role as UserRole)) {
      return NextResponse.json(
        { error: "Nu poți seta acest rol" },
        { status: 403 }
      );
    }

    const oldRole = targetUser.role;

    // Update role
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role: role as UserRole },
    });

    // Audit log
    await auditActions.userRoleChanged(user, updatedUser, oldRole, role);

    return NextResponse.json({
      success: true,
      message: "Rol schimbat cu succes",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    console.error('Change role error:', error);
    return NextResponse.json(
      { error: "Eroare la schimbarea rolului" },
      { status: 500 }
    );
  }
}

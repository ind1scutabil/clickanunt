/**
 * API Route: Admin - Schimbă Role User
 */

export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission, Permission, canSetRole } from "@/lib/rbac";
import { auditActions } from "@/lib/audit";
import { validateSecureRequest } from "@/lib/security/middleware";
import { z } from "zod";
import type { UserRole } from "@prisma/client";

const changeRoleSchema = z
  .object({
    role: z.enum([
      "user",
      "dealer",
      "moderator",
      "admin",
      "owner",
      "support",
      "finance",
    ]),
  })
  .strict();

export async function PUT(
  request: NextRequest,
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

    const security = await validateSecureRequest(request, {
      requireCSRF: true,
      schema: changeRoleSchema,
    });

    if (!security.success) {
      const status = security.csrfError ? 403 : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const { role } = security.data as { role: string };

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
    if (!canSetRole({ userId: user.id, email: user.email, role: user.role, type: 'access' } as any, role as UserRole)) {
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
    await auditActions.userRoleChanged(user, targetUser, oldRole, role);

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

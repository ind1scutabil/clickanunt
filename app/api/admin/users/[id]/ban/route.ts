/**
 * API Route: Admin - Ban User
 */

export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission, Permission, canModifyUser } from "@/lib/rbac";
import { auditActions } from "@/lib/audit";
import { validateSecureRequest } from "@/lib/security/middleware";
import { z } from "zod";
import type { UserRole } from "@prisma/client";
import { AdminNotificationSeverity } from "@prisma/client";
import { ADMIN_NOTIFICATION_TYPE } from "@/lib/admin-notification-types";
import { createAdminNotification } from "@/lib/admin-notifications";
import { bumpSessionVersion } from "@/lib/auth/session-version";

const banUserSchema = z.object({
  reason: z.string().min(1, "Motivul este necesar"),
});

export async function POST(
  request: NextRequest,
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

    const security = await validateSecureRequest(request, {
      requireCSRF: true,
      schema: banUserSchema,
    });

    if (!security.success) {
      const status = security.csrfError ? 403 : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const { reason } = security.data as { reason: string };

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
        bannedBy: user.id,
        banReason: reason,
        moderationSuspendedUntil: null,
        moderationSuspensionReason: null,
        moderationSuspendedBy: null,
      },
    });

    // Invalidate all JWTs for this user
    await bumpSessionVersion(id);

    // Audit log
    await auditActions.userBanned(user, targetUser.id, reason, targetUser);

    void createAdminNotification({
      type: ADMIN_NOTIFICATION_TYPE.USER_BANNED,
      severity: AdminNotificationSeverity.critical,
      title: "Cont blocat (ban)",
      message: `${targetUser.email} a fost banat: ${reason}`,
      entityType: "user",
      entityId: targetUser.id,
      metadata: { bannedBy: user.id },
    });

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

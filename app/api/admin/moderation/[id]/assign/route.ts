/**
 * API Route: Admin - Assign Moderation Item
 */

export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/rbac";
import { validateSecureRequest } from "@/lib/security/middleware";
import { z } from "zod";
import type { UserRole } from "@prisma/client";

const assignSchema = z.object({
  moderatorId: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserFromRequest(request as any);

    if (!user || !hasPermission(user.role as UserRole, Permission.MODERATION_ASSIGN)) {
      return NextResponse.json(
        { error: "Acces interzis" },
        { status: 403 }
      );
    }

    const security = await validateSecureRequest(request, {
      requireCSRF: true,
      schema: assignSchema,
    });

    if (!security.success) {
      const status = security.csrfError ? 403 : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const { moderatorId } = security.data as { moderatorId?: string };

    // Verifică dacă moderator există
    if (moderatorId) {
      const moderator = await prisma.user.findUnique({
        where: { id: moderatorId },
      });

      if (!moderator || (moderator.role !== 'moderator' && moderator.role !== 'admin' && moderator.role !== 'owner')) {
        return NextResponse.json(
          { error: "Moderator invalid" },
          { status: 400 }
        );
      }
    }

    // Assign
    const item = await prisma.moderationQueue.update({
      where: { id },
      data: {
        assignedTo: moderatorId || null,
      },
      include: {
        moderator: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        listing: {
          select: {
            id: true,
            title: true,
            category: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: moderatorId ? "Item asignat cu succes" : "Asignare ștearsă",
      item,
    });
  } catch (error) {
    console.error('Assign moderation error:', error);
    return NextResponse.json(
      { error: "Eroare la asignare" },
      { status: 500 }
    );
  }
}

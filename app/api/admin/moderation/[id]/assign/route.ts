/**
 * API Route: Admin - Assign Moderation Item
 */

export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/rbac";
import type { UserRole } from "@prisma/client";

export async function POST(
  request: Request,
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

    const body = await request.json();
    const { moderatorId } = body;

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
        assignedAt: moderatorId ? new Date() : null,
        status: moderatorId ? 'in_review' : 'pending',
      },
      include: {
        assignedToUser: {
          select: {
            id: true,
            email: true,
            role: true,
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

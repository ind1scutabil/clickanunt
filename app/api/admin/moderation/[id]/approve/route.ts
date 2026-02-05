/**
 * API Route: Admin - Approve Content from Moderation Queue
 */

export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/rbac";
import { auditActions } from "@/lib/audit";
import type { UserRole } from "@prisma/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserFromRequest(request as any);

    if (!user || !hasPermission(user.role as UserRole, Permission.MODERATION_APPROVE_REJECT)) {
      return NextResponse.json(
        { error: "Acces interzis" },
        { status: 403 }
      );
    }

    // Get moderation item
    const item = await prisma.moderationQueue.findUnique({
      where: { id },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Item nu există" },
        { status: 404 }
      );
    }

    // Update listing status
    if (item.entityType === 'listing') {
      await prisma.listing.update({
        where: { id: item.entityId },
        data: {
          moderationStatus: 'approved',
          moderatedAt: new Date(),
          moderatedBy: user.userId,
          status: 'active',
        },
      });

      // Audit log
      const listing = await prisma.listing.findUnique({ where: { id: item.entityId } });
      if (listing) {
        await auditActions.listingApproved(user, listing);
      }
    }

    // Update moderation queue
    const updatedItem = await prisma.moderationQueue.update({
      where: { id },
      data: {
        status: 'resolved',
        decision: 'approved',
        reviewedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Conținut aprobat cu succes",
      item: updatedItem,
    });
  } catch (error) {
    console.error('Approve content error:', error);
    return NextResponse.json(
      { error: "Eroare la aprobare" },
      { status: 500 }
    );
  }
}

/**
 * API Route: Admin - Approve Content from Moderation Queue
 */

export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/rbac";
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
    await prisma.listing.update({
      where: { id: item.listingId },
      data: {
        moderationStatus: 'approved',
        moderatedAt: new Date(),
        moderatedBy: user.id,
        status: 'active',
      },
    });

    // Audit log
    const listing = await prisma.listing.findUnique({ where: { id: item.listingId } });
    if (listing) {
      await auditActions.listingApproved(user, listing);
    }

    // Update moderation queue - setează status la approved
    const updatedItem = await prisma.moderationQueue.update({
      where: { id },
      data: {
        status: 'approved',
        notes: 'Approved by moderator',
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

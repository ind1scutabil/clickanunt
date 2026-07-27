/**
 * API Route: Admin - Reject Content from Moderation Queue
 */

export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/rbac";
import { auditActions } from "@/lib/audit";
import { validateSecureRequest } from "@/lib/security/middleware";
import type { UserRole } from "@prisma/client";
import { ANALYTICS_EVENT, recordAnalyticsEvent } from "@/lib/analytics-events";

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

    const body = await request.json();
    const { reason } = body;

    if (!reason) {
      return NextResponse.json(
        { error: "Motivul respingerii este necesar" },
        { status: 400 }
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

    // Conditional reject — avoid stomping concurrent approve.
    const listingUpdated = await prisma.listing.updateMany({
      where: {
        id: item.listingId,
        deletedAt: null,
        status: { notIn: ['deleted'] },
      },
      data: {
        moderationStatus: 'rejected',
        moderatedAt: new Date(),
        moderatedBy: user.id,
        moderationNotes: String(reason).slice(0, 2000),
        status: 'rejected',
      },
    });

    if (listingUpdated.count === 0) {
      return NextResponse.json(
        { error: "Listing-ul nu poate fi respins în starea curentă" },
        { status: 409 }
      );
    }

    // Audit log
    const listing = await prisma.listing.findUnique({ where: { id: item.listingId } });
    if (listing) {
      await auditActions.listingRejected(user, listing, reason);
    }

    // Update moderation queue from pending only
    const queueUpdated = await prisma.moderationQueue.updateMany({
      where: { id, status: 'pending' },
      data: {
        status: 'rejected',
        notes: String(reason).slice(0, 2000),
      },
    });

    const updatedItem = await prisma.moderationQueue.findUnique({ where: { id } });

    void recordAnalyticsEvent({
      eventType: ANALYTICS_EVENT.moderation_action,
      userId: user.id,
      listingId: item.listingId,
      metadata: { decision: "rejected", moderationQueueId: id, reason },
      request,
    });

    return NextResponse.json({
      success: true,
      message: "Conținut respins cu succes",
      item: updatedItem,
      duplicate: queueUpdated.count === 0,
    });
  } catch (error) {
    console.error('Reject content error:', error);
    return NextResponse.json(
      { error: "Eroare la respingere" },
      { status: 500 }
    );
  }
}

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
import { ANALYTICS_EVENT, recordAnalyticsEvent } from "@/lib/analytics-events";
import { applyListingPublishExpiryOnApprove } from "@/lib/listing-lifecycle";
import { revalidatePublicMarketplaceSurfaces } from "@/lib/cache/revalidate-marketplace";
import { notifyListingIndexNowAfterSuccess } from "@/lib/seo/indexnow-listing-notify";

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

    const existingListing = await prisma.listing.findUnique({
      where: { id: item.listingId },
      select: { publishedAt: true, expiresAt: true, status: true, deletedAt: true },
    });

    if (!existingListing || existingListing.deletedAt) {
      return NextResponse.json({ error: "Listing nu există" }, { status: 404 });
    }

    // Conditional update — refuse stale concurrent decisions.
    const listingUpdated = await prisma.listing.updateMany({
      where: {
        id: item.listingId,
        deletedAt: null,
        status: { in: ['pending', 'rejected', 'paused', 'hidden', 'draft', 'expired'] },
      },
      data: {
        moderationStatus: 'approved',
        moderatedAt: new Date(),
        moderatedBy: user.id,
        status: 'active',
        ...applyListingPublishExpiryOnApprove(existingListing),
      },
    });

    if (listingUpdated.count === 0 && existingListing.status !== 'active') {
      return NextResponse.json(
        { error: "Listing-ul nu mai este în stare ce poate fi aprobată" },
        { status: 409 }
      );
    }

    if (listingUpdated.count === 0 && existingListing.status === 'active') {
      // Already active — still refresh expiry if past, idempotent approve.
      await prisma.listing.update({
        where: { id: item.listingId },
        data: {
          moderationStatus: 'approved',
          moderatedAt: new Date(),
          moderatedBy: user.id,
          ...applyListingPublishExpiryOnApprove(existingListing),
        },
      });
    }

    // Audit log
    const listing = await prisma.listing.findUnique({ where: { id: item.listingId } });
    if (listing) {
      await auditActions.listingApproved(user, listing);
      // Public eligibility changed (pending/rejected/... → active+approved) — refresh
      // homepage count + affected hubs on the next request instead of waiting for ISR.
      revalidatePublicMarketplaceSurfaces({
        reason: "approve",
        category: listing.category,
        city: listing.city,
      });

      // After confirmed write: notify only when we actually transitioned into active
      // (or public fields changed). Idempotent approve on already-active → 0.
      notifyListingIndexNowAfterSuccess({
        listingId: listing.id,
        before: {
          status: existingListing.status,
          deletedAt: existingListing.deletedAt,
        },
        after: {
          status: listing.status,
          deletedAt: listing.deletedAt,
        },
        changedKeys:
          listingUpdated.count > 0
            ? ["status", "moderationStatus"]
            : ["moderationStatus", "moderatedAt", "moderatedBy"],
      });
    }

    // Update moderation queue only from pending
    const queueUpdated = await prisma.moderationQueue.updateMany({
      where: { id, status: 'pending' },
      data: {
        status: 'approved',
        notes: 'Approved by moderator',
      },
    });

    const updatedItem =
      queueUpdated.count > 0
        ? await prisma.moderationQueue.findUnique({ where: { id } })
        : await prisma.moderationQueue.findUnique({ where: { id } });

    void recordAnalyticsEvent({
      eventType: ANALYTICS_EVENT.moderation_action,
      userId: user.id,
      listingId: item.listingId,
      metadata: { decision: "approved", moderationQueueId: id },
      request,
    });

    return NextResponse.json({
      success: true,
      message: "Conținut aprobat cu succes",
      item: updatedItem,
      duplicate: queueUpdated.count === 0,
    });
  } catch (error) {
    console.error('Approve content error:', error);
    return NextResponse.json(
      { error: "Eroare la aprobare" },
      { status: 500 }
    );
  }
}

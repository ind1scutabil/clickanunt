export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ANALYTICS_EVENT, recordAnalyticsEvent } from "@/lib/analytics-events";
import { memoryStorage } from "@/lib/memory-storage";
import { validateSecureRequest } from "@/lib/security/middleware";
import { listingEditSchema, uuidSchema } from "@/lib/security/validation-schemas";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/rbac";
import type { UserRole } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { normalizeListingPhotosArray } from "@/lib/listing-photo-url";
import { computeFeedBoost } from "@/lib/listing-feed-boost";
import { applyListingPromotionExpiryIfNeeded } from "@/lib/expire-listing-promotions";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const idCheck = uuidSchema.safeParse(id);
    if (!idCheck.success) {
      return NextResponse.json({ error: "Invalid listing id" }, { status: 400 });
    }
    
    // ✅ IN-MEMORY MODE: Get listing from memory storage
    if (process.env.USE_IN_MEMORY_DB === 'true') {
      const listing = memoryStorage.get(id);
      
      if (!listing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      return NextResponse.json({
        ...listing,
        photos: normalizeListingPhotosArray((listing as { photos?: unknown }).photos),
      });
    }
    
    const listing = await prisma.listing.findFirst({
      where: { id, deletedAt: null },
      include: { 
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            businessPhone: true,
            businessName: true,
            avatar: true,
            phoneVerified: true,
            emailVerified: true,
            trustScore: true,
            totalSales: true,
            averageRating: true,
            role: true,
            createdAt: true,
          }
        }
      },
    });

    if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const listingFresh = await applyListingPromotionExpiryIfNeeded(prisma, listing);

    // Increment views count
    await prisma.listing.update({
      where: { id },
      data: { views: { increment: 1 } },
    });

    const viewer = await getUserFromRequest(request as any);
    void recordAnalyticsEvent({
      eventType: ANALYTICS_EVENT.listing_view,
      userId: viewer?.id ?? null,
      listingId: id,
      metadata: { source: "listing_get" },
      request,
    });

    return NextResponse.json({
      ...listingFresh,
      photos: normalizeListingPhotosArray(listingFresh.photos),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const security = await validateSecureRequest(request, {
      requireCSRF: true,
      rateLimit: 'listings',
      schema: listingEditSchema,
    });

    if (!security.success) {
      const status = security.rateLimitError
        ? 429
        : security.csrfError
        ? 403
        : security.validationError
        ? 400
        : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existingListing = await prisma.listing.findUnique({
      where: { id },
      select: { ownerUserId: true, status: true, isPromoted: true, isFeatured: true },
    });

    if (!existingListing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const isOwner = existingListing.ownerUserId === user.id;
    const canEditAsAdmin =
      hasPermission(user.role as UserRole, Permission.LISTINGS_UPDATE_ANY) ||
      hasPermission(user.role as UserRole, Permission.MODERATION_APPROVE_REJECT);

    if (!isOwner && !canEditAsAdmin) {
      return NextResponse.json({ error: "Not authorized to edit this listing" }, { status: 403 });
    }

    const body = { ...(security.data as any), id };

    const allowed: Record<string, unknown> = {};
    const fields = [
      "title",
      "category",
      "subcategory",
      "priceAmount",
      "priceCurrency",
      "condition",
      "status",
      "make",
      "model",
      "year",
      "mileage",
      "fuel",
      "transmission",
      "vin",
      "attributes",
      "photos",
      "description",
      "city",
      "county",
      "region",
      "isFeatured",
      "contactPhone",
    ];

    for (const f of fields) if (f in body) allowed[f] = (body as Record<string, unknown>)[f];

    if (allowed.isFeatured !== undefined && existingListing) {
      (allowed as Record<string, unknown>).feedBoost = computeFeedBoost(
        !!existingListing.isPromoted,
        Boolean(allowed.isFeatured)
      );
    }

    const currentStatus = String(existingListing.status || '').toLowerCase();
    const canRepublishFromStatus = currentStatus === 'paused' || currentStatus === 'hidden' || currentStatus === 'rejected';
    const requestedStatus = body.status !== undefined ? String(body.status || '').toLowerCase() : null;
    const ownerRequestedRepublish = isOwner && requestedStatus === 'pending' && canRepublishFromStatus;
    const ownerEditedSuspendedListing = isOwner && requestedStatus === null && canRepublishFromStatus;

    if (isOwner && body.status !== undefined) {
      // Owner cannot set arbitrary statuses.
      if (!ownerRequestedRepublish) {
        delete allowed.status;
      }
    }

    // Any owner edit on a suspended/rejected listing sends it back to moderation queue.
    if (ownerRequestedRepublish || ownerEditedSuspendedListing) {
      allowed.status = 'pending';
      allowed.moderationStatus = 'pending';
    }

    const updated = await prisma.listing.update({ where: { id }, data: allowed });

    void recordAnalyticsEvent({
      eventType: ANALYTICS_EVENT.listing_updated,
      userId: user.id,
      listingId: id,
      metadata: { fields: Object.keys(allowed) },
      request,
    });

    if (updated.status === 'pending') {
      const existingPendingQueue = await prisma.moderationQueue.findFirst({
        where: { listingId: id, status: 'pending' },
        select: { id: true },
      });

      if (!existingPendingQueue) {
        const latestQueueItem = await prisma.moderationQueue.findFirst({
          where: { listingId: id },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        });

        if (latestQueueItem) {
          await prisma.moderationQueue.update({
            where: { id: latestQueueItem.id },
            data: {
              status: 'pending',
              assignedTo: null,
              notes: 'Retrimis de proprietar dupa editare',
            },
          });
        } else {
          await prisma.moderationQueue.create({
            data: {
              listingId: id,
              status: 'pending',
              notes: 'Retrimis de proprietar dupa editare',
            },
          });
        }
      }
    }

    if (!isOwner && canEditAsAdmin) {
      await createAuditLog({
        userId: user.id,
        action: "listing.admin_patch",
        resource: "listing",
        resourceId: id,
        details: {
          targetOwnerId: existingListing.ownerUserId,
          fields: Object.keys(allowed),
        },
      });
    }

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const security = await validateSecureRequest(request, {
      requireCSRF: true,
      rateLimit: 'listings',
    });

    if (!security.success) {
      const status = security.rateLimitError
        ? 429
        : security.csrfError
        ? 403
        : security.validationError
        ? 400
        : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const idCheck = uuidSchema.safeParse(id);
    if (!idCheck.success) {
      return NextResponse.json({ error: "Invalid listing id" }, { status: 400 });
    }

    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existingListing = await prisma.listing.findFirst({
      where: { id, deletedAt: null },
      select: { ownerUserId: true },
    });
    if (!existingListing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const isOwner = existingListing.ownerUserId === user.id;
    const isAdmin =
      hasPermission(user.role as UserRole, Permission.LISTINGS_DELETE_ANY) ||
      hasPermission(user.role as UserRole, Permission.LISTINGS_UPDATE_ANY);
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Not authorized to delete this listing" }, { status: 403 });
    }

    void recordAnalyticsEvent({
      eventType: ANALYTICS_EVENT.listing_deleted,
      userId: user.id,
      listingId: id,
      metadata: { ownerUserId: existingListing.ownerUserId, softDelete: true },
      request,
    });

    await prisma.listing.update({
      where: { id },
      data: {
        status: "deleted",
        deletedAt: new Date(),
      },
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

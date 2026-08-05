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
import { resolveListingGetRequestLimits, finalizeShouldCountListingView } from "@/lib/listing-view-count";
import { sanitizeListingPayloadForViewer } from "@/lib/listings/public-listing-dto";
import { isListingSeoIndexable } from "@/lib/seo/listing-seo-eligibility";
import { validateListingPatchTaxonomy } from "@/lib/listing-patch-taxonomy";
import { validateEffectivePriceSalaryPatch } from "@/lib/listing-patch-price-salary";
import { resolveOwnerStatusTransition } from "@/lib/listing-lifecycle";
import { revalidatePublicMarketplaceSurfaces } from "@/lib/cache/revalidate-marketplace";
import { enqueueIndexNowSafe } from "@/lib/seo/indexnow-client";
import { siteOriginForSeoFeeds } from "@/lib/seo/site-url-guard";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const proto = (request.headers.get("x-forwarded-proto") ?? "https").split(",")[0].trim();
    const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? new URL(request.url).host)
      .split(",")[0]
      .trim();
    const origin = `${proto}://${host}`;
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

      // Public detail must match seoIndexableListingWhere / isListingSeoIndexable.
      const memViewer = await getUserFromRequest(request as any);
      const memIsOwnerOrAdmin =
        !!memViewer &&
        (memViewer.id === (listing as { ownerUserId?: string }).ownerUserId ||
          hasPermission(memViewer.role as UserRole, Permission.LISTINGS_UPDATE_ANY) ||
          hasPermission(memViewer.role as UserRole, Permission.MODERATION_APPROVE_REJECT));
      const memShape = {
        deletedAt: (listing as { deletedAt?: Date | null }).deletedAt ?? null,
        status: (listing as { status: string }).status as import("@prisma/client").ListingStatus,
        moderationStatus: ((listing as { moderationStatus?: string }).moderationStatus ??
          "approved") as import("@prisma/client").ModerationStatus,
        expiresAt: (listing as { expiresAt?: Date | null }).expiresAt ?? null,
      };
      if (!memIsOwnerOrAdmin && !isListingSeoIndexable(memShape)) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      return NextResponse.json(
        sanitizeListingPayloadForViewer(
          {
            ...listing,
            photos: normalizeListingPhotosArray((listing as { photos?: unknown }).photos, origin),
          } as Record<string, unknown>,
          { isOwnerOrAdmin: memIsOwnerOrAdmin },
        ),
      );
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
            totalListings: true,
            responseRate: true,
            role: true,
            createdAt: true,
          }
        }
      },
    });

    if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const listingFresh = await applyListingPromotionExpiryIfNeeded(prisma, listing);

    const viewer = await getUserFromRequest(request as any);
    const isOwnerOrAdmin =
      !!viewer &&
      (viewer.id === listingFresh.ownerUserId ||
        hasPermission(viewer.role as UserRole, Permission.LISTINGS_UPDATE_ANY) ||
        hasPermission(viewer.role as UserRole, Permission.MODERATION_APPROVE_REJECT));

    // Public anonymous detail ≡ indexable set only. Owner/admin retain full access.
    // Same generic 404 for deleted/paused/expired/pending/rejected/flagged (no existence leak).
    if (!isOwnerOrAdmin && !isListingSeoIndexable(listingFresh)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const viewLimits = await resolveListingGetRequestLimits(request, id);
    // Owner/admin self-views (detail, edit, promote, messages) must not inflate counters.
    // Limitation: a direct API GET with a normal browser UA still counts — cannot safely
    // distinguish “real page view” from raw GET without architecture change.
    const shouldCountView = finalizeShouldCountListingView({
      shouldCountView: viewLimits.shouldCountView,
      isOwnerOrAdmin,
    });
    if (shouldCountView) {
      await prisma.listing.update({
        where: { id },
        data: { views: { increment: 1 } },
      });

      void recordAnalyticsEvent({
        eventType: ANALYTICS_EVENT.listing_view,
        userId: viewer?.id ?? null,
        listingId: id,
        metadata: { source: "listing_get" },
        request,
      });
    }

    const response = NextResponse.json(
      sanitizeListingPayloadForViewer(
        {
          ...listingFresh,
          photos: normalizeListingPhotosArray(listingFresh.photos, origin),
        } as Record<string, unknown>,
        { isOwnerOrAdmin },
      ),
    );

    if (!viewLimits.allowed && viewLimits.retryAfter) {
      response.headers.set("X-RateLimit-Remaining", "0");
      response.headers.set("Retry-After", String(viewLimits.retryAfter));
    }

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const security = await validateSecureRequest(request, {
      requireCSRF: true,
      rateLimit: 'listing_update',
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
      select: {
        ownerUserId: true,
        status: true,
        moderationStatus: true,
        deletedAt: true,
        expiresAt: true,
        isPromoted: true,
        isFeatured: true,
        category: true,
        subcategory: true,
        attributes: true,
        priceType: true,
        priceAmount: true,
        priceCurrency: true,
        salaryMin: true,
        salaryMax: true,
        salaryCurrency: true,
        salaryPeriod: true,
        make: true,
        model: true,
        vin: true,
        year: true,
        mileage: true,
        fuel: true,
        transmission: true,
      },
    });

    if (!existingListing || existingListing.deletedAt) {
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

    const taxonomyCheck = validateListingPatchTaxonomy({
      existing: {
        category: existingListing.category,
        subcategory: existingListing.subcategory,
        attributes: existingListing.attributes,
        make: existingListing.make,
        model: existingListing.model,
        vin: existingListing.vin,
        year: existingListing.year,
        mileage: existingListing.mileage,
        fuel: existingListing.fuel,
        transmission: existingListing.transmission,
      },
      patch: body,
    });
    if (!taxonomyCheck.ok) {
      return NextResponse.json(
        { error: taxonomyCheck.message, path: taxonomyCheck.path },
        { status: 400 }
      );
    }

    const priceCheck = validateEffectivePriceSalaryPatch({
      existing: {
        category: existingListing.category,
        subcategory: existingListing.subcategory,
        priceType: existingListing.priceType,
        priceAmount: existingListing.priceAmount,
        priceCurrency: existingListing.priceCurrency,
        salaryMin: existingListing.salaryMin,
        salaryMax: existingListing.salaryMax,
        salaryCurrency: existingListing.salaryCurrency,
        salaryPeriod: existingListing.salaryPeriod,
      },
      patch: body,
      effectiveCategory: taxonomyCheck.effectiveCategory,
      effectiveSubcategory: taxonomyCheck.effectiveSubcategory,
    });
    if (!priceCheck.ok) {
      return NextResponse.json(
        { error: priceCheck.message, path: priceCheck.path },
        { status: 400 }
      );
    }

    const allowed: Record<string, unknown> = {};
    const fields = [
      "title",
      "category",
      "subcategory",
      "priceAmount",
      "priceCurrency",
      "priceType",
      "salaryMin",
      "salaryMax",
      "salaryCurrency",
      "salaryPeriod",
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

    if (taxonomyCheck.attributesToPersist !== undefined) {
      allowed.attributes = taxonomyCheck.attributesToPersist;
    }
    if (taxonomyCheck.clearAutoFields) {
      allowed.make = null;
      allowed.model = null;
      allowed.vin = null;
      allowed.year = null;
      allowed.mileage = null;
      allowed.fuel = null;
      allowed.transmission = null;
    }

    if (priceCheck.ok && priceCheck.next) {
      const n = priceCheck.next;
      const touchesPrice = [
        "priceType",
        "priceAmount",
        "priceCurrency",
        "salaryMin",
        "salaryMax",
        "salaryCurrency",
        "salaryPeriod",
        "category",
      ].some((k) => k in body);
      if (touchesPrice) {
        allowed.priceType = n.priceType;
        allowed.priceAmount = n.priceAmount;
        allowed.priceCurrency = n.priceCurrency;
        allowed.salaryMin = n.salaryMin;
        allowed.salaryMax = n.salaryMax;
        allowed.salaryCurrency = n.salaryCurrency;
        allowed.salaryPeriod = n.salaryPeriod;
      }
    }

    if (allowed.isFeatured !== undefined && existingListing) {
      (allowed as Record<string, unknown>).feedBoost = computeFeedBoost(
        !!existingListing.isPromoted,
        Boolean(allowed.isFeatured)
      );
    }

    const currentStatus = String(existingListing.status || '').toLowerCase();
    const canRepublishFromStatus =
      currentStatus === 'paused' || currentStatus === 'hidden' || currentStatus === 'rejected';
    const requestedStatus =
      body.status !== undefined ? String(body.status || '').toLowerCase() : null;
    const ownerEditedSuspendedListing =
      isOwner && requestedStatus === null && canRepublishFromStatus;

    if (isOwner && body.status !== undefined) {
      const decision = resolveOwnerStatusTransition(
        {
          status: existingListing.status,
          moderationStatus: existingListing.moderationStatus,
          deletedAt: existingListing.deletedAt,
          expiresAt: existingListing.expiresAt,
        },
        String(body.status)
      );
      if (!decision.ok) {
        delete allowed.status;
        return NextResponse.json({ error: decision.error }, { status: 400 });
      }
      allowed.status = decision.status;
      if (decision.moderationStatus) {
        allowed.moderationStatus = decision.moderationStatus;
      }
      if (decision.clearExpiresAt) {
        allowed.expiresAt = null;
      }
    }

    // Any owner edit on a suspended/rejected listing sends it back to moderation queue.
    if (ownerEditedSuspendedListing) {
      allowed.status = 'pending';
      allowed.moderationStatus = 'pending';
    }

    const updated = await prisma.listing.update({ where: { id }, data: allowed });

    if ("status" in allowed || "moderationStatus" in allowed) {
      // Owner pause/republish or admin patch touched public eligibility fields —
      // refresh homepage count + affected hubs on the next request instead of
      // waiting for the passive ISR window.
      revalidatePublicMarketplaceSurfaces({
        reason: "moderation",
        category: updated.category,
        city: updated.city,
      });
      if (updated.status === "active") {
        // Republish (owner) or moderation approval (admin) — same reasoning as
        // the create path: nudge IndexNow-participating engines to recrawl now.
        enqueueIndexNowSafe([`${siteOriginForSeoFeeds()}/listings/${updated.id}`]);
      }
    }

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
      rateLimit: 'listing_update',
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

    const deleted = await prisma.listing.update({
      where: { id },
      data: {
        status: "deleted",
        deletedAt: new Date(),
      },
    });

    revalidatePublicMarketplaceSurfaces({
      reason: "soft_delete",
      category: deleted.category,
      city: deleted.city,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

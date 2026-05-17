export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSecureRequest } from "@/lib/security/middleware";
import { uuidSchema } from "@/lib/security/validation-schemas";
import { computeFeedBoost } from "@/lib/listing-feed-boost";
import { getUserFromRequest } from "@/lib/auth";
import {
  computeExpectedFinalBaniForUiPackage,
  getListingPromotionApplyFromUiPackage,
  type PromotionUiId,
} from "@/lib/promotion-packages";
import { z } from "zod";
import { ANALYTICS_EVENT, recordAnalyticsEvent } from "@/lib/analytics-events";
import { notifyListingPromoted } from "@/lib/user-notifications";

const promotePostBodySchema = z
  .object({
    packageId: z.enum(["top", "urgent", "featured", "refresh"]),
    amountBani: z.number().int().min(100),
    paymentMethod: z.string().optional(),
    paymentTransactionId: z.string().optional(),
    paymentEmail: z.string().email().optional(),
    paymentReference: z.string().max(200).optional(),
  })
  .strict();

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: listingId } = await params;
    const idCheck = uuidSchema.safeParse(listingId);
    if (!idCheck.success) {
      return NextResponse.json({ error: "Invalid listing id" }, { status: 400 });
    }

    const security = await validateSecureRequest(request, {
      requireCSRF: true,
      rateLimit: "payment",
    });

    if (!security.success) {
      const status = security.rateLimitError ? 429 : security.csrfError ? 403 : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const user = await getUserFromRequest(request);
    if (!user?.id) {
      return NextResponse.json({ error: "Autentificare necesară" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = promotePostBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Date invalide: packageId și amountBani sunt obligatorii" }, { status: 400 });
    }

    const { packageId, amountBani, paymentMethod, paymentTransactionId, paymentEmail, paymentReference } =
      parsed.data;

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        title: true,
        ownerUserId: true,
        status: true,
        isPromoted: true,
        promotionExpiresAt: true,
      },
    });

    if (!listing) {
      return NextResponse.json({ error: "Anunț negăsit" }, { status: 404 });
    }

    if (listing.ownerUserId !== user.id) {
      return NextResponse.json({ error: "Doar proprietarul poate promova anunțul" }, { status: 403 });
    }

    if (listing.status !== "active") {
      return NextResponse.json({ error: "Doar anunțurile active pot fi promovate" }, { status: 400 });
    }

    const expected = await computeExpectedFinalBaniForUiPackage(user.id, packageId);
    if ("error" in expected) {
      return NextResponse.json({ error: expected.error }, { status: 400 });
    }

    if (amountBani !== expected.bani) {
      return NextResponse.json(
        { error: "Suma nu corespunde cu pachetul selectat. Reîmprospătează pagina și încearcă din nou." },
        { status: 400 }
      );
    }

    const apply = await getListingPromotionApplyFromUiPackage(packageId as PromotionUiId);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + apply.durationDays * 24 * 60 * 60 * 1000);

    const updated = await prisma.listing.update({
      where: { id: listingId },
      data: {
        isPromoted: true,
        isFeatured: apply.featured,
        feedBoost: computeFeedBoost(true, apply.featured),
        promotionType: apply.promotionType as any,
        promotionStartedAt: now,
        promotionExpiresAt: expiresAt,
        updatedAt: now,
      },
    });

    void recordAnalyticsEvent({
      eventType: ANALYTICS_EVENT.promotion_activated,
      userId: user.id,
      listingId,
      metadata: {
        packageId,
        source: "promote_api",
        paymentMethod: paymentMethod ?? null,
      },
      request,
    });

    void notifyListingPromoted({
      userId: listing.ownerUserId,
      listingTitle: listing.title,
      promotionExpiresAt: expiresAt,
      wasPromoted: listing.isPromoted,
      previousPromotionExpiresAt: listing.promotionExpiresAt,
    });

    return NextResponse.json({
      success: true,
      listing: updated,
      message: "Listing promoted successfully",
      paymentMethod: paymentMethod ?? null,
      paymentTransactionId: paymentTransactionId ?? null,
      paymentEmail: paymentEmail ?? null,
      paymentReference: paymentReference ?? null,
    });
  } catch (err: unknown) {
    console.error("Promotion error:", err);
    const message = err instanceof Error ? err.message : "Eroare la promovare";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Anulează promovarea (dashboard proprietar). */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: listingId } = await params;
    const idCheck = uuidSchema.safeParse(listingId);
    if (!idCheck.success) {
      return NextResponse.json({ error: "Invalid listing id" }, { status: 400 });
    }

    const security = await validateSecureRequest(request, {
      requireCSRF: true,
      rateLimit: "payment",
    });

    if (!security.success) {
      const status = security.rateLimitError ? 429 : security.csrfError ? 403 : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const user = await getUserFromRequest(request);
    if (!user?.id) {
      return NextResponse.json({ error: "Autentificare necesară" }, { status: 401 });
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, ownerUserId: true },
    });

    if (!listing) {
      return NextResponse.json({ error: "Anunț negăsit" }, { status: 404 });
    }

    if (listing.ownerUserId !== user.id) {
      return NextResponse.json({ error: "Acces interzis" }, { status: 403 });
    }

    const updated = await prisma.listing.update({
      where: { id: listingId },
      data: {
        isPromoted: false,
        isFeatured: false,
        feedBoost: computeFeedBoost(false, false),
        promotionType: null,
        promotionStartedAt: null,
        promotionExpiresAt: null,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, listing: updated });
  } catch (err: unknown) {
    console.error("Remove promotion error:", err);
    const message = err instanceof Error ? err.message : "Eroare";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

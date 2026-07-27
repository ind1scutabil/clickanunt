export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSecureRequest } from "@/lib/security/middleware";
import { uuidSchema } from "@/lib/security/validation-schemas";
import { computeFeedBoost } from "@/lib/listing-feed-boost";
import { getUserFromRequest } from "@/lib/auth";

/**
 * POST activation without a verified provider payment is disabled.
 * Card promotions activate only via Stripe webhook after signature verification.
 * PayPal / bank-transfer self-confirm paths previously called this and are blocked.
 */
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

    // Auth/ownership still checked so attackers cannot probe freely — but never activate.
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, ownerUserId: true },
    });

    if (!listing) {
      return NextResponse.json({ error: "Anunț negăsit" }, { status: 404 });
    }

    if (listing.ownerUserId !== user.id) {
      return NextResponse.json({ error: "Doar proprietarul poate promova anunțul" }, { status: 403 });
    }

    return NextResponse.json(
      {
        error:
          "Promovarea se activează doar după confirmarea plății cu cardul (Stripe webhook). PayPal și transferul bancar nu activează automat promovarea.",
        code: "STRIPE_PAYMENT_REQUIRED",
      },
      { status: 403 }
    );
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

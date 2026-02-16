export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { memoryStorage } from "@/lib/memory-storage";
import { validateSecureRequest } from "@/lib/security/middleware";
import { listingEditSchema, uuidSchema } from "@/lib/security/validation-schemas";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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
      
      return NextResponse.json(listing);
    }
    
    const listing = await prisma.listing.findUnique({
      where: { id },
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
          }
        }
      },
    });

    if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(listing);
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

    // Verify ownership
    const { verifyToken } = await import("@/lib/auth");
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const tokenPayload = await verifyToken(token);
    if (!tokenPayload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Check if listing exists and user owns it
    const existingListing = await prisma.listing.findUnique({
      where: { id },
      select: { ownerUserId: true }
    });

    if (!existingListing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // Use userId from token (not sub which is from standard JWT)
    const userIdFromToken = (tokenPayload as any).userId || (tokenPayload as any).sub;
    if (existingListing.ownerUserId !== userIdFromToken) {
      return NextResponse.json({ error: "Not authorized to edit this listing" }, { status: 403 });
    }

    const body = { ...(security.data as any), id };

    const allowed: any = {};
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

    for (const f of fields) if (f in body) allowed[f] = (body as any)[f];

    const updated = await prisma.listing.update({ where: { id }, data: allowed });
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
    await prisma.listing.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

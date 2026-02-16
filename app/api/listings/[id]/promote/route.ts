export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSecureRequest } from "@/lib/security/middleware";
import { uuidSchema } from "@/lib/security/validation-schemas";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const idCheck = uuidSchema.safeParse(id);
    if (!idCheck.success) {
      return NextResponse.json({ error: "Invalid listing id" }, { status: 400 });
    }

    const security = await validateSecureRequest(request, {
      requireCSRF: true,
      rateLimit: 'payment',
    });

    if (!security.success) {
      const status = security.rateLimitError
        ? 429
        : security.csrfError
        ? 403
        : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    // Parse request body for promotion details
    const body = await request.json();
    const { packageId } = body;

    // Map package IDs to promotion types and durations
    const promotionConfig: Record<string, { type: string, durationDays: number, featured: boolean }> = {
      'top': { type: 'boost_7days', durationDays: 7, featured: true },
      'urgent': { type: 'boost_72h', durationDays: 3, featured: false },
      'featured': { type: 'featured', durationDays: 5, featured: true },
      'refresh': { type: 'boost_24h', durationDays: 1, featured: false }
    };

    const config = promotionConfig[packageId];
    if (!config) {
      return NextResponse.json({ error: "Invalid package type" }, { status: 400 });
    }

    // Calculate expiration date
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (config.durationDays * 24 * 60 * 60 * 1000));

    // Update listing with promotion details
    const updated = await prisma.listing.update({
      where: { id },
      data: {
        isPromoted: true,
        isFeatured: config.featured,
        promotionType: config.type as any,
        promotionStartedAt: now,
        promotionExpiresAt: expiresAt,
        updatedAt: now // Refresh listing position
      }
    });

    return NextResponse.json({
      success: true,
      listing: updated,
      message: "Listing promoted successfully"
    });
  } catch (err: any) {
    console.error("Promotion error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

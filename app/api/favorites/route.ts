import { NextRequest, NextResponse } from 'next/server';
import { validateSecureRequest } from '@/lib/security/middleware';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { ANALYTICS_EVENT, recordAnalyticsEvent } from '@/lib/analytics-events';
import { normalizeListingPhotosArray } from '@/lib/listing-photo-url';

// GET /api/favorites - Get user's favorites
export async function GET(req: NextRequest) {
  try {
    const origin = new URL(req.url).origin;
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const tokenPayload = await verifyToken(token);
    if (!tokenPayload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = (tokenPayload as any).userId || (tokenPayload as any).sub;

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            priceAmount: true,
            priceCurrency: true,
            photos: true,
            city: true,
            county: true,
            category: true,
            subcategory: true,
            views: true,
            isFeatured: true,
            condition: true,
            make: true,
            model: true,
            year: true,
            mileage: true,
            fuel: true,
            transmission: true,
            status: true,
            createdAt: true,
            owner: {
              select: {
                id: true,
                email: true,
                name: true,
                businessName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const slim = favorites.map((f) => ({
      id: f.id,
      userId: f.userId,
      listingId: f.listingId,
      createdAt: f.createdAt.toISOString(),
      listing: {
        id: f.listing.id,
        title: f.listing.title,
        priceAmount: f.listing.priceAmount,
        priceCurrency: f.listing.priceCurrency,
        photos: normalizeListingPhotosArray(f.listing.photos, origin).slice(0, 4),
        city: f.listing.city,
        county: f.listing.county,
        category: f.listing.category,
        subcategory: f.listing.subcategory,
        views: f.listing.views,
        isFeatured: f.listing.isFeatured,
        condition: f.listing.condition,
        make: f.listing.make,
        model: f.listing.model,
        year: f.listing.year,
        mileage: f.listing.mileage,
        fuel: f.listing.fuel,
        transmission: f.listing.transmission,
        status: f.listing.status,
        createdAt: f.listing.createdAt.toISOString(),
        owner: f.listing.owner,
      },
    }));

    return NextResponse.json(
      { favorites: slim },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error: any) {
    console.error('Error fetching favorites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch favorites' },
      { status: 500 }
    );
  }
}

// POST /api/favorites - Add to favorites
const addFavoriteSchema = z.object({
  listingId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  try {
    const security = await validateSecureRequest(req, {
      requireCSRF: true,
      rateLimit: 'api',
      schema: addFavoriteSchema,
    });

    if (!security.success) {
      return NextResponse.json(
        { error: security.error || 'Unauthorized' },
        { status: security.rateLimitError ? 429 : security.csrfError ? 403 : 400 }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const tokenPayload = await verifyToken(token);
    if (!tokenPayload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = (tokenPayload as any).userId || (tokenPayload as any).sub;
    const { listingId } = security.data as any;

    // Check if listing exists
    const listing = await prisma.listing.findUnique({
      where: { id: listingId }
    });

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    // Create favorite (will fail if duplicate due to unique constraint)
    const favorite = await prisma.favorite.create({
      data: {
        userId,
        listingId,
      }
    });

    void recordAnalyticsEvent({
      eventType: ANALYTICS_EVENT.listing_favorite_added,
      userId,
      listingId,
      request: req,
    });

    return NextResponse.json({ success: true, favorite });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Already favorited' }, { status: 400 });
    }
    console.error('Error adding favorite:', error);
    return NextResponse.json(
      { error: 'Failed to add favorite' },
      { status: 500 }
    );
  }
}

// DELETE /api/favorites - Remove from favorites
export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const tokenPayload = await verifyToken(token);
    if (!tokenPayload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = (tokenPayload as any).userId || (tokenPayload as any).sub;
    const { searchParams } = new URL(req.url);
    const listingId = searchParams.get('listingId');

    if (!listingId) {
      return NextResponse.json({ error: 'listingId required' }, { status: 400 });
    }

    await prisma.favorite.deleteMany({
      where: {
        userId,
        listingId,
      }
    });

    void recordAnalyticsEvent({
      eventType: ANALYTICS_EVENT.listing_favorite_removed,
      userId,
      listingId,
      request: req,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error removing favorite:', error);
    return NextResponse.json(
      { error: 'Failed to remove favorite' },
      { status: 500 }
    );
  }
}

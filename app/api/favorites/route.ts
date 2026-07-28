import { NextRequest, NextResponse } from 'next/server';
import { validateSecureRequest } from '@/lib/security/middleware';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { ANALYTICS_EVENT, recordAnalyticsEvent } from '@/lib/analytics-events';
import { normalizeListingPhotosArray } from '@/lib/listing-photo-url';
import { FAVORITES_LIST_MAX } from '@/lib/infra/production-limits';
import { isListingSeoIndexable } from '@/lib/seo/listing-seo-eligibility';

function favoriteAvailability(listing: {
  status: string;
  deletedAt: Date | null;
  moderationStatus: string;
  expiresAt: Date | null;
}): { available: boolean; unavailableReason: string | null } {
  if (listing.deletedAt != null || listing.status === 'deleted') {
    return { available: false, unavailableReason: 'deleted' };
  }
  if (listing.status === 'hidden' || listing.status === 'rejected') {
    return { available: false, unavailableReason: listing.status };
  }
  if (listing.moderationStatus !== 'approved') {
    return { available: false, unavailableReason: 'moderation' };
  }
  if (listing.expiresAt != null && listing.expiresAt.getTime() <= Date.now()) {
    return { available: false, unavailableReason: 'expired' };
  }
  if (listing.status !== 'active') {
    return { available: false, unavailableReason: listing.status };
  }
  return { available: true, unavailableReason: null };
}

// GET /api/favorites - Get user's favorites
export async function GET(req: NextRequest) {
  try {
    const u = new URL(req.url);
    const proto = (req.headers.get("x-forwarded-proto") ?? "https").split(",")[0].trim();
    const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? u.host)
      .split(",")[0]
      .trim();
    const origin = `${proto}://${host}`;
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            priceAmount: true,
            priceCurrency: true,
            priceType: true,
            salaryMin: true,
            salaryMax: true,
            salaryCurrency: true,
            salaryPeriod: true,
            photos: true,
            city: true,
            county: true,
            category: true,
            subcategory: true,
            views: true,
            isFeatured: true,
            isPromoted: true,
            promotionExpiresAt: true,
            condition: true,
            make: true,
            model: true,
            year: true,
            mileage: true,
            fuel: true,
            transmission: true,
            status: true,
            deletedAt: true,
            moderationStatus: true,
            expiresAt: true,
            createdAt: true,
            owner: {
              select: {
                id: true,
                name: true,
                businessName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: FAVORITES_LIST_MAX,
    });

    const slim = favorites.map((f) => {
      const avail = favoriteAvailability(f.listing);
      const promotedLive =
        Boolean(f.listing.isPromoted) &&
        (f.listing.promotionExpiresAt == null ||
          f.listing.promotionExpiresAt.getTime() > Date.now());
      return {
        id: f.id,
        userId: f.userId,
        listingId: f.listingId,
        createdAt: f.createdAt.toISOString(),
        available: avail.available,
        unavailableReason: avail.unavailableReason,
        listing: {
          id: f.listing.id,
          title: f.listing.title,
          priceAmount: f.listing.priceAmount,
          priceCurrency: f.listing.priceCurrency,
          priceType: f.listing.priceType,
          salaryMin: f.listing.salaryMin,
          salaryMax: f.listing.salaryMax,
          salaryCurrency: f.listing.salaryCurrency,
          salaryPeriod: f.listing.salaryPeriod,
          photos: normalizeListingPhotosArray(f.listing.photos, origin).slice(0, 4),
          city: f.listing.city,
          county: f.listing.county,
          category: f.listing.category,
          subcategory: f.listing.subcategory,
          views: f.listing.views,
          isFeatured: f.listing.isFeatured,
          isPromoted: promotedLive,
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
      };
    });

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

    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;
    const { listingId } = security.data as any;

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        status: true,
        deletedAt: true,
        moderationStatus: true,
        expiresAt: true,
      },
    });

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (
      !isListingSeoIndexable({
        status: listing.status,
        deletedAt: listing.deletedAt,
        moderationStatus: listing.moderationStatus,
        expiresAt: listing.expiresAt,
      })
    ) {
      return NextResponse.json(
        { error: 'Anunțul nu este disponibil public pentru favorite' },
        { status: 400 }
      );
    }

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
    const security = await validateSecureRequest(req, {
      requireCSRF: true,
      rateLimit: 'api',
    });

    if (!security.success) {
      return NextResponse.json(
        { error: security.error || 'Unauthorized' },
        { status: security.rateLimitError ? 429 : security.csrfError ? 403 : 400 }
      );
    }

    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;
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

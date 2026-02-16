import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateSecureRequest } from '@/lib/security/middleware';
import { z } from 'zod';

// GET /api/favorites - Get user's favorites
export async function GET(req: NextRequest) {
  try {
    const security = await validateSecureRequest(req, {
      requireCSRF: false,
      rateLimit: 'listings',
    });

    if (!security.success) {
      return NextResponse.json(
        { error: security.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = (security.data as any)?.userId as string;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    // Get favorites with listing details
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
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ favorites });
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
      rateLimit: 'listings',
      schema: addFavoriteSchema,
    });

    if (!security.success) {
      const status = security.rateLimitError
        ? 429
        : security.csrfError
        ? 403
        : security.validationError
        ? 400
        : 401;
      return NextResponse.json({ error: security.error }, { status });
    }

    const userId = (security.data as any)?.userId as string;
    const { listingId } = security.data as { listingId: string };

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    // Check if listing exists and is active
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, status: true },
    });

    if (!listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      );
    }

    // Check if already favorited
    const existing = await prisma.favorite.findUnique({
      where: {
        userId_listingId: {
          userId,
          listingId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { message: 'Already in favorites', favorite: existing },
        { status: 200 }
      );
    }

    // Add to favorites
    const favorite = await prisma.favorite.create({
      data: {
        userId,
        listingId,
      },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            priceAmount: true,
            priceCurrency: true,
            photos: true,
          },
        },
      },
    });

    return NextResponse.json({ favorite }, { status: 201 });
  } catch (error: any) {
    console.error('Error adding favorite:', error);
    return NextResponse.json(
      { error: 'Failed to add favorite' },
      { status: 500 }
    );
  }
}

// DELETE /api/favorites?listingId=xxx - Remove from favorites
export async function DELETE(req: NextRequest) {
  try {
    const security = await validateSecureRequest(req, {
      requireCSRF: true,
      rateLimit: 'listings',
    });

    if (!security.success) {
      return NextResponse.json(
        { error: security.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = (security.data as any)?.userId as string;
    const { searchParams } = new URL(req.url);
    const listingId = searchParams.get('listingId');

    if (!userId || !listingId) {
      return NextResponse.json(
        { error: 'User ID and Listing ID required' },
        { status: 400 }
      );
    }

    // Delete favorite
    await prisma.favorite.deleteMany({
      where: {
        userId,
        listingId,
      },
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

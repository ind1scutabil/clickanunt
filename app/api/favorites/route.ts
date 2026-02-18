import { NextRequest, NextResponse } from 'next/server';
import { validateSecureRequest } from '@/lib/security/middleware';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// GET /api/favorites - Get user's favorites
export async function GET(req: NextRequest) {
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

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: {
        listing: {
          include: {
            owner: {
              select: {
                id: true,
                email: true,
                name: true,
                businessName: true,
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
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

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error removing favorite:', error);
    return NextResponse.json(
      { error: 'Failed to remove favorite' },
      { status: 500 }
    );
  }
}

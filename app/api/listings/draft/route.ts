import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateSecureRequest } from '@/lib/security/middleware';
import { draftCreateSchema, uuidSchema } from '@/lib/security/validation-schemas';
import { verifyToken } from '@/lib/auth';

// Create or update draft
export async function POST(req: NextRequest) {
  try {
    const security = await validateSecureRequest(req, {
      requireCSRF: true,
      rateLimit: 'listing_draft',
      schema: draftCreateSchema,
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

    // Extract userId from JWT token
    const authHeader = req.headers.get('authorization');
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const cookieToken = req.cookies.get('accessToken')?.value || null;
    const accessToken = bearer || cookieToken;
    const tokenPayload = accessToken ? await verifyToken(accessToken) : null;
    const userId = tokenPayload?.userId;

    // ✅ Validate userId is a proper UUID
    const uuidValidation = uuidSchema.safeParse(userId);
    if (!uuidValidation.success) {
      return NextResponse.json(
        { error: 'User ID format is invalid. Please log in again.' },
        { status: 401 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Autentificare necesară' },
        { status: 401 }
      );
    }

    const { ...draftData } = security.data as any;

    // Create draft with status 'draft'
    const draft = await prisma.listing.create({
      data: {
        ownerUserId: userId,
        status: 'draft',
        title: draftData.title || 'Draft',
        category: draftData.category || 'Other',
        priceAmount: draftData.priceAmount || 0,
        description: draftData.description,
        photos: draftData.photos || [],
        county: draftData.county,
        city: draftData.city,
        make: draftData.make,
        model: draftData.model,
        year: draftData.year,
        mileage: draftData.mileage,
        fuel: draftData.fuel,
        transmission: draftData.transmission,
        isDealer: draftData.isDealer || false,
        dealerBrands: draftData.dealerBrands || [],
        dealerPriceMin: draftData.dealerPriceMin,
        dealerPriceMax: draftData.dealerPriceMax,
      },
    });

    return NextResponse.json(draft);
  } catch (error: any) {
    console.error('Error creating draft:', error);
    return NextResponse.json(
      { error: 'Failed to create draft' },
      { status: 500 }
    );
  }
}

// Update existing draft
export async function PUT(req: NextRequest) {
  try {
    const security = await validateSecureRequest(req, {
      requireCSRF: true,
      rateLimit: 'listing_draft',
      schema: draftCreateSchema,
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

    // Extract userId from JWT token
    const authHeader = req.headers.get('authorization');
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const cookieToken = req.cookies.get('accessToken')?.value || null;
    const accessToken = bearer || cookieToken;
    const tokenPayload = accessToken ? await verifyToken(accessToken) : null;
    const userId = tokenPayload?.userId;

    // ✅ Validate userId is a proper UUID
    const uuidValidation = uuidSchema.safeParse(userId);
    if (!uuidValidation.success) {
      return NextResponse.json(
        { error: 'User ID format is invalid. Please log in again.' },
        { status: 401 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Autentificare necesară' },
        { status: 401 }
      );
    }

    const { id, ...draftData } = security.data as any;

    if (!id) {
      return NextResponse.json(
        { error: 'Draft ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await prisma.listing.findUnique({
      where: { id },
      select: { ownerUserId: true },
    });

    if (!existing || existing.ownerUserId !== userId) {
      return NextResponse.json(
        { error: 'Draft not found or unauthorized' },
        { status: 404 }
      );
    }

    // Update draft
    const draft = await prisma.listing.update({
      where: { id },
      data: {
        title: draftData.title,
        category: draftData.category,
        priceAmount: draftData.priceAmount,
        description: draftData.description,
        photos: draftData.photos,
        county: draftData.county,
        city: draftData.city,
        make: draftData.make,
        model: draftData.model,
        year: draftData.year,
        mileage: draftData.mileage,
        fuel: draftData.fuel,
        transmission: draftData.transmission,
        isDealer: draftData.isDealer,
        dealerBrands: draftData.dealerBrands,
        dealerPriceMin: draftData.dealerPriceMin,
        dealerPriceMax: draftData.dealerPriceMax,
      },
    });

    return NextResponse.json(draft);
  } catch (error: any) {
    console.error('Error updating draft:', error);
    return NextResponse.json(
      { error: 'Failed to update draft' },
      { status: 500 }
    );
  }
}

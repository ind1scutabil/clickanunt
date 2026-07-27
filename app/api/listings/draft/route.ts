import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateSecureRequest } from '@/lib/security/middleware';
import { draftCreateSchema, uuidSchema } from '@/lib/security/validation-schemas';
import { verifyToken } from '@/lib/auth';
import { normalizeDraftMoneyFields } from '@/lib/listing-draft-money';

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

    const { ...draftData } = security.data as Record<string, unknown>;
    const money = normalizeDraftMoneyFields({
      category: (draftData.category as string) || null,
      subcategory: (draftData.subcategory as string) || null,
      priceType: (draftData.priceType as string) || null,
      priceAmount:
        draftData.priceAmount === undefined
          ? null
          : (draftData.priceAmount as number | null),
      priceCurrency: (draftData.priceCurrency as string) || null,
      salaryMin:
        draftData.salaryMin === undefined
          ? null
          : (draftData.salaryMin as number | null),
      salaryMax:
        draftData.salaryMax === undefined
          ? null
          : (draftData.salaryMax as number | null),
      salaryCurrency: (draftData.salaryCurrency as string) || null,
      salaryPeriod: (draftData.salaryPeriod as string) || null,
    });

    // Create draft with status 'draft' — never coerce null amount → 0
    const draft = await prisma.listing.create({
      data: {
        ownerUserId: userId,
        status: 'draft',
        title: (draftData.title as string) || 'Draft',
        category: (draftData.category as string) || 'Other',
        subcategory: (draftData.subcategory as string) || null,
        priceType: money.priceType,
        priceAmount: money.priceAmount,
        priceCurrency: money.priceCurrency,
        salaryMin: money.salaryMin,
        salaryMax: money.salaryMax,
        salaryCurrency: money.salaryCurrency,
        salaryPeriod: money.salaryPeriod,
        description: (draftData.description as string) || null,
        photos: (draftData.photos as string[]) || [],
        county: (draftData.county as string) || null,
        city: (draftData.city as string) || null,
        make: (draftData.make as string) || null,
        model: (draftData.model as string) || null,
        year: (draftData.year as number) || null,
        mileage: (draftData.mileage as number) || null,
        ...(typeof draftData.fuel === 'string' && draftData.fuel
          ? { fuel: draftData.fuel as never }
          : {}),
        ...(typeof draftData.transmission === 'string' && draftData.transmission
          ? { transmission: draftData.transmission as never }
          : {}),
        isDealer: Boolean(draftData.isDealer) || false,
        dealerBrands: (draftData.dealerBrands as string[]) || [],
        dealerPriceMin: (draftData.dealerPriceMin as number) || null,
        dealerPriceMax: (draftData.dealerPriceMax as number) || null,
      },
    });

    return NextResponse.json(draft);
  } catch (error: unknown) {
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

    const { id, ...draftData } = security.data as Record<string, unknown> & {
      id?: string;
    };

    if (!id) {
      return NextResponse.json(
        { error: 'Draft ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await prisma.listing.findUnique({
      where: { id },
      select: {
        ownerUserId: true,
        status: true,
        category: true,
        subcategory: true,
        priceType: true,
        priceAmount: true,
        priceCurrency: true,
        salaryMin: true,
        salaryMax: true,
        salaryCurrency: true,
        salaryPeriod: true,
      },
    });

    if (!existing || existing.ownerUserId !== userId) {
      return NextResponse.json(
        { error: 'Draft not found or unauthorized' },
        { status: 404 }
      );
    }

    if (existing.status !== 'draft') {
      return NextResponse.json(
        { error: 'Only draft listings can be updated via this endpoint' },
        { status: 400 }
      );
    }

    const money = normalizeDraftMoneyFields({
      category:
        (draftData.category as string | undefined) ?? existing.category,
      subcategory:
        draftData.subcategory !== undefined
          ? (draftData.subcategory as string | null)
          : existing.subcategory,
      priceType:
        draftData.priceType !== undefined
          ? (draftData.priceType as string | null)
          : existing.priceType,
      priceAmount:
        draftData.priceAmount !== undefined
          ? (draftData.priceAmount as number | null)
          : existing.priceAmount,
      priceCurrency:
        draftData.priceCurrency !== undefined
          ? (draftData.priceCurrency as string | null)
          : existing.priceCurrency,
      salaryMin:
        draftData.salaryMin !== undefined
          ? (draftData.salaryMin as number | null)
          : existing.salaryMin,
      salaryMax:
        draftData.salaryMax !== undefined
          ? (draftData.salaryMax as number | null)
          : existing.salaryMax,
      salaryCurrency:
        draftData.salaryCurrency !== undefined
          ? (draftData.salaryCurrency as string | null)
          : existing.salaryCurrency,
      salaryPeriod:
        draftData.salaryPeriod !== undefined
          ? (draftData.salaryPeriod as string | null)
          : existing.salaryPeriod,
    });

    const draft = await prisma.listing.update({
      where: { id },
      data: {
        title: draftData.title as string | undefined,
        category: draftData.category as string | undefined,
        subcategory:
          draftData.subcategory !== undefined
            ? (draftData.subcategory as string | null)
            : undefined,
        priceType: money.priceType,
        priceAmount: money.priceAmount,
        priceCurrency: money.priceCurrency,
        salaryMin: money.salaryMin,
        salaryMax: money.salaryMax,
        salaryCurrency: money.salaryCurrency,
        salaryPeriod: money.salaryPeriod,
        description: draftData.description as string | undefined,
        photos: draftData.photos as string[] | undefined,
        county: draftData.county as string | undefined,
        city: draftData.city as string | undefined,
        make: draftData.make as string | undefined,
        model: draftData.model as string | undefined,
        year: draftData.year as number | undefined,
        mileage: draftData.mileage as number | undefined,
        ...(draftData.fuel !== undefined
          ? { fuel: draftData.fuel as never }
          : {}),
        ...(draftData.transmission !== undefined
          ? { transmission: draftData.transmission as never }
          : {}),
        isDealer: draftData.isDealer as boolean | undefined,
        dealerBrands: draftData.dealerBrands as string[] | undefined,
        dealerPriceMin: draftData.dealerPriceMin as number | undefined,
        dealerPriceMax: draftData.dealerPriceMax as number | undefined,
      },
    });

    return NextResponse.json(draft);
  } catch (error: unknown) {
    console.error('Error updating draft:', error);
    return NextResponse.json(
      { error: 'Failed to update draft' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Create or update draft
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, ...draftData } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

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
    const body = await req.json();
    const { id, userId, ...draftData } = body;

    if (!id || !userId) {
      return NextResponse.json(
        { error: 'Draft ID and User ID are required' },
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

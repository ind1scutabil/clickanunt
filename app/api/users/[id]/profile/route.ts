import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;

    // Fetch user with business profile info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        businessName: true,
        businessLogo: true,
        businessDescription: true,
        businessLocation: true,
        businessPhone: true,
        businessWebsite: true,
        businessEmail: true,
        trustScore: true,
        verificationLevel: true,
        accountType: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Utilizator negăsit' },
        { status: 404 }
      );
    }

    // Business accounts must have business info to show profile
    if (user.accountType === 'business' && !user.businessName) {
      return NextResponse.json(
        { error: 'Profil business incomplet' },
        { status: 400 }
      );
    }

    // Fetch active listings
    const listings = await prisma.listing.findMany({
      where: {
        ownerUserId: userId,
        status: { in: ['active', 'pending'] },
      },
      select: {
        id: true,
        title: true,
        priceAmount: true,
        priceCurrency: true,
        category: true,
        photos: true,
        createdAt: true,
        status: true,
        isPromoted: true,
        views: true,
      },
      orderBy: [
        { isPromoted: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 50,
    });

    // Calculate stats
    const allListings = await prisma.listing.findMany({
      where: { ownerUserId: userId },
      select: {
        status: true,
        views: true,
      },
    });

    const stats = {
      totalListings: allListings.length,
      activeListings: allListings.filter((l: any) => l.status === 'active').length,
      soldListings: allListings.filter((l: any) => l.status === 'sold').length,
      totalViews: allListings.reduce((sum: number, l: any) => sum + l.views, 0),
    };

    return NextResponse.json({
      ...user,
      listings,
      stats,
    });
  } catch (error: any) {
    console.error('Error fetching business profile:', error);
    return NextResponse.json(
      { error: 'Eroare la încărcarea profilului' },
      { status: 500 }
    );
  }
}

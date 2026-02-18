/**
 * API Route: Admin - Get all listings for a specific user (for moderation)
 * Includes: active listings + listings in moderation queue
 */

export const runtime = "nodejs";
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/rbac";
import type { UserRole } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = id;
 
    const testListings = await prisma.listing.findMany({
      where: {
        ownerUserId: userId,
      },
      select: {
        id: true,
        title: true,
        category: true,
        subcategory: true,
        priceAmount: true,
        priceCurrency: true,
        status: true,
        photos: true,
        owner: {
          select: {
            email: true,
            id: true,
          },
        },
        ownerUserId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    const user = await getUserFromRequest(request as any);

    if (!user || !hasPermission(user.role as UserRole, Permission.USERS_VIEW_ALL)) {
      return NextResponse.json(
        { error: "Acces interzis" },
        { status: 403 }
      );
    }
    
    // Continue with normal logic...
    const listings = testListings;

    // Fetch listings in moderation queue for this user
    const queuedListings = await prisma.moderationQueue.findMany({
      where: {
        listing: {
          ownerUserId: userId,
        },
      },
      select: {
        id: true,
        listing: {
          select: {
            id: true,
            title: true,
            category: true,
            subcategory: true,
            priceAmount: true,
            priceCurrency: true,
            photos: true,
            owner: {
              select: {
                email: true,
                id: true,
              },
            },
            ownerUserId: true,
            createdAt: true,
            status: true,
          },
        },
        status: true,
        priority: true,
        assignedTo: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        moderator: {
          select: {
            email: true,
          },
        },
      },
    });
    

    // Transform and combine results
    const transformedListings = listings.map((listing) => ({
      id: listing.id,
      title: listing.title,
      category: listing.category,
      subcategory: listing.subcategory,
      price: listing.priceAmount,
      priceCurrency: listing.priceCurrency,
      status: listing.status,
      photos: listing.photos && listing.photos.length > 0 ? listing.photos[0] : null,
      owner: listing.owner?.email || 'Utilizator necunoscut',
      ownerUserId: listing.ownerUserId,
      createdAt: listing.createdAt?.toISOString(),
      updatedAt: listing.updatedAt?.toISOString(),
      queueStatus: undefined, // Not in queue
      queueId: null,
      moderator: null,
    }));

    const transformedQueuedListings = queuedListings.map((queueItem) => ({
      id: queueItem.listing?.id,
      title: queueItem.listing?.title,
      category: queueItem.listing?.category,
      subcategory: queueItem.listing?.subcategory,
      price: queueItem.listing?.priceAmount,
      priceCurrency: queueItem.listing?.priceCurrency,
      status: queueItem.listing?.status || 'unknown', // Listing status
      photos: queueItem.listing?.photos && queueItem.listing.photos.length > 0 ? queueItem.listing.photos[0] : null,
      owner: queueItem.listing?.owner?.email || 'Utilizator necunoscut',
      ownerUserId: queueItem.listing?.ownerUserId,
      createdAt: queueItem.listing?.createdAt?.toISOString(),
      updatedAt: queueItem.updatedAt?.toISOString(),
      queueStatus: queueItem.status, // Moderation queue status (pending, approved, rejected)
      queueId: queueItem.id,
      moderator: queueItem.moderator?.email || null,
    }));

    // Combine and deduplicate (prefer queued version if in queue)
    const allListings: any[] = [...transformedQueuedListings];
    for (const listing of transformedListings) {
      if (!allListings.some((l) => l.id === listing.id)) {
        allListings.push(listing as any);
      }
    }

    const filteredListings = allListings.filter((listing) => listing.ownerUserId === userId);

    return NextResponse.json({
      success: true,
      listings: filteredListings,
      count: filteredListings.length,
      debug: {
        paramId: id,
        userId: userId,
        listingsCount: listings.length,
        queuedListingsCount: queuedListings.length,
        listingsTitles: listings.map(l => l.title),
        listedOwnerIds: listings.map(l => l.ownerUserId),
      }
    });
  } catch (error) {
    console.error('Get user listings error:', error);
    return NextResponse.json(
      { error: "Eroare la obținerea anunțurilor" },
      { status: 500 }
    );
  }
}

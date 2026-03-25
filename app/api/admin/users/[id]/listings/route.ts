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
    const user = await getUserFromRequest(request as any);

    if (!user || !hasPermission(user.role as UserRole, Permission.USERS_VIEW_ALL)) {
      return NextResponse.json(
        { error: "Acces interzis" },
        { status: 403 }
      );
    }

    const listings = await prisma.listing.findMany({
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
        createdAt: "desc",
      },
    });

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
            updatedAt: true,
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
      orderBy: {
        createdAt: "desc",
      },
    });

    const transformedListings = listings.map((listing) => ({
      id: listing.id,
      title: listing.title,
      category: listing.category,
      subcategory: listing.subcategory,
      price: listing.priceAmount,
      priceCurrency: listing.priceCurrency,
      status: listing.status,
      photos: listing.photos || [],
      owner: listing.owner?.email || "Utilizator necunoscut",
      ownerUserId: listing.ownerUserId,
      createdAt: listing.createdAt?.toISOString(),
      updatedAt: listing.updatedAt?.toISOString(),
      queueStatus: null as string | null,
      queueId: null as string | null,
      moderator: null as string | null,
      notes: null as string | null,
    }));

    const transformedQueuedListings = queuedListings
      .filter((queueItem) => queueItem.listing?.id)
      .map((queueItem) => ({
        id: queueItem.listing!.id,
        title: queueItem.listing!.title,
        category: queueItem.listing!.category,
        subcategory: queueItem.listing!.subcategory,
        price: queueItem.listing!.priceAmount,
        priceCurrency: queueItem.listing!.priceCurrency,
        status: queueItem.listing!.status || "unknown",
        photos: queueItem.listing!.photos || [],
        owner: queueItem.listing!.owner?.email || "Utilizator necunoscut",
        ownerUserId: queueItem.listing!.ownerUserId,
        createdAt: queueItem.listing!.createdAt?.toISOString(),
        updatedAt: queueItem.listing!.updatedAt?.toISOString() || queueItem.updatedAt?.toISOString(),
        queueStatus: queueItem.status,
        queueId: queueItem.id,
        moderator: queueItem.moderator?.email || null,
        notes: queueItem.notes || null,
      }));

    const listingsById = new Map<string, (typeof transformedListings)[number]>();

    transformedListings.forEach((listing) => {
      listingsById.set(listing.id, listing);
    });

    transformedQueuedListings.forEach((listing) => {
      listingsById.set(listing.id, listing);
    });

    const allListings = Array.from(listingsById.values()).sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    return NextResponse.json({
      success: true,
      listings: allListings,
      count: allListings.length,
    });
  } catch (error) {
    console.error("Get user listings error:", error);
    return NextResponse.json(
      { error: "Eroare la obținerea anunțurilor" },
      { status: 500 }
    );
  }
}
/**
 * API Route: Admin - Moderation Queue
 */

export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/rbac";
import type { UserRole } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user || !hasPermission(user.role as UserRole, Permission.MODERATION_VIEW_QUEUE)) {
      return NextResponse.json(
        { error: "Acces interzis" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const assignedTo = searchParams.get('assignedTo');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = { status };
    if (assignedTo) where.assignedTo = assignedTo;

    const [items, total] = await Promise.all([
      prisma.moderationQueue.findMany({
        where,
        include: {
          moderator: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
          listing: {
            select: {
              id: true,
              category: true,
              ownerUserId: true,
              photos: true,
              priceAmount: true,
              priceCurrency: true,
              subcategory: true,
              title: true,
              owner: {
                select: {
                  accountType: true,
                  avatar: true,
                  averageRating: true,
                  banReason: true,
                  bannedAt: true,
                  bannedBy: true,
                  businessCUI: true,
                  businessDescription: true,
                  businessEmail: true,
                  businessLocation: true,
                  businessLogo: true,
                  businessName: true,
                  businessPhone: true,
                  businessRegCom: true,
                  businessWebsite: true,
                  createdAt: true,
                  creditsBalance: true,
                  email: true,
                  emailVerified: true,
                  failedLoginAttempts: true,
                  freeBoostsRemaining: true,
                  id: true,
                  isBanned: true,
                  lastActiveAt: true,
                  lastLoginAt: true,
                  lastLoginIp: true,
                  lockedUntil: true,
                  name: true,
                  phone: true,
                  phoneVerified: true,
                  promotionBenefits: true,
                  promotionDiscountPercent: true,
                  responseRate: true,
                  role: true,
                  subscriptionExpiresAt: true,
                  subscriptionRenewsAt: true,
                  subscriptionTier: true,
                  totalListings: true,
                  totalSales: true,
                  trustScore: true,
                  twoFactorEnabled: true,
                  updatedAt: true,
                  verificationLevel: true,
                },
              },
            },
          },
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' },
        ],
        take: limit,
        skip: offset,
      }),
      prisma.moderationQueue.count({ where }),
    ]);

    // Fallback safety-net:
    // if pending listings exist but queue rows are missing, expose them in moderation tab.
    if (status === 'pending') {
      const pendingListingIds = new Set(
        items.map((item) => item.listingId).filter((id): id is string => typeof id === 'string')
      );

      const orphanPendingListings = await prisma.listing.findMany({
        where: {
          status: 'pending',
          id: {
            notIn: Array.from(pendingListingIds),
          },
        },
        take: Math.max(0, limit - items.length),
        orderBy: { updatedAt: 'asc' },
        select: {
          id: true,
          category: true,
          ownerUserId: true,
          photos: true,
          priceAmount: true,
          priceCurrency: true,
          subcategory: true,
          title: true,
          createdAt: true,
          updatedAt: true,
          owner: {
            select: {
              accountType: true,
              avatar: true,
              averageRating: true,
              banReason: true,
              bannedAt: true,
              bannedBy: true,
              businessCUI: true,
              businessDescription: true,
              businessEmail: true,
              businessLocation: true,
              businessLogo: true,
              businessName: true,
              businessPhone: true,
              businessRegCom: true,
              businessWebsite: true,
              createdAt: true,
              creditsBalance: true,
              email: true,
              emailVerified: true,
              failedLoginAttempts: true,
              freeBoostsRemaining: true,
              id: true,
              isBanned: true,
              lastActiveAt: true,
              lastLoginAt: true,
              lastLoginIp: true,
              lockedUntil: true,
              name: true,
              phone: true,
              phoneVerified: true,
              promotionBenefits: true,
              promotionDiscountPercent: true,
              responseRate: true,
              role: true,
              subscriptionExpiresAt: true,
              subscriptionRenewsAt: true,
              subscriptionTier: true,
              totalListings: true,
              totalSales: true,
              trustScore: true,
              twoFactorEnabled: true,
              updatedAt: true,
              verificationLevel: true,
            },
          },
        },
      });

      const syntheticItems = orphanPendingListings.map((listing) => ({
        id: `synthetic-${listing.id}`,
        listingId: listing.id,
        priority: 0,
        assignedTo: null,
        moderator: null,
        status: 'pending',
        notes: 'Listing pending without queue row',
        createdAt: listing.createdAt,
        updatedAt: listing.updatedAt,
        listing,
      }));

      items.push(...syntheticItems as any);
    }

    return NextResponse.json({
      success: true,
      items,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Get moderation queue error:', error);
    return NextResponse.json(
      { error: "Eroare la obținerea queue-ului" },
      { status: 500 }
    );
  }
}

import type { PrismaClient } from "@prisma/client";
import { computeFeedBoost } from "./listing-feed-boost";

/**
 * Expiră în masă promovările cu `promotionExpiresAt` în trecut.
 * Un singur UPDATE SQL: `feedBoost` = f(isFeatured), păstrează featured setat de admin.
 */
export async function expireAllExpiredPromotions(
  prisma: PrismaClient,
  now: Date = new Date()
): Promise<{ updated: number }> {
  const result = await prisma.$executeRaw`
    UPDATE listings
    SET
      "isPromoted" = false,
      "feedBoost" = CASE WHEN "isFeatured" THEN 100 ELSE 0 END,
      "promotionType" = NULL,
      "promotionStartedAt" = NULL,
      "promotionExpiresAt" = NULL,
      "updatedAt" = ${now}
    WHERE
      "isPromoted" = true
      AND "promotionExpiresAt" IS NOT NULL
      AND "promotionExpiresAt" < ${now}
  `;
  const updated = typeof result === "bigint" ? Number(result) : Number(result);
  return { updated };
}

type ListingPromotionFields = {
  id: string;
  isPromoted: boolean;
  isFeatured: boolean;
  promotionExpiresAt: Date | null;
  promotionType?: unknown;
  promotionStartedAt?: Date | null;
  feedBoost?: number;
};

/** Expiră promovarea pentru un singur anunț (lazy, la GET detaliu) dacă a expirat. */
export async function applyListingPromotionExpiryIfNeeded<T extends ListingPromotionFields>(
  prisma: PrismaClient,
  listing: T,
  now: Date = new Date()
): Promise<T> {
  if (
    !listing.isPromoted ||
    !listing.promotionExpiresAt ||
    listing.promotionExpiresAt >= now
  ) {
    return listing;
  }

  const feedBoost = computeFeedBoost(false, listing.isFeatured);
  await prisma.listing.update({
    where: { id: listing.id },
    data: {
      isPromoted: false,
      promotionType: null,
      promotionStartedAt: null,
      promotionExpiresAt: null,
      feedBoost,
    },
  });

  return {
    ...listing,
    isPromoted: false,
    promotionType: null,
    promotionStartedAt: null,
    promotionExpiresAt: null,
    feedBoost,
  };
}

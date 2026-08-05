/**
 * SSR public listing detail — same visibility rules as GET /api/listings/[id] for anonymous viewers.
 * Avoids client loading skeleton → content remount CLS on /listings/[id].
 */
import { prisma } from "@/lib/prisma";
import { normalizeListingPhotosArray } from "@/lib/listing-photo-url";
import { sanitizeListingPayloadForViewer } from "@/lib/listings/public-listing-dto";
import { isListingSeoIndexable } from "@/lib/seo/listing-seo-eligibility";
import { applyListingPromotionExpiryIfNeeded } from "@/lib/expire-listing-promotions";
import { siteOrigin } from "@/lib/site-url";
import { uuidSchema } from "@/lib/security/validation-schemas";

export async function getPublicListingDetailForSsr(id: string): Promise<Record<string, unknown> | null> {
  const idCheck = uuidSchema.safeParse(id);
  if (!idCheck.success) return null;
  if (process.env.USE_IN_MEMORY_DB === "true") return null;

  const listing = await prisma.listing.findFirst({
    where: { id, deletedAt: null },
    include: {
      owner: {
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          businessPhone: true,
          businessName: true,
          avatar: true,
          phoneVerified: true,
          emailVerified: true,
          trustScore: true,
          totalSales: true,
          averageRating: true,
          totalListings: true,
          responseRate: true,
          role: true,
          createdAt: true,
        },
      },
    },
  });
  if (!listing) return null;

  const listingFresh = await applyListingPromotionExpiryIfNeeded(prisma, listing);
  if (!isListingSeoIndexable(listingFresh)) return null;

  const origin = siteOrigin();
  return sanitizeListingPayloadForViewer(
    {
      ...listingFresh,
      photos: normalizeListingPhotosArray(listingFresh.photos, origin),
    } as Record<string, unknown>,
    { isOwnerOrAdmin: false }
  );
}

/** First-page similar listings for detail SSR (stable geometry vs client late fetch). */
export async function getSimilarListingsForSsr(opts: {
  listingId: string;
  category: string;
  make?: string | null;
  model?: string | null;
  limit?: number;
}): Promise<Record<string, unknown>[]> {
  if (process.env.USE_IN_MEMORY_DB === "true") return [];
  const limit = opts.limit ?? 4;
  const origin = siteOrigin();
  const rows = await prisma.listing.findMany({
    where: {
      deletedAt: null,
      id: { not: opts.listingId },
      category: opts.category,
      status: "active",
      moderationStatus: "approved",
      ...(opts.make ? { make: opts.make } : {}),
      ...(opts.model ? { model: opts.model } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit + 4,
    select: {
      id: true,
      title: true,
      photos: true,
      priceAmount: true,
      priceCurrency: true,
      city: true,
      county: true,
      category: true,
    },
  });
  return rows.slice(0, limit).map((row) =>
    sanitizeListingPayloadForViewer(
      {
        ...row,
        photos: normalizeListingPhotosArray(row.photos, origin),
      } as Record<string, unknown>,
      { isOwnerOrAdmin: false }
    )
  );
}

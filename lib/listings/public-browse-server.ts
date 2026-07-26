import type { FuelType, Prisma, Transmission } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeListingPhotosArray } from "@/lib/listing-photo-url";
import { prismaOrderByForListingSort, parseListingFeedSort } from "@/lib/listing-feed-sort";
import { seoIndexableListingWhere } from "@/lib/seo/indexable-listing-where";
import { siteOrigin } from "@/lib/site-url";
import type { ListingPublicDto } from "@clickanunt/api-contracts";

export type PublicBrowseFilters = {
  q?: string;
  category?: string;
  subcategory?: string;
  county?: string;
  city?: string;
  make?: string;
  model?: string;
  fuel?: string;
  transmission?: string;
  sortBy?: string;
  sortOrder?: string;
};

export function publicBrowseListingWhere(now?: Date): Prisma.ListingWhereInput {
  return seoIndexableListingWhere(now);
}

function filtersToSortKey(filters: PublicBrowseFilters): string {
  const sortKey = `${filters.sortBy ?? "createdAt"}-${filters.sortOrder ?? "desc"}`;
  const sortMap: Record<string, string> = {
    "createdAt-desc": "newest",
    "price-asc": "priceAsc",
    "price-desc": "priceDesc",
    "featured-desc": "featured",
  };
  return sortMap[sortKey] ?? "newest";
}

function applyBrowseFilters(
  where: Prisma.ListingWhereInput,
  filters: PublicBrowseFilters
): Prisma.ListingWhereInput {
  const next: Prisma.ListingWhereInput = { ...where };
  if (filters.category) next.category = { equals: filters.category };
  if (filters.subcategory) next.subcategory = { equals: filters.subcategory };
  if (filters.county) next.county = { equals: filters.county };
  if (filters.city) next.city = { equals: filters.city };
  if (filters.make) next.make = { equals: filters.make };
  if (filters.model) next.model = { equals: filters.model };
  if (filters.fuel) next.fuel = { equals: filters.fuel as FuelType };
  if (filters.transmission) next.transmission = { equals: filters.transmission as Transmission };
  return next;
}

/** Server-side first page for /listings SSR (no FTS — matches default catalog browse). */
export async function getPublicBrowseListingsPage(opts: {
  page?: number;
  limit?: number;
  filters?: PublicBrowseFilters;
}): Promise<{ listings: ListingPublicDto[]; total: number; page: number }> {
  if (process.env.USE_IN_MEMORY_DB === "true") {
    return { listings: [], total: 0, page: 1 };
  }

  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 12));
  const filters = opts.filters ?? {};
  const rawQ = (filters.q ?? "").trim();

  if (rawQ.length >= 2) {
    return { listings: [], total: 0, page };
  }

  const where = applyBrowseFilters(publicBrowseListingWhere(), filters);
  const sortMode = parseListingFeedSort(filtersToSortKey(filters));
  const skip = (page - 1) * limit;

  const origin = siteOrigin();

  const [total, rows] = await Promise.all([
    prisma.listing.count({ where }),
    prisma.listing.findMany({
      where,
      skip,
      take: limit,
      orderBy: prismaOrderByForListingSort(sortMode),
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
            subscriptionTier: true,
            trustScore: true,
          },
        },
      },
    }),
  ]);

  const listings = rows.map((l) => ({
    ...l,
    photos: normalizeListingPhotosArray(l.photos, origin),
  })) as unknown as ListingPublicDto[];

  return { listings, total, page };
}

export function parsePublicBrowseFiltersFromSearchParams(
  sp: Record<string, string | string[] | undefined>
): PublicBrowseFilters {
  const pick = (k: string) => (typeof sp[k] === "string" ? sp[k] : undefined);
  return {
    q: pick("q") ?? pick("search"),
    category: pick("category"),
    subcategory: pick("subcategory"),
    county: pick("county"),
    city: pick("city"),
    make: pick("make"),
    model: pick("model"),
    fuel: pick("fuel"),
    transmission: pick("transmission"),
    sortBy: pick("sortBy") ?? "createdAt",
    sortOrder: pick("sortOrder") ?? "desc",
  };
}

export function publicBrowseFiltersSignature(
  filters: PublicBrowseFilters,
  page: number
): string {
  return JSON.stringify({ page, filters });
}

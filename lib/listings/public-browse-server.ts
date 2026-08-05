import type { FuelType, Prisma, Transmission } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeListingPhotosArray } from "@/lib/listing-photo-url";
import {
  isPriceFeedSort,
  parseListingFeedSort,
  prismaOrderByForListingSort,
} from "@/lib/listing-feed-sort";
import { seoIndexableListingWhere } from "@/lib/seo/indexable-listing-where";
import { siteOrigin } from "@/lib/site-url";
import type { ListingPublicDto } from "@clickanunt/api-contracts";
import { browseListingIdsOrdered } from "@/lib/listings/catalog-listing-ids";
import type { BrowsePriceCurrency } from "@/lib/listings/browse-filter-guards";
import { BROWSE_PRICE_CURRENCIES } from "@/lib/listings/browse-filter-guards";

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
  /** Explicit currency for priceAsc/priceDesc SSR (no backend default). */
  priceCurrency?: string;
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
    "relevance-desc": "relevance",
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

function parseBrowseCurrency(raw: string | undefined): BrowsePriceCurrency | null {
  if (!raw) return null;
  const c = raw.trim().toUpperCase();
  return (BROWSE_PRICE_CURRENCIES as readonly string[]).includes(c)
    ? (c as BrowsePriceCurrency)
    : null;
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

  const sortMode = parseListingFeedSort(filtersToSortKey(filters));
  const skip = (page - 1) * limit;
  const origin = siteOrigin();

  if (isPriceFeedSort(sortMode)) {
    const currency = parseBrowseCurrency(filters.priceCurrency);
    if (!currency) {
      // Same contract as API: price sort without currency is invalid — empty SSR seed.
      return { listings: [], total: 0, page };
    }
    const { ids, total } = await browseListingIdsOrdered(
      prisma,
      {
        activeOnly: true,
        publicCatalogOnly: true,
        category: filters.category ?? null,
        subcategory: filters.subcategory ?? null,
        county: filters.county ?? null,
        city: filters.city ?? null,
        make: filters.make ?? null,
        model: filters.model ?? null,
        fuel: filters.fuel ?? null,
        transmission: filters.transmission ?? null,
        sort: sortMode,
        sortCurrency: currency,
      },
      limit,
      skip
    );
    const rows =
      ids.length === 0
        ? []
        : await prisma.listing.findMany({
            where: { id: { in: ids } },
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
          });
    const byId = new Map(rows.map((r) => [r.id, r]));
    const ordered = ids.map((id) => byId.get(id)).filter(Boolean) as typeof rows;
    const listings = ordered.map((l) => ({
      ...l,
      photos: normalizeListingPhotosArray(l.photos, origin),
    })) as unknown as ListingPublicDto[];
    return { listings, total, page };
  }

  const where = applyBrowseFilters(publicBrowseListingWhere(), filters);

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
  const sort = pick("sort");
  const uiFromApi =
    sort === "priceAsc"
      ? { sortBy: "price", sortOrder: "asc" }
      : sort === "priceDesc"
        ? { sortBy: "price", sortOrder: "desc" }
        : sort === "featured"
          ? { sortBy: "featured", sortOrder: "desc" }
          : sort === "relevance"
            ? { sortBy: "relevance", sortOrder: "desc" }
            : sort === "newest"
              ? { sortBy: "createdAt", sortOrder: "desc" }
              : {
                  sortBy: pick("sortBy"),
                  sortOrder: pick("sortOrder"),
                };
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
    sortBy: uiFromApi.sortBy,
    sortOrder: uiFromApi.sortOrder,
    priceCurrency: pick("priceCurrency"),
  };
}

export function publicBrowseFiltersSignature(
  filters: PublicBrowseFilters,
  page?: number
): string {
  return JSON.stringify({
    page: page ?? 1,
    filters: {
      q: filters.q ?? "",
      category: filters.category ?? "",
      subcategory: filters.subcategory ?? "",
      county: filters.county ?? "",
      city: filters.city ?? "",
      make: filters.make ?? "",
      model: filters.model ?? "",
      fuel: filters.fuel ?? "",
      transmission: filters.transmission ?? "",
      sortBy: filters.sortBy ?? "",
      sortOrder: filters.sortOrder ?? "",
      priceCurrency: filters.priceCurrency ?? "",
    },
  });
}

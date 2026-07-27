export const runtime = "nodejs";
import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { memoryStorage } from "@/lib/memory-storage";
import {
  parsePaginationParams,
  buildPagination,
  decodeListingFeedCursor,
  buildListingFeedKeysetWhere,
  encodeListingFeedCursor,
} from "@/lib/pagination";
import { computeFeedBoost } from "@/lib/listing-feed-boost";
import { fullModeration, logModeration } from "@/lib/moderation";
import { updateUserTrustScore, canPerformAction, TRUST_LEVELS } from "@/lib/trustScore";
import {
  assertDailyPublishQuotaAllowed,
  countSuccessfulPublishesLast24h,
  logListingPublishQuotaDebug,
} from "@/lib/listing-publish-quota";
import { commitListingPublishRateLimit } from "@/lib/rate-limit-distributed";
import { detectScam } from "@/lib/scamDetection";
import { checkProhibitedContent, getCategoryDef, isValidSubcategory, resolveSubcategoryBySlug, getCategoryDefBySlug } from "@/lib/taxonomy";
import { logger, PerformanceTracker } from "@/lib/observability";
import { validateSecureRequest } from "@/lib/security/middleware";
import { listingCreateSchema, searchListingsSchema, parseAndValidateQuery, uuidSchema } from "@/lib/security/validation-schemas";
import { verifyToken } from "@/lib/auth";
import { getMessagingApiAuthPayload } from "@/lib/messages-request-auth";
import { sanitizeListingPayloadForViewer } from "@/lib/listings/public-listing-dto";
import {
  buildPersistedAttributes,
  isAutoCategoryLabel,
} from "@/lib/listing-attributes-sanitize";
import { formatModerationFlagsForNotes } from "@/lib/moderation-flags-format";
import { listingCreatePayloadMatchesExisting } from "@/lib/listing-create-idempotency";
import {
  resolveListingFeedStatusFromSearchParams,
} from "@/lib/listings/public-listing-status";
import { isModerationSuspensionActive } from "@/lib/user-moderation-status";
import { normalizeListingPhotosArray } from "@/lib/listing-photo-url";
import { ANALYTICS_EVENT, recordAnalyticsEvent } from "@/lib/analytics-events";
import { AdminNotificationSeverity } from "@prisma/client";
import { ADMIN_NOTIFICATION_TYPE } from "@/lib/admin-notification-types";
import { createAdminNotification } from "@/lib/admin-notifications";
import {
  feedBoostKeysetPaginationEnabled,
  isPriceFeedSort,
  parseListingFeedSort,
  prismaOrderByForListingSort,
} from "@/lib/listing-feed-sort";
import { buildRomanianTsQuery, ftsSearchListingIds } from "@/lib/listing-fts-query";
import {
  activePublicListingExpiryWhere,
  applyListingPublishExpiryIfMissing,
  listingPublishExpiryFields,
} from "@/lib/listing-expiry";
import { seoIndexableListingWhere } from "@/lib/seo/indexable-listing-where";
import {
  buildAttributesContainmentObject,
  guardBrowsePriceBand,
  guardVehicleFiltersForCategory,
  parseOptionalNonNegNumber,
  BROWSE_PRICE_CURRENCIES,
  type BrowsePriceCurrency,
} from "@/lib/listings/browse-filter-guards";
import { browseListingIdsOrdered } from "@/lib/listings/catalog-listing-ids";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const proto = (request.headers.get("x-forwarded-proto") ?? "https").split(",")[0].trim();
    const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host).split(",")[0].trim();
    const origin = `${proto}://${host}`;
    const q = url.searchParams;

    const parsedQuery = parseAndValidateQuery(q, searchListingsSchema);
    if (!parsedQuery.success) {
      return NextResponse.json({ error: parsedQuery.error }, { status: 400 });
    }
    const query = parsedQuery.data as any;

    const userIdParam = query.userId ?? q.get("userId");
    const authHeader = request.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
    const cookieToken = request.cookies.get("accessToken")?.value || null;
    const accessToken = bearerToken || cookieToken;
    const tokenPayload = accessToken ? await verifyToken(accessToken) : null;
    const tokenUserId =
      (tokenPayload as { userId?: string; sub?: string } | null)?.userId ||
      (tokenPayload as { userId?: string; sub?: string } | null)?.sub ||
      null;

    // ✅ IN-MEMORY MODE: Return listings from memory storage
    if (process.env.USE_IN_MEMORY_DB === 'true') {
      let allListings = memoryStorage.getAll();

      if (userIdParam) {
        if (!tokenPayload) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const resolvedUserId = userIdParam === 'me' ? tokenUserId : userIdParam;
        if (resolvedUserId !== tokenUserId && tokenPayload.role !== 'admin' && tokenPayload.role !== 'owner') {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        allListings = allListings.filter((listing: any) =>
          listing.ownerUserId === resolvedUserId || listing.owner?.id === resolvedUserId
        );
      }

      const listingsNormalized = allListings.map((listing: { photos?: unknown }) => ({
        ...listing,
        photos: normalizeListingPhotosArray(listing.photos, origin),
      }));
      return NextResponse.json({
        listings: listingsNormalized,
        pagination: {
          hasMore: false,
          total: listingsNormalized.length
        }
      });
    }

    const sortMode = parseListingFeedSort(query.sort, {
      hasTextQuery: Boolean((query.q ?? q.get("q") ?? "").toString().trim().length >= 2),
    });
    const { limit: limitFromQuery, cursor: cursorParam } = parsePaginationParams(q);
    const rawPage = Math.max(1, Math.min(parseInt(q.get("page") || "1", 10), 10_000));
    const limitNum = limitFromQuery || 20;

    let resolvedOwnerForFts: string | null = null;
    const where: Prisma.ListingWhereInput = {};

    // Resolve owner scope before status rules (public vs owner/admin).
    if (userIdParam) {
      if (!tokenPayload) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const resolvedUserId = userIdParam === "me" ? tokenUserId : userIdParam;
      if (
        resolvedUserId !== tokenUserId &&
        tokenPayload.role !== "admin" &&
        tokenPayload.role !== "owner"
      ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      where.ownerUserId = resolvedUserId;
      resolvedOwnerForFts = resolvedUserId;
    }

    // Multi-value status= (any order / array pollution) → 400; never first/last-wins.
    const statusResolved = resolveListingFeedStatusFromSearchParams(
      q,
      Boolean(resolvedOwnerForFts),
    );
    if (!statusResolved.ok) {
      return NextResponse.json({ error: statusResolved.error }, { status: 400 });
    }
    const statusParam = statusResolved.statusParam;

    if (statusParam !== "all") {
      where.status = statusParam;
    }

    if (statusResolved.applyPublicIndexable) {
      const indexable = seoIndexableListingWhere();
      where.status = indexable.status;
      where.deletedAt = indexable.deletedAt;
      where.moderationStatus = indexable.moderationStatus;
      const indexableAnd = indexable.AND
        ? Array.isArray(indexable.AND)
          ? indexable.AND
          : [indexable.AND]
        : [];
      where.AND = Array.isArray(where.AND)
        ? [...where.AND, ...indexableAnd]
        : where.AND
          ? [where.AND, ...indexableAnd]
          : indexableAnd;
    }

    if (query.category) where.category = { equals: query.category };
    if (query.subcategory) where.subcategory = { equals: query.subcategory };

    if (query.county) where.county = { equals: query.county };
    if (query.city) where.city = { equals: query.city };

    const year = query.year ?? q.get("year");
    const yearMin = query.yearMin ?? q.get("yearMin");
    const yearMax = query.yearMax ?? q.get("yearMax");
    const yNum = year != null && year !== "" ? Number(year) : NaN;
    const yMinNum = yearMin != null && yearMin !== "" ? Number(yearMin) : NaN;
    const yMaxNum = yearMax != null && yearMax !== "" ? Number(yearMax) : NaN;

    const vehicleGuard = guardVehicleFiltersForCategory({
      category: query.category ?? null,
      make: query.make ?? null,
      model: query.model ?? null,
      fuel: query.fuel ?? null,
      transmission: query.transmission ?? null,
      year: !Number.isNaN(yNum) ? yNum : null,
      yearMin: !Number.isNaN(yMinNum) ? yMinNum : null,
      yearMax: !Number.isNaN(yMaxNum) ? yMaxNum : null,
    });
    if (!vehicleGuard.ok) {
      return NextResponse.json({ error: vehicleGuard.error }, { status: 400 });
    }
    if (vehicleGuard.apply) {
      if (query.make) where.make = { equals: query.make };
      if (query.model) where.model = { equals: query.model };
      if (query.fuel) where.fuel = { equals: query.fuel };
      if (query.transmission) where.transmission = { equals: query.transmission };
      if (year || yearMin || yearMax) {
        where.year = {};
        if (!Number.isNaN(yNum)) where.year.equals = yNum;
        if (!Number.isNaN(yMinNum)) where.year.gte = yMinNum;
        if (!Number.isNaN(yMaxNum)) where.year.lte = yMaxNum;
      }
    }

    const minPriceRaw = query.minPrice ?? query.priceMin ?? q.get("minPrice") ?? q.get("priceMin");
    const maxPriceRaw = query.maxPrice ?? query.priceMax ?? q.get("maxPrice") ?? q.get("priceMax");
    const priceCurrencyRaw =
      query.priceCurrency ?? q.get("priceCurrency") ?? q.get("currency") ?? null;
    const priceBand = guardBrowsePriceBand({
      minPrice: parseOptionalNonNegNumber(minPriceRaw),
      maxPrice: parseOptionalNonNegNumber(maxPriceRaw),
      priceCurrency: typeof priceCurrencyRaw === "string" ? priceCurrencyRaw : null,
    });
    if (!priceBand.ok) {
      return NextResponse.json({ error: priceBand.error }, { status: 400 });
    }

    // Price sorts require an explicit currency (no cross-currency amount compare).
    let sortCurrency: BrowsePriceCurrency | null = priceBand.priceCurrency;
    if (isPriceFeedSort(sortMode)) {
      const rawSortCurrency =
        typeof priceCurrencyRaw === "string" ? priceCurrencyRaw.trim().toUpperCase() : "";
      if (!rawSortCurrency) {
        return NextResponse.json(
          {
            error:
              "priceCurrency este obligatoriu pentru sortarea după preț (RON, EUR sau USD).",
          },
          { status: 400 }
        );
      }
      if (!(BROWSE_PRICE_CURRENCIES as readonly string[]).includes(rawSortCurrency)) {
        return NextResponse.json(
          { error: "priceCurrency invalid. Folosește RON, EUR sau USD." },
          { status: 400 }
        );
      }
      sortCurrency = rawSortCurrency as BrowsePriceCurrency;
    }

    if (priceBand.minPrice != null || priceBand.maxPrice != null) {
      where.priceAmount = {};
      if (priceBand.minPrice != null) where.priceAmount.gte = priceBand.minPrice;
      if (priceBand.maxPrice != null) where.priceAmount.lte = priceBand.maxPrice;
      // Numeric price bands only apply to types with a real amount + matching currency.
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          OR: [
            { priceType: null },
            { priceType: { in: ["FIXED", "NEGOTIABLE", "FROM"] } },
          ],
        },
        { priceAmount: { not: null } },
        { priceCurrency: priceBand.priceCurrency },
      ];
    }

    if (query.condition) where.condition = { equals: query.condition };

    // Attribute-based JSON filtering (attr_brand=Samsung, attr_rooms=3, etc.)
    const attrFilters: { path: string[]; equals: string | number }[] = [];
    for (const [key, val] of q.entries()) {
      if (key.startsWith('attr_') && val) {
        const attrKey = key.slice(5);
        const numVal = Number(val);
        attrFilters.push({ path: [attrKey], equals: Number.isFinite(numVal) && String(numVal) === val ? numVal : val });
      }
    }
    if (attrFilters.length > 0) {
      const attrConditions = attrFilters.map((f) => ({
        attributes: { path: f.path, equals: f.equals },
      }));
      where.AND = Array.isArray(where.AND)
        ? [...where.AND, ...attrConditions]
        : where.AND
          ? [where.AND, ...attrConditions]
          : attrConditions;
    }

    const attributesContainment = buildAttributesContainmentObject(
      attrFilters.map((f) => ({ key: f.path[0], value: f.equals }))
    );
    const attributesContainmentJson = attributesContainment
      ? JSON.stringify(attributesContainment)
      : null;

    const rawQ = (query.q ?? q.get("q") ?? "").trim();
    const useFts = rawQ.length >= 2;

    if (useFts) {
      const tsq = buildRomanianTsQuery(rawQ);
      if (!tsq) {
        return NextResponse.json({
          data: [],
          pagination: {
            hasMore: false,
            nextCursor: null,
            prevCursor: null,
            count: 0,
            page: rawPage,
            usedOffset: true,
            total: 0,
            limit: limitNum,
            pages: 0,
          },
        });
      }

      const offset = (rawPage - 1) * limitNum;

      const { ids, total } = await ftsSearchListingIds(
        prisma,
        tsq,
        {
          activeOnly: statusParam !== "all",
          publicCatalogOnly: !resolvedOwnerForFts && statusParam !== "all",
          category: query.category ?? null,
          subcategory: query.subcategory ?? null,
          county: query.county ?? null,
          city: query.city ?? null,
          year: vehicleGuard.apply && !Number.isNaN(yNum) ? yNum : null,
          yearMin: vehicleGuard.apply && !Number.isNaN(yMinNum) ? yMinNum : null,
          yearMax: vehicleGuard.apply && !Number.isNaN(yMaxNum) ? yMaxNum : null,
          minPrice: priceBand.minPrice,
          maxPrice: priceBand.maxPrice,
          priceCurrency: priceBand.priceCurrency,
          sortCurrency: isPriceFeedSort(sortMode) ? sortCurrency : null,
          sort: sortMode,
          make: vehicleGuard.apply ? (query.make ?? null) : null,
          model: vehicleGuard.apply ? (query.model ?? null) : null,
          fuel: vehicleGuard.apply ? (query.fuel ?? null) : null,
          transmission: vehicleGuard.apply ? (query.transmission ?? null) : null,
          condition: query.condition ?? null,
          attributesContainmentJson,
          ownerUserId: resolvedOwnerForFts,
        },
        limitNum + 1,
        offset
      );

      const hasMore = ids.length > limitNum;
      const pageIds = hasMore ? ids.slice(0, limitNum) : ids;

      const rows =
        pageIds.length === 0
          ? []
          : await prisma.listing.findMany({
              where: { id: { in: pageIds } },
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
      const ordered = pageIds.map((id) => byId.get(id)).filter(Boolean) as typeof rows;

      const listingsWithPhotos = ordered.map((l) => {
        const row = {
          ...l,
          photos: normalizeListingPhotosArray(l.photos, origin),
        };
        const isOwnerOrAdmin =
          (!!tokenUserId && l.ownerUserId === tokenUserId) ||
          tokenPayload?.role === "admin" ||
          tokenPayload?.role === "owner";
        return sanitizeListingPayloadForViewer(row as Record<string, unknown>, {
          isOwnerOrAdmin: Boolean(userIdParam) && isOwnerOrAdmin,
        }) as typeof row;
      });

      const pages = total > 0 ? Math.ceil(total / limitNum) : 0;

      return NextResponse.json({
        data: listingsWithPhotos,
        pagination: {
          hasMore,
          nextCursor: null,
          prevCursor: null,
          count: listingsWithPhotos.length,
          page: rawPage,
          usedOffset: true,
          total,
          limit: limitNum,
          pages,
        },
      });
    }

    const useKeyset = feedBoostKeysetPaginationEnabled(sortMode);
    const cursorPayload = useKeyset ? decodeListingFeedCursor(cursorParam) : null;
    if (cursorParam && useKeyset && !cursorPayload) {
      return NextResponse.json({ error: "Cursor invalid sau expirat" }, { status: 400 });
    }

    // Currency-aware price sorts cannot be expressed safely via Prisma orderBy alone
    // (would mix RON/EUR by raw amount). Use the same CASE ORDER BY as FTS.
    if (isPriceFeedSort(sortMode)) {
      if (!sortCurrency) {
        return NextResponse.json(
          {
            error:
              "priceCurrency este obligatoriu pentru sortarea după preț (RON, EUR sau USD).",
          },
          { status: 400 }
        );
      }

      const offset = (rawPage - 1) * limitNum;
      const { ids, total } = await browseListingIdsOrdered(
        prisma,
        {
          activeOnly: statusParam !== "all",
          publicCatalogOnly: !resolvedOwnerForFts && statusParam !== "all",
          category: query.category ?? null,
          subcategory: query.subcategory ?? null,
          county: query.county ?? null,
          city: query.city ?? null,
          year: vehicleGuard.apply && !Number.isNaN(yNum) ? yNum : null,
          yearMin: vehicleGuard.apply && !Number.isNaN(yMinNum) ? yMinNum : null,
          yearMax: vehicleGuard.apply && !Number.isNaN(yMaxNum) ? yMaxNum : null,
          minPrice: priceBand.minPrice,
          maxPrice: priceBand.maxPrice,
          priceCurrency: priceBand.priceCurrency,
          sortCurrency,
          sort: sortMode,
          make: vehicleGuard.apply ? (query.make ?? null) : null,
          model: vehicleGuard.apply ? (query.model ?? null) : null,
          fuel: vehicleGuard.apply ? (query.fuel ?? null) : null,
          transmission: vehicleGuard.apply ? (query.transmission ?? null) : null,
          condition: query.condition ?? null,
          attributesContainmentJson,
          ownerUserId: resolvedOwnerForFts,
        },
        limitNum + 1,
        offset
      );

      const hasMore = ids.length > limitNum;
      const pageIds = hasMore ? ids.slice(0, limitNum) : ids;
      const rows =
        pageIds.length === 0
          ? []
          : await prisma.listing.findMany({
              where: { id: { in: pageIds } },
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
      const ordered = pageIds.map((id) => byId.get(id)).filter(Boolean) as typeof rows;
      const listingsWithPhotos = ordered.map((l) => {
        const row = {
          ...l,
          photos: normalizeListingPhotosArray(l.photos, origin),
        };
        const isOwnerOrAdmin =
          (!!tokenUserId && l.ownerUserId === tokenUserId) ||
          tokenPayload?.role === "admin" ||
          tokenPayload?.role === "owner";
        return sanitizeListingPayloadForViewer(row as Record<string, unknown>, {
          isOwnerOrAdmin: Boolean(userIdParam) && isOwnerOrAdmin,
        }) as typeof row;
      });
      const pages = total > 0 ? Math.ceil(total / limitNum) : 0;
      return NextResponse.json({
        data: listingsWithPhotos,
        pagination: {
          hasMore,
          nextCursor: null,
          prevCursor: null,
          count: listingsWithPhotos.length,
          page: rawPage,
          usedOffset: true,
          total,
          limit: limitNum,
          pages,
          totalPages: pages,
        },
      });
    }

    const finalWhere = buildListingFeedKeysetWhere(cursorPayload, where);

    const useOffsetPaging = !cursorPayload && rawPage > 1;
    const skip = useOffsetPaging ? (rawPage - 1) * limitNum : undefined;

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where: finalWhere,
        skip,
        take: limitNum + 1,
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
        orderBy: prismaOrderByForListingSort(sortMode),
      }),
      prisma.listing.count({ where }),
    ]);

    const listingsRaw = listings.map((l) => ({
      ...l,
      photos: normalizeListingPhotosArray(l.photos, origin),
    }));

    const listingsWithPhotos = listingsRaw.map((row) => {
      const isOwnerOrAdmin =
        (!!tokenUserId && row.ownerUserId === tokenUserId) ||
        tokenPayload?.role === "admin" ||
        tokenPayload?.role === "owner";
      return sanitizeListingPayloadForViewer(row as Record<string, unknown>, {
        isOwnerOrAdmin: Boolean(userIdParam) && isOwnerOrAdmin,
      }) as typeof row;
    });

    const encodeCursorCompat = useKeyset
      ? (last: (typeof listingsWithPhotos)[0]) => {
          const raw = listingsRaw.find((r) => r.id === last.id) ?? listingsRaw[listingsRaw.length - 1];
          if (!raw) return null;
          return encodeListingFeedCursor({
            feedBoost: raw.feedBoost,
            createdAt: raw.createdAt,
            id: raw.id,
          });
        }
      : () => null;

    const result = buildPagination(listingsWithPhotos, limitNum, encodeCursorCompat);
    const totalPages = total > 0 ? Math.ceil(total / limitNum) : 0;

    return NextResponse.json({
      ...result,
      pagination: {
        ...result.pagination,
        page: rawPage,
        usedOffset: useOffsetPaging,
        total,
        totalPages,
        pages: totalPages,
        limit: limitNum,
      },
    });
  } catch (error: unknown) {
    console.error("Listings fetch error:", error instanceof Error ? error.name : "unknown");
    return NextResponse.json(
      { error: "Failed to fetch listings" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const tracker = new PerformanceTracker('create_listing');
  
  try {
    const security = await validateSecureRequest(request as NextRequest, {
      requireCSRF: true,
      rateLimit: 'listing_publish',
      schema: listingCreateSchema,
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

    const body = security.data as any;
    
    // ✅ Auth: cookie httpOnly înainte de Bearer (SPA poate trimite JWT expirat din localStorage)
    const tokenPayload = await getMessagingApiAuthPayload(request as NextRequest);
    const userId = tokenPayload?.userId ?? null;

    if (!userId) {
      return NextResponse.json(
        { error: 'Autentificare necesară pentru a publica anunțuri' },
        { status: 401 }
      );
    }

    const uuidValidation = uuidSchema.safeParse(userId);
    if (!uuidValidation.success) {
      logger.warn('Invalid userId format in JWT', { userId, error: uuidValidation.error });
      return NextResponse.json(
        { error: 'User ID format is invalid. Please log in again.' },
        { status: 401 }
      );
    }

    logger.setContext({ userId, action: 'create_listing' });
    logger.info('Creating listing', { title: body.title });

    // ✅ CLEAN NULL VALUES (from optional fields that came as null from client)
    const cleanBody = Object.entries(body).reduce((acc, [key, value]) => {
      if (value !== null && value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as any);

    // ✅ IN-MEMORY MODE: Skip DB operations for development
    if (process.env.USE_IN_MEMORY_DB === 'true') {
      const mockListing = {
        id: 'listing-' + Date.now(),
        ...body,
        status: 'active',
        moderationStatus: 'approved',
        createdAt: new Date(),
        updatedAt: new Date(),
        owner: {
          id: userId || 'owner-1',
          email: 'owner@autoplatform.ro',
          name: 'Owner Account',
          role: 'OWNER'
        }
      };
      
      logger.info('✅ Listing created (in-memory mode)', { id: mockListing.id });
      
      // Save to memory storage
      memoryStorage.set(mockListing.id, mockListing);
      
      return NextResponse.json({ 
        success: true, 
        listing: mockListing,
        message: 'Anunț publicat cu succes!' 
      }, { status: 201 });
    }

    // ✅ FETCH USER AND CHECK TRUST SCORE
    const user = await db.findUserById(userId);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const trustScore = user.trustScore || 50;

    if (user.isBanned) {
      return NextResponse.json(
        {
          error: 'Cont blocat',
          message: 'Nu poți publica anunțuri — contul este blocat.',
        },
        { status: 403 }
      );
    }

    if (isModerationSuspensionActive(user.moderationSuspendedUntil)) {
      return NextResponse.json(
        {
          error: 'Cont suspendat temporar',
          message:
            'Nu poți publica anunțuri până la expirarea suspendării impuse de moderare. Contactează suportul dacă ai întrebări.',
          suspendedUntil: user.moderationSuspendedUntil,
        },
        { status: 403 }
      );
    }

    // Check if user can publish listings
    if (!canPerformAction(trustScore, 'publish')) {
      logger.warn('User cannot publish', { userId, trustScore });
      return NextResponse.json(
        { 
          error: 'Scor de încredere insuficient',
          message: 'Contul tău are restricții. Te rugăm să contactezi suportul.'
        },
        { status: 403 }
      );
    }

    // ✅ PROHIBITED CONTENT CHECK — hard block before anything else
    const prohibitedCheck = checkProhibitedContent(body.title, body.description || '', body.category);
    if (prohibitedCheck.blocked) {
      logger.warn('Listing blocked - prohibited content', {
        userId,
        reasons: prohibitedCheck.flags.map((f) => f.reason),
      });
      return NextResponse.json(
        {
          error: 'Conținut interzis',
          reason: 'Anunțul conține conținut care nu poate fi publicat pe platformă',
          flags: prohibitedCheck.flags
            .filter((f) => f.severity === 'block')
            .map((f) => f.reason),
        },
        { status: 400 }
      );
    }

    // ✅ SCAM DETECTION - Run BEFORE moderation
    logger.info('Running scam detection');
    const scamResult = detectScam({
      title: body.title,
      description: body.description,
      priceAmount: body.priceAmount,
      category: body.category,
      photos: body.photos || []
    });

    // Auto-reject critical scams
    if (scamResult.isScam && scamResult.confidence >= 0.8) {
      logger.warn('Listing auto-rejected - scam detected', { 
        userId, 
        confidence: scamResult.confidence, 
        flags: scamResult.flags 
      });

      return NextResponse.json(
        {
          error: 'Anunț respins automat',
          reason: 'Conținutul a fost identificat ca potențial fraudulos',
          flags: scamResult.flags.map(f => f.description),
          suggestions: [
            'Verifică dacă prețul este realist',
            'Evită cuvinte suspicioase (Western Union, gift card, urgent)',
            'Nu include date de contact în descriere'
          ]
        },
        { status: 400 }
      );
    }
    
    // Auto-moderation enabled by default
    const autoModerationEnabled = true;
    const strictModerationEnabled = false;

    // ✅ MODERARE AUTOMATĂ cu OpenAI
    logger.info('Running moderation', { autoModerationEnabled, strictModerationEnabled });
    
    const moderationResult = await fullModeration(
      body.title,
      body.description,
      body.photos // Array de URL-uri imagini
    );

    // Calculează moderation score și status
    let moderationStatus: 'pending' | 'approved' | 'rejected' = 'approved';
    let moderationScore = 1.0;
    const flags: any[] = [];

    // Add scam detection flags
    if (scamResult.isScam) {
      flags.push({ 
        type: 'scam_detection', 
        confidence: scamResult.confidence,
        score: scamResult.score,
        flags: scamResult.flags 
      });
      moderationScore -= scamResult.confidence * 0.5;
    }

    // Add prohibited content flags (non-blocking ones go to moderation)
    if (prohibitedCheck.flags.length > 0) {
      const flagReasons = prohibitedCheck.flags.filter((f) => f.severity === 'flag');
      if (flagReasons.length > 0) {
        flags.push({
          type: 'prohibited_content',
          reasons: flagReasons.map((f) => f.reason),
        });
        moderationScore -= 0.3;
      }
    }

    if (moderationResult.textModeration.flagged) {
      flags.push({ type: 'text', categories: moderationResult.textModeration.categories });
      moderationScore -= 0.5;
    }
    if (moderationResult.spamCheck.isSpam) {
      flags.push({ type: 'spam', keywords: moderationResult.spamCheck.keywords });
      moderationScore -= 0.3;
    }
    if (moderationResult.personalInfoCheck.hasPersonalInfo) {
      flags.push({ type: 'personal_info', types: moderationResult.personalInfoCheck.types });
      moderationScore -= 0.2;
    }
    if (moderationResult.imageModeration?.some(im => im.flagged)) {
      flags.push({ type: 'image', details: moderationResult.imageModeration });
      moderationScore -= 0.4;
    }

    moderationScore = Math.max(0, moderationScore);

    // Trust score influence - auto-approve for verified users
    if (trustScore >= TRUST_LEVELS.VERIFIED && moderationScore >= 0.7 && !scamResult.isScam) {
      moderationStatus = 'approved';
      logger.info('Auto-approved due to high trust score');
    } else if (trustScore < TRUST_LEVELS.NEUTRAL || moderationScore < 0.6 || strictModerationEnabled || scamResult.isScam) {
      moderationStatus = 'pending';
      logger.info('Manual review required', { 
        reason: trustScore < TRUST_LEVELS.NEUTRAL ? 'low_trust' : scamResult.isScam ? 'scam_detected' : 'low_mod_score' 
      });
    }

    // Category-aware moderation: force manual review for sensitive categories/subcategories
    if (moderationStatus === 'approved') {
      const catDef = getCategoryDef(body.category);
      if (catDef?.requiresModeration) {
        moderationStatus = 'pending';
        flags.push({ type: 'category_moderation', reason: `Categoria "${body.category}" necesită verificare manuală` });
        logger.info('Forced to pending: category requires moderation', { category: body.category });
      } else if (body.subcategory && catDef) {
        const subDef = catDef.subcategories.find((s) => s.label === body.subcategory);
        if (subDef?.requiresModeration) {
          moderationStatus = 'pending';
          flags.push({ type: 'subcategory_moderation', reason: `Subcategoria "${body.subcategory}" necesită verificare manuală` });
          logger.info('Forced to pending: subcategory requires moderation', { subcategory: body.subcategory });
        }
      }
    }

    // Dacă anunțul este respins complet (score 0), returnează eroare
    if (!moderationResult.approved || moderationScore === 0) {
      logger.warn('Listing rejected by moderation', { reason: moderationResult.reason });
      
      // Log pentru audit
      await logModeration(
        userId,
        null,
        moderationResult,
        'rejected'
      );

      return NextResponse.json(
        {
          error: 'Anunț respins de sistemul de moderare',
          reason: moderationResult.reason,
          details: {
            textFlagged: moderationResult.textModeration.flagged,
            spamDetected: moderationResult.spamCheck.isSpam,
            personalInfoDetected: moderationResult.personalInfoCheck.hasPersonalInfo,
            imageFlagged: moderationResult.imageModeration?.some(im => im.flagged) || false,
          }
        },
        { status: 400 }
      );
    }

    console.log(`✅ Anunț moderat: status=${moderationStatus}, score=${moderationScore}`);

    const uploadSessionIdEarly = cleanBody.uploadSessionId as string | undefined;
    if (uploadSessionIdEarly) {
      const sessionParseEarly = uuidSchema.safeParse(uploadSessionIdEarly);
      if (sessionParseEarly.success) {
        const existingBySession = await prisma.listing.findUnique({
          where: { id: sessionParseEarly.data },
          select: {
            id: true,
            ownerUserId: true,
            status: true,
            title: true,
            category: true,
            priceAmount: true,
            priceCurrency: true,
            county: true,
            city: true,
            photos: true,
            make: true,
            model: true,
          },
        });
        if (existingBySession) {
          if (existingBySession.ownerUserId !== userId) {
            return NextResponse.json(
              {
                error: "Conflict",
                message:
                  "uploadSessionId este deja folosit de un alt anunț. Reîncepe încărcarea fotografiilor.",
              },
              { status: 409 }
            );
          }
          if (
            !listingCreatePayloadMatchesExisting(existingBySession, {
              title: cleanBody.title as string,
              category: cleanBody.category as string,
              priceAmount: cleanBody.priceAmount as number,
              priceCurrency: cleanBody.priceCurrency as string | undefined,
              county: cleanBody.county as string | undefined,
              city: cleanBody.city as string | undefined,
              photos: cleanBody.photos,
              make: cleanBody.make as string | undefined,
              model: cleanBody.model as string | undefined,
            })
          ) {
            return NextResponse.json(
              {
                error: "Conflict",
                message:
                  "Aceeași sesiune de upload a fost folosită cu date diferite. Reîncepe formularul sau șterge draftul.",
              },
              { status: 409 }
            );
          }
          const replayCount = await countSuccessfulPublishesLast24h(userId);
          logListingPublishQuotaDebug({
            userId,
            limiterKey: `listing:publish:${userId}`,
            currentCount: replayCount,
            limit: 0,
            route: '/api/listings',
            source: 'idempotent_replay',
          });
          logger.info('Idempotent publish replay', { listingId: existingBySession.id, userId });
          const existingFull = await prisma.listing.findUnique({
            where: { id: existingBySession.id },
          });
          return NextResponse.json(existingFull ?? existingBySession, { status: 200 });
        }
      }
    }

    const quota = await assertDailyPublishQuotaAllowed(
      userId,
      user.role,
      '/api/listings',
      'pre_create'
    );
    if (!quota.allowed) {
      logger.warn('Daily publish quota exceeded', {
        userId,
        count: quota.count,
        limit: quota.limit,
        role: user.role,
      });
      return NextResponse.json(
        {
          error: 'Limită zilnică atinsă',
          message: `Poți publica maxim ${quota.limit} anunțuri în 24 de ore. Încearcă din nou mai târziu.`,
          publishedLast24h: quota.count,
          limit: quota.limit,
        },
        { status: 429 }
      );
    }

    const persistedAttrs = buildPersistedAttributes({
        categoryLabel: String(cleanBody.category),
        subcategoryLabel: (cleanBody.subcategory as string | null | undefined) ?? null,
        attributes: cleanBody.attributes,
        autoBagFields: {
          accidents: cleanBody.accidents || null,
          rare: cleanBody.rare || false,
          horsepower: cleanBody.horsepower || null,
          cylinderCapacity: cleanBody.cylinderCapacity || null,
          bodyType: cleanBody.bodyType || null,
          color: cleanBody.color || null,
          seatCount: cleanBody.seatCount || null,
          doorCount: cleanBody.doorCount || null,
          owners: cleanBody.owners || null,
          keys: cleanBody.keys || null,
          registrationDate: cleanBody.registrationDate || null,
          inspectionExpires: cleanBody.inspectionExpires || null,
          countryOfOrigin: cleanBody.countryOfOrigin || null,
          environmentalClass: cleanBody.environmentalClass || null,
          co2Emissions: cleanBody.co2Emissions || null,
          upholstery: cleanBody.upholstery || null,
          cocPapers: cleanBody.cocPapers || false,
        },
      }).attributes;

    // New structured salary replaces legacy attributes.salary_range text.
    if (
      cleanBody.salaryMin != null ||
      cleanBody.salaryMax != null
    ) {
      if (
        persistedAttrs &&
        typeof persistedAttrs === "object" &&
        !Array.isArray(persistedAttrs) &&
        "salary_range" in persistedAttrs
      ) {
        delete (persistedAttrs as Record<string, unknown>).salary_range;
      }
    }

    const data: any = {
      owner: {
        connect: { id: userId }
      },
      title: cleanBody.title,
      category: cleanBody.category,
      subcategory: cleanBody.subcategory,
      priceType: cleanBody.priceType ?? null,
      priceAmount: cleanBody.priceAmount ?? null,
      priceCurrency: cleanBody.priceCurrency ?? (cleanBody.priceType ? "RON" : null),
      salaryMin: cleanBody.salaryMin ?? null,
      salaryMax: cleanBody.salaryMax ?? null,
      salaryCurrency: cleanBody.salaryCurrency ?? null,
      salaryPeriod: cleanBody.salaryPeriod ?? null,
      condition: cleanBody.condition ?? "used",
      status: moderationStatus === "approved" ? "active" : "pending",
      description: cleanBody.description,
      county: cleanBody.county,
      city: cleanBody.city,
      region: cleanBody.region,
      photos: cleanBody.photos ?? [],
      contactPhone: cleanBody.contactPhone ?? cleanBody.phone,
      // Client cannot grant featured via create payload (field not in schema; force false).
      isFeatured: false,
      feedBoost: computeFeedBoost(false, false),
      
      // Auto-specific fields — only persist for Auto category
      make: isAutoCategoryLabel(String(cleanBody.category)) ? cleanBody.make : null,
      model: isAutoCategoryLabel(String(cleanBody.category)) ? cleanBody.model : null,
      year: isAutoCategoryLabel(String(cleanBody.category)) ? cleanBody.year : null,
      mileage: isAutoCategoryLabel(String(cleanBody.category)) ? cleanBody.mileage : null,
      fuel: isAutoCategoryLabel(String(cleanBody.category)) ? cleanBody.fuel : null,
      transmission: isAutoCategoryLabel(String(cleanBody.category)) ? cleanBody.transmission : null,
      vin: isAutoCategoryLabel(String(cleanBody.category)) ? cleanBody.vin : null,

      attributes: persistedAttrs,

      // Moderation fields
      moderationStatus,
      moderationNotes: formatModerationFlagsForNotes(flags),
      
      // Scam detection results (store for admin review)
      // Prisma schema expects `scamFlags` as `String[]`, not full objects.
      scamScore: scamResult.score,
      scamFlags: scamResult.flags?.length ? scamResult.flags.map((f) => f.description) : [],
    };

    if (data.status === "active") {
      Object.assign(data, listingPublishExpiryFields());
    }

    let presetListingId: string | undefined;
    const uploadSessionId = cleanBody.uploadSessionId as string | undefined;
    if (uploadSessionId) {
      const sessionParse = uuidSchema.safeParse(uploadSessionId);
      if (sessionParse.success) {
        const taken = await prisma.listing.findUnique({
          where: { id: sessionParse.data },
          select: { id: true },
        });
        if (!taken) {
          presetListingId = sessionParse.data;
        }
      }
    }

    const listing = await prisma.listing.create({
      data: presetListingId ? { id: presetListingId, ...data } : data,
    });

    await commitListingPublishRateLimit(userId, user.role);

    logListingPublishQuotaDebug({
      userId,
      limiterKey: `listing:publish:${userId}`,
      currentCount: quota.count + 1,
      limit: quota.limit,
      route: '/api/listings',
      source: 'post_create_success',
    });

    void recordAnalyticsEvent({
      eventType: ANALYTICS_EVENT.listing_created,
      userId,
      listingId: listing.id,
      metadata: { moderationStatus, category: listing.category },
      request: request as NextRequest,
    });

    // Dacă e pending, creează ModerationQueue entry
    if (moderationStatus === 'pending') {
      await prisma.moderationQueue.create({
        data: {
          listingId: listing.id,
          priority: moderationScore < 0.3 ? 1 : 0, // Higher priority for very low scores
          status: 'pending',
          notes: formatModerationFlagsForNotes(flags) ?? undefined,
        },
      });
      logger.info('Added to moderation queue', { listingId: listing.id, priority: moderationScore < 0.3 ? 1 : 0 });
    }

    // Log moderare success
    await logModeration(
      userId,
      listing.id,
      moderationResult,
      moderationStatus === 'approved' || moderationStatus === 'pending' ? 'approved' : 'rejected'
    );

    // Update trust score based on result
    if (moderationStatus === 'approved' && !scamResult.isScam) {
      await updateUserTrustScore(userId, 'listing_created_successfully');
      logger.info('Trust score updated', { userId });
    } else if (scamResult.isScam) {
      // Don't update trust score positively for flagged listings
      logger.warn('Trust score not updated - scam detected', { userId });
    }

    tracker.end();
    logger.info('Listing created successfully', { listingId: listing.id, moderationStatus });

    void createAdminNotification({
      type:
        moderationStatus === "pending"
          ? ADMIN_NOTIFICATION_TYPE.LISTING_PENDING_MODERATION
          : ADMIN_NOTIFICATION_TYPE.LISTING_CREATED,
      severity:
        moderationStatus === "pending"
          ? AdminNotificationSeverity.warning
          : AdminNotificationSeverity.info,
      title:
        moderationStatus === "pending"
          ? "Anunț în așteptare la moderare"
          : "Anunț nou publicat",
      message:
        moderationStatus === "pending"
          ? `„${listing.title}” (${listing.category}) — trimis spre aprobare.`
          : `„${listing.title}” (${listing.category}) — creat cu status ${moderationStatus}.`,
      entityType: "listing",
      entityId: listing.id,
      metadata: { ownerUserId: userId, moderationStatus },
    });

    return NextResponse.json(listing, { status: 201 });
  } catch (err: any) {
    logger.error('Error creating listing', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    logger.clearContext();
  }
}

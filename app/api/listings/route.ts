export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { memoryStorage } from "@/lib/memory-storage";
import {
  parsePaginationParams,
  buildCursorWhere,
  buildPagination,
} from "@/lib/pagination";
import { fullModeration, logModeration } from "@/lib/moderation";
import { updateUserTrustScore, getRateLimit, canPerformAction, TRUST_LEVELS } from "@/lib/trustScore";
import { detectScam } from "@/lib/scamDetection";
import { logger, PerformanceTracker } from "@/lib/observability";
import { validateSecureRequest } from "@/lib/security/middleware";
import { listingCreateSchema, searchListingsSchema, parseAndValidateQuery, uuidSchema } from "@/lib/security/validation-schemas";
import { verifyToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
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

    // ✅ IN-MEMORY MODE: Return listings from memory storage
    if (process.env.USE_IN_MEMORY_DB === 'true') {
      let allListings = memoryStorage.getAll();

      if (userIdParam) {
        if (!tokenPayload) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const resolvedUserId = userIdParam === 'me' ? tokenPayload.userId : userIdParam;
        if (resolvedUserId !== tokenPayload.userId && tokenPayload.role !== 'admin' && tokenPayload.role !== 'owner') {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        allListings = allListings.filter((listing: any) =>
          listing.ownerUserId === resolvedUserId || listing.owner?.id === resolvedUserId
        );
      }

      return NextResponse.json({
        listings: allListings,
        pagination: {
          hasMore: false,
          total: allListings.length
        }
      });
    }

    // Parse pagination parameters (cursor-based for millions of listings)
    const { limit, cursor, direction } = parsePaginationParams(q);

    const where: any = {};

    // Status filter (only active by default, skip filter if "all")
    const statusParam = query.status || q.get("status") || "active";
    if (statusParam !== "all") {
      where.status = statusParam;
    }

    // User filter (dashboard listings)
    if (userIdParam) {
      if (!tokenPayload) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const resolvedUserId = userIdParam === 'me' ? tokenPayload.userId : userIdParam;
      if (resolvedUserId !== tokenPayload.userId && tokenPayload.role !== 'admin' && tokenPayload.role !== 'owner') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      where.ownerUserId = resolvedUserId;
    }

    // Category filters
    if (query.category) where.category = { equals: query.category };
    if (query.subcategory) where.subcategory = { equals: query.subcategory };
    
    // Location filters
    if (query.county) where.county = { equals: query.county };
    if (query.city) where.city = { equals: query.city };
    
    // Auto-specific filters
    if (query.make) where.make = { equals: query.make };
    if (query.model) where.model = { equals: query.model };
    if (query.fuel) where.fuel = { equals: query.fuel };
    if (query.transmission) where.transmission = { equals: query.transmission };

    // Price filters
    const minPrice = query.minPrice ?? query.priceMin ?? q.get("minPrice") ?? q.get("priceMin");
    const maxPrice = query.maxPrice ?? query.priceMax ?? q.get("maxPrice") ?? q.get("priceMax");
    if (minPrice || maxPrice) {
      where.priceAmount = {};
      if (minPrice) where.priceAmount.gte = Number(minPrice);
      if (maxPrice) where.priceAmount.lte = Number(maxPrice);
    }

    // Year filter
    const year = query.year ?? q.get("year");
    const yearMin = query.yearMin ?? q.get("yearMin");
    const yearMax = query.yearMax ?? q.get("yearMax");
    if (year || yearMin || yearMax) {
      where.year = {};
      if (year) where.year.equals = Number(year);
      if (yearMin) where.year.gte = Number(yearMin);
      if (yearMax) where.year.lte = Number(yearMax);
    }
    
    // Condition filter
    if (query.condition) where.condition = { equals: query.condition };

    // Search query
    const search = query.q || q.get("q");
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Apply cursor-based pagination
    const finalWhere = buildCursorWhere(cursor, direction, where);

    // Fetch limit + 1 to check if there are more results
    const listings = await prisma.listing.findMany({
      where: finalWhere,
      take: (limit || 20) + 1,
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
      orderBy: [
        { isFeatured: "desc" },
        { isPromoted: "desc" },  // Promoted listings first
        { createdAt: "desc" },
      ],
    });

    // Build pagination response
    const result = buildPagination(listings, limit || 20);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Listings fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch listings", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const tracker = new PerformanceTracker('create_listing');
  
  try {
    const security = await validateSecureRequest(request as NextRequest, {
      requireCSRF: true,
      rateLimit: 'listings',
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
    
    // ✅ Extract userId from JWT token for security (never trust client-provided userId)
    const authHeader = (request as NextRequest).headers.get('authorization');
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const cookieToken = (request as NextRequest).cookies.get('accessToken')?.value || null;
    const accessToken = bearer || cookieToken;
    const tokenPayload = accessToken ? await verifyToken(accessToken) : null;
    const userId = tokenPayload?.userId;
    
    // ✅ Validate userId is a proper UUID (reject malformed IDs
    const uuidValidation = listingCreateSchema.shape.ownerUserId.safeParse(userId);
    if (!uuidValidation.success) {
      logger.warn('Invalid userId format in JWT', { userId, error: uuidValidation.error });
      return NextResponse.json(
        { error: 'User ID format is invalid. Please log in again.' },
        { status: 401 }
      );
    }
    
    // If no valid JWT token, reject the request
    if (!userId) {
      return NextResponse.json(
        { error: 'Autentificare necesară pentru a publica anunțuri' },
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

    // Check rate limits
    const rateLimit = getRateLimit(trustScore);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const listingsToday = await prisma.listing.count({
      where: {
        ownerUserId: userId,
        createdAt: { gte: today }
      }
    });

    if (listingsToday >= rateLimit.listingsPerDay) {
      logger.warn('Rate limit exceeded', { userId, trustScore, listingsToday, limit: rateLimit.listingsPerDay });
      return NextResponse.json(
        { 
          error: 'Limită zilnică atinsă',
          message: `Poți publica maxim ${rateLimit.listingsPerDay} anunțuri pe zi. Crește-ți scorul de încredere pentru mai multe!`,
          currentTrust: trustScore,
          nextLevel: trustScore < TRUST_LEVELS.VERIFIED ? TRUST_LEVELS.VERIFIED : 100
        },
        { status: 429 }
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
      moderationScore -= scamResult.confidence * 0.5; // Reduce score based on scam confidence
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

    const data: any = {
      owner: {
        connect: { id: userId }
      },
      title: cleanBody.title,
      category: cleanBody.category,
      subcategory: cleanBody.subcategory,
      priceAmount: cleanBody.priceAmount,
      priceCurrency: cleanBody.priceCurrency ?? "RON",
      condition: cleanBody.condition ?? "used",
      status: moderationStatus === 'approved' ? (cleanBody.status ?? "active") : 'pending',
      description: cleanBody.description,
      county: cleanBody.county,
      city: cleanBody.city,
      region: cleanBody.region,
      photos: cleanBody.photos ?? [],
      contactPhone: cleanBody.phone,
      isFeatured: cleanBody.isFeatured ?? false,
      
      // Auto-specific fields (nullable)
      make: cleanBody.make,
      model: cleanBody.model,
      year: cleanBody.year,
      mileage: cleanBody.mileage,
      fuel: cleanBody.fuel,
      transmission: cleanBody.transmission,
      vin: cleanBody.vin,
      
      // Generic attributes - include all optional car details
      attributes: {
        ...cleanBody.attributes,
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

      // Moderation fields
      moderationStatus,
      moderationNotes: flags.length > 0 ? `Flags: ${flags.join(', ')}` : null,
      
      // Scam detection results (store for admin review)
      scamScore: scamResult.score,
      scamFlags: scamResult.flags && scamResult.flags.length > 0 ? scamResult.flags : [],
    };

    const listing = await prisma.listing.create({ data });

    // Dacă e pending, creează ModerationQueue entry
    if (moderationStatus === 'pending') {
      await prisma.moderationQueue.create({
        data: {
          listingId: listing.id,
          priority: moderationScore < 0.3 ? 1 : 0, // Higher priority for very low scores
          status: 'pending',
          notes: flags.length > 0 ? `Flags: ${flags.join(', ')}` : undefined,
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

    return NextResponse.json(listing, { status: 201 });
  } catch (err: any) {
    logger.error('Error creating listing', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    logger.clearContext();
  }
}

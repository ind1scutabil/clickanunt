export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  parsePaginationParams,
  buildCursorWhere,
  buildPagination,
} from "@/lib/pagination";
import { fullModeration, logModeration } from "@/lib/moderation";
import { canAutoApprove, requiresManualReview, updateTrustScore } from "@/lib/trustScore";
import { isFeatureEnabled, FeatureFlags } from "@/lib/featureFlags";
import { logger, PerformanceTracker } from "@/lib/observability";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams;

    // Parse pagination parameters (cursor-based for millions of listings)
    const { limit, cursor, direction } = parsePaginationParams(q);

    const where: any = {};

    // Status filter (only active by default)
    where.status = q.get("status") || "active";

    // Category filters
    if (q.get("category")) where.category = { equals: q.get("category") };
    if (q.get("subcategory")) where.subcategory = { equals: q.get("subcategory") };
    
    // Location filters
    if (q.get("county")) where.county = { equals: q.get("county") };
    if (q.get("city")) where.city = { equals: q.get("city") };
    
    // Auto-specific filters
    if (q.get("make")) where.make = { equals: q.get("make") };
    if (q.get("model")) where.model = { equals: q.get("model") };
    if (q.get("fuel")) where.fuel = { equals: q.get("fuel") };
    if (q.get("transmission")) where.transmission = { equals: q.get("transmission") };

    // Price filters
    const minPrice = q.get("minPrice");
    const maxPrice = q.get("maxPrice");
    if (minPrice || maxPrice) {
      where.priceAmount = {};
      if (minPrice) where.priceAmount.gte = Number(minPrice);
      if (maxPrice) where.priceAmount.lte = Number(maxPrice);
    }

    // Year filter
    const year = q.get("year");
    if (year) where.year = Number(year);
    
    // Condition filter
    if (q.get("condition")) where.condition = { equals: q.get("condition") };

    // Search query
    const search = q.get("q");
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
          },
        },
      },
      orderBy: [
        { isFeatured: "desc" },
        { createdAt: "desc" },
      ],
    });

    // Build pagination response
    const result = buildPagination(listings, limit || 20, direction);

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
    const body = await request.json();
    const userId = body.ownerUserId;

    logger.setContext({ userId, action: 'create_listing' });
    logger.info('Creating listing', { title: body.title });

    // Check trust score for auto-approve
    const userCanAutoApprove = await canAutoApprove(userId);
    const needsManualReview = await requiresManualReview(userId);
    
    // Check feature flags
    const autoModerationEnabled = await isFeatureEnabled(FeatureFlags.AUTO_MODERATION);
    const strictModerationEnabled = await isFeatureEnabled(FeatureFlags.STRICT_MODERATION);

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

    // Trust score influence
    if (userCanAutoApprove && moderationScore >= 0.7) {
      moderationStatus = 'approved';
      logger.info('Auto-approved due to high trust score');
    } else if (needsManualReview || moderationScore < 0.6 || strictModerationEnabled) {
      moderationStatus = 'pending';
      logger.info('Manual review required', { reason: needsManualReview ? 'low_trust' : 'low_mod_score' });
    }

    // Dacă anunțul este respins complet (score 0), returnează eroare
    if (!moderationResult.approved || moderationScore === 0) {
      logger.warn('Listing rejected by moderation', { reason: moderationResult.reason });
      
      // Log pentru audit
      await logModeration(
        body.ownerUserId,
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
      ownerUserId: body.ownerUserId,
      title: body.title,
      category: body.category,
      subcategory: body.subcategory || null,
      priceAmount: body.priceAmount,
      priceCurrency: body.priceCurrency ?? "RON",
      condition: body.condition || "used",
      status: moderationStatus === 'approved' ? (body.status ?? "active") : 'pending',
      description: body.description,
      county: body.county || null,
      city: body.city || null,
      region: body.region || null,
      photos: body.photos ?? [],
      isFeatured: body.isFeatured ?? false,
      
      // Auto-specific fields (nullable)
      make: body.make || null,
      model: body.model || null,
      year: body.year || null,
      mileage: body.mileage || null,
      fuel: body.fuel || null,
      transmission: body.transmission || null,
      vin: body.vin || null,
      
      // Generic attributes
      attributes: body.attributes || null,

      // Moderation fields
      moderationStatus,
      moderationScore,
      moderationFlags: flags.length > 0 ? flags : null,
    };

    const listing = await prisma.listing.create({ data });

    // Dacă e pending, creează ModerationQueue entry
    if (moderationStatus === 'pending') {
      await prisma.moderationQueue.create({
        data: {
          entityType: 'listing',
          entityId: listing.id,
          priority: moderationScore < 0.3 ? 1 : 0, // Higher priority for very low scores
          status: 'pending',
          flags: flags,
        },
      });
      logger.info('Added to moderation queue', { listingId: listing.id, priority: moderationScore < 0.3 ? 1 : 0 });
    }

    // Log moderare success
    await logModeration(
      body.ownerUserId,
      listing.id,
      moderationResult,
      moderationStatus === 'approved' || moderationStatus === 'pending' ? 'approved' : 'rejected'
    );

    // Update trust score based on result
    if (moderationStatus === 'approved') {
      await updateTrustScore(userId);
      logger.info('Trust score updated', { userId });
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

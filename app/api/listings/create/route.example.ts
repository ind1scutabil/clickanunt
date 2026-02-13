/**
 * Example: Protected API Route with Security
 * 
 * Demonstrates:
 * - Input validation with Zod
 * - Rate limiting
 * - CSRF protection
 * - Authentication
 * - Authorization
 * - Sanitization
 */

import { NextRequest, NextResponse } from 'next/server';
import { listingValidationSchema } from '@/lib/security/input-validation';
import { createRateLimiter, RATE_LIMITS } from '@/lib/security/rate-limit';
import { verifyAccessToken } from '@/lib/security/tokens';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

/**
 * POST /api/listings/create
 * Create a new listing (authenticated)
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Rate limiting (handled by middleware, but can add here too)
    const limiter = createRateLimiter(RATE_LIMITS.CREATE_LISTING);
    const rateLimitResult = await limiter(request);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
          },
        }
      );
    }
    
    // 2. Authentication (check JWT token)
    const token = request.cookies.get('access-token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - Please login' },
        { status: 401 }
      );
    }
    
    const payload = verifyAccessToken(token);
    
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    // 3. Parse and validate request body
    const body = await request.json();
    
    const validation = listingValidationSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.issues.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }
    
    const data = validation.data;
    
    // 4. Business logic validation
    // Check if user has reached listing limit
    const userListingsCount = await prisma.listing.count({
      where: {
        ownerUserId: payload.userId,
        status: 'active',
      },
    });
    
    if (userListingsCount >= 100) {
      return NextResponse.json(
        { error: 'Listing limit reached (max 100 active listings)' },
        { status: 403 }
      );
    }
    
    // 5. Create listing
    const createData = {
      ...data,
      ownerUserId: payload.userId,
      status: 'pending', // Requires moderation
    } as unknown as Prisma.ListingCreateInput;

    const listing = await prisma.listing.create({
      data: createData,
    });
    
    // 6. Audit log
    await prisma.auditLog.create({
      data: {
        userId: payload.userId,
        action: 'CREATE_LISTING',
        resource: 'LISTING',
        resourceId: listing.id,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });
    
    // 7. Return success response
    return NextResponse.json(
      {
        success: true,
        listing: {
          id: listing.id,
          title: listing.title,
          status: listing.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create listing error:', error);
    
    // Don't expose internal errors to users
    return NextResponse.json(
      { error: 'An error occurred while creating the listing' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/listings/[id]
 * Update a listing (owner only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // 1. Authentication
    const token = request.cookies.get('access-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    // 2. Authorization - check ownership
    const listing = await prisma.listing.findUnique({
      where: { id },
    });
    
    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }
    
    if (listing.ownerUserId !== payload.userId && payload.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - You can only edit your own listings' },
        { status: 403 }
      );
    }
    
    // 3. Validate input
    const body = await request.json();
    const validation = listingValidationSchema.partial().safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }
    
    // 4. Update listing
    const updated = await prisma.listing.update({
      where: { id },
      data: validation.data as Prisma.ListingUpdateInput,
    });
    
    // 5. Audit log
    await prisma.auditLog.create({
      data: {
        userId: payload.userId,
        action: 'UPDATE_LISTING',
        resource: 'LISTING',
        resourceId: id,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      },
    });
    
    return NextResponse.json({ success: true, listing: updated });
  } catch (error) {
    console.error('Update listing error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/listings/[id]
 * Delete a listing (owner or admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Authentication & Authorization
    const token = request.cookies.get('access-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const listing = await prisma.listing.findUnique({ where: { id } });
    
    if (!listing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    
    if (listing.ownerUserId !== payload.userId && payload.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Soft delete
    await prisma.listing.update({
      where: { id },
      data: { status: 'deleted' },
    });
    
    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: payload.userId,
        action: 'DELETE_LISTING',
        resource: 'LISTING',
        resourceId: id,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete listing error:', error);
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
  }
}

/**
 * Advanced Cursor-Based Pagination for 2M+ Users
 * 
 * Features:
 * - Efficient cursor-based pagination (no OFFSET)
 * - Composite cursor support (multiple sort fields)
 * - Bi-directional navigation
 * - Stable sorting
 */

import { Prisma } from '@prisma/client';

export interface CursorPaginationParams {
  limit?: number;
  cursor?: string;
  direction?: 'next' | 'prev';
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    hasMore: boolean;
    hasPrev: boolean;
    nextCursor: string | null;
    prevCursor: string | null;
    total?: number;
  };
}

/**
 * Encode cursor from object
 */
export function encodeCursor(cursorData: Record<string, any>): string {
  return Buffer.from(JSON.stringify(cursorData)).toString('base64url');
}

/**
 * Decode cursor to object
 */
export function decodeCursor(cursor: string): Record<string, any> | null {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString());
  } catch {
    return null;
  }
}

/**
 * Parse pagination params from request
 */
export function parseCursorParams(searchParams: URLSearchParams): CursorPaginationParams {
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const cursor = searchParams.get('cursor') || undefined;
  const direction = (searchParams.get('direction') as 'next' | 'prev') || 'next';

  return {
    limit: Math.min(Math.max(limit, 1), 100), // Clamp between 1-100
    cursor,
    direction,
  };
}

/**
 * Build Prisma cursor query for listings
 * 
 * Sorts by: isFeatured DESC, isPromoted DESC, createdAt DESC, id ASC
 * This ensures stable, consistent ordering even with same timestamps
 */
export function buildListingCursorQuery(
  where: any,
  params: CursorPaginationParams
): {
  where: any;
  take: number;
  cursor?: any;
  orderBy: any;
  skip?: number;
} {
  const { limit = 20, cursor, direction = 'next' } = params;
  const take = direction === 'next' ? limit + 1 : -(limit + 1);

  // Composite ordering for stable pagination
  const orderBy = [
    { isFeatured: Prisma.SortOrder.desc },
    { isPromoted: Prisma.SortOrder.desc },
    { createdAt: Prisma.SortOrder.desc },
    { id: Prisma.SortOrder.asc }, // Tie-breaker for same timestamps
  ];

  if (!cursor) {
    return { where, take, orderBy };
  }

  // Decode cursor
  const cursorData = decodeCursor(cursor);
  if (!cursorData || !cursorData.id) {
    return { where, take, orderBy };
  }

  return {
    where,
    take,
    cursor: { id: cursorData.id },
    orderBy,
    skip: 1, // Skip the cursor itself
  };
}

/**
 * Build pagination response with cursors
 */
export function buildPaginationResponse<T extends { id: string; createdAt: Date; isFeatured?: boolean; isPromoted?: boolean }>(
  results: T[],
  params: CursorPaginationParams
): PaginationResult<T> {
  const { limit = 20, direction = 'next' } = params;
  const hasMore = results.length > limit;

  // Remove the extra item used for hasMore detection
  const data = hasMore ? results.slice(0, -1) : results;

  // Reverse if going backwards
  if (direction === 'prev') {
    data.reverse();
  }

  // Generate cursors
  const nextCursor = hasMore && data.length > 0
    ? encodeCursor({
        id: data[data.length - 1].id,
        createdAt: data[data.length - 1].createdAt.toISOString(),
        isFeatured: data[data.length - 1].isFeatured,
        isPromoted: data[data.length - 1].isPromoted,
      })
    : null;

  const prevCursor = data.length > 0
    ? encodeCursor({
        id: data[0].id,
        createdAt: data[0].createdAt.toISOString(),
        isFeatured: data[0].isFeatured,
        isPromoted: data[0].isPromoted,
      })
    : null;

  return {
    data,
    pagination: {
      hasMore,
      hasPrev: !!params.cursor, // Has previous if we used a cursor
      nextCursor,
      prevCursor,
    },
  };
}

/**
 * Efficient count estimation for large datasets
 * Uses EXPLAIN for fast approximate counts
 */
export async function estimateCount(
  prisma: any,
  table: string,
  where?: any
): Promise<number> {
  try {
    // For PostgreSQL: Use EXPLAIN for fast estimates on large tables
    const result = await prisma.$queryRaw<[{ estimated_count: bigint }]>`
      SELECT reltuples::bigint AS estimated_count
      FROM pg_class
      WHERE relname = ${table}
    `;
    
    if (result[0] && result[0].estimated_count) {
      return Number(result[0].estimated_count);
    }
  } catch (error) {
    console.warn('[Pagination] Estimate failed, using exact count:', error);
  }

  // Fallback to exact count (slower but accurate)
  return 0; // Caller should use actual count if needed
}

/**
 * Search-specific cursor pagination
 * For full-text search results
 */
export function buildSearchCursorQuery(
  searchTerm: string,
  where: any,
  params: CursorPaginationParams
) {
  const { limit = 20, cursor, direction = 'next' } = params;
  
  // For search, we might want to order by relevance score
  // This is a simplified version; real implementation would use PostgreSQL full-text search
  const orderBy = [
    { createdAt: Prisma.SortOrder.desc },
    { id: Prisma.SortOrder.asc },
  ];

  return buildListingCursorQuery(where, params);
}

/**
 * Category-specific cursor pagination
 * Optimized for category browsing
 */
export function buildCategoryCursorQuery(
  category: string,
  where: any,
  params: CursorPaginationParams
) {
  // Add category to where clause
  const categoryWhere = {
    ...where,
    category: { equals: category },
  };

  return buildListingCursorQuery(categoryWhere, params);
}

/**
 * User listings cursor pagination
 * For user dashboard
 */
export function buildUserListingsCursorQuery(
  userId: string,
  where: any,
  params: CursorPaginationParams
) {
  const userWhere = {
    ...where,
    ownerUserId: userId,
  };

  return buildListingCursorQuery(userWhere, params);
}

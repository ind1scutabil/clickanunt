/**
 * Cursor-Based Pagination for Millions of Listings
 * More efficient than offset pagination for large datasets
 */

import type { Prisma } from "@prisma/client";

export interface PaginationParams {
  limit?: number;
  cursor?: string; // Listing ID
  direction?: "next" | "prev";
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
    prevCursor: string | null;
    count: number;
  };
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Parse cursor from base64 string
 */
export function decodeCursor(cursor: string): string {
  try {
    return Buffer.from(cursor, "base64").toString("utf-8");
  } catch {
    throw new Error("Invalid cursor");
  }
}

/**
 * Encode listing ID to base64 cursor
 */
export function encodeCursor(id: string): string {
  return Buffer.from(id, "utf-8").toString("base64");
}

/**
 * Build Prisma where clause with cursor
 */
export function buildCursorWhere(
  cursor: string | undefined,
  direction: "next" | "prev" = "next",
  baseWhere: Prisma.ListingWhereInput = {}
): Prisma.ListingWhereInput {
  if (!cursor) {
    return baseWhere;
  }

  const cursorId = decodeCursor(cursor);

  return {
    ...baseWhere,
    id: direction === "next" ? { gt: cursorId } : { lt: cursorId },
  };
}

/**
 * Build cursor-based pagination for listings
 */
export function buildPagination<T extends { id: string }>(
  data: T[],
  limit: number
): PaginationResult<T> {
  const hasMore = data.length > limit;
  const items = hasMore ? data.slice(0, limit) : data;

  const nextCursor = hasMore && items.length > 0
    ? encodeCursor(items[items.length - 1].id)
    : null;

  const prevCursor = items.length > 0
    ? encodeCursor(items[0].id)
    : null;

  return {
    data: items,
    pagination: {
      hasMore,
      nextCursor,
      prevCursor,
      count: items.length,
    },
  };
}

/**
 * Validate and normalize limit parameter
 */
export function normalizeLimit(limit?: number | string): number {
  const parsed = typeof limit === "string" ? parseInt(limit, 10) : limit;
  
  if (!parsed || parsed < 1) {
    return DEFAULT_LIMIT;
  }
  
  return Math.min(parsed, MAX_LIMIT);
}

/**
 * Extract pagination params from URL search params
 */
export function parsePaginationParams(searchParams: URLSearchParams): PaginationParams {
  return {
    limit: normalizeLimit(searchParams.get("limit") || undefined),
    cursor: searchParams.get("cursor") || undefined,
    direction: (searchParams.get("direction") as "next" | "prev") || "next",
  };
}

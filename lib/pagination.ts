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
 * @deprecated Folosit doar pentru compatibilitate; pentru feed-ul public folosește keyset-ul
 * `buildListingFeedKeysetWhere` (sortare feedBoost + createdAt + id).
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

/** Cursor keyset pentru feed (v2) — aliniat cu orderBy feedBoost desc, createdAt desc, id desc */
export type ListingFeedCursorPayload = {
  feedBoost: number;
  createdAt: Date;
  id: string;
};

export function encodeListingFeedCursor(payload: ListingFeedCursorPayload): string {
  return Buffer.from(
    JSON.stringify({
      v: 2,
      fb: payload.feedBoost,
      ca: payload.createdAt.toISOString(),
      id: payload.id,
    }),
    "utf-8"
  ).toString("base64");
}

export function decodeListingFeedCursor(raw: string | undefined): ListingFeedCursorPayload | null {
  if (!raw) return null;
  try {
    const json = JSON.parse(Buffer.from(raw, "base64").toString("utf-8")) as {
      v?: number;
      fb?: number;
      ca?: string;
      id?: string;
    };
    if (json?.v === 2 && typeof json.fb === "number" && typeof json.ca === "string" && typeof json.id === "string") {
      const d = new Date(json.ca);
      if (Number.isNaN(d.getTime())) return null;
      return { feedBoost: json.fb, createdAt: d, id: json.id };
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Paginare keyset corectă pentru milioane de anunțuri (fără OFFSET).
 */
export function buildListingFeedKeysetWhere(
  cursor: ListingFeedCursorPayload | null,
  baseWhere: Prisma.ListingWhereInput
): Prisma.ListingWhereInput {
  if (!cursor) return baseWhere;
  const { feedBoost, createdAt, id } = cursor;
  return {
    AND: [
      baseWhere,
      {
        OR: [
          { feedBoost: { lt: feedBoost } },
          {
            AND: [{ feedBoost }, { createdAt: { lt: createdAt } }],
          },
          {
            AND: [
              { feedBoost },
              { createdAt: { equals: createdAt } },
              { id: { lt: id } },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * Build cursor-based pagination for listings
 */
export function buildPagination<T extends { id: string }>(
  data: T[],
  limit: number,
  encodeNextCursor?: (lastRow: T) => string | null
): PaginationResult<T> {
  const hasMore = data.length > limit;
  const items = hasMore ? data.slice(0, limit) : data;

  const last = items.length > 0 ? items[items.length - 1] : null;
  const nextCursor =
    hasMore && last
      ? encodeNextCursor
        ? encodeNextCursor(last)
        : encodeCursor(last.id)
      : null;

  const first = items.length > 0 ? items[0] : null;
  const prevCursor = first ? encodeCursor(first.id) : null;

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

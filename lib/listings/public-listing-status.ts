/**
 * Public vs owner/admin listing feed status query rules.
 *
 * Public (no userId scope): only absent/`active` — always constrained by
 * seoIndexableListingWhere in the route. Other status values → 400.
 *
 * Owner/admin (authenticated userId scope): `all` or a real ListingStatus enum.
 *
 * Multiple `status` query values (any order / array pollution) → 400.
 * Never first-wins / last-wins.
 */

export const LISTING_STATUS_ENUM = [
  "draft",
  "pending",
  "active",
  "paused",
  "expired",
  "sold",
  "deleted",
  "rejected",
  "hidden",
] as const;

export type ListingStatusValue = (typeof LISTING_STATUS_ENUM)[number];

export const INVALID_STATUS_ERROR = "Invalid status parameter";

const LISTING_STATUS_SET = new Set<string>(LISTING_STATUS_ENUM);

export function isListingStatusEnum(value: string): value is ListingStatusValue {
  return LISTING_STATUS_SET.has(value);
}

export type ResolveListingFeedStatusResult =
  | { ok: true; statusParam: "all" | ListingStatusValue | "active"; applyPublicIndexable: boolean }
  | { ok: false; error: typeof INVALID_STATUS_ERROR };

/**
 * Collect every status-like query value, including:
 * - status / STATUS
 * - status[] / status[0]
 * Repeated keys are each included (getAll semantics).
 */
export function collectStatusQueryValues(searchParams: URLSearchParams): string[] {
  const values: string[] = [];
  for (const [rawKey, value] of searchParams.entries()) {
    const key = rawKey.trim();
    if (/^status$/i.test(key)) {
      values.push(value);
      continue;
    }
    if (/^status\[\d*\]$/i.test(key)) {
      values.push(value);
    }
  }
  return values;
}

/**
 * @param rawStatus - query status (may be undefined)
 * @param hasOwnerScope - true when authenticated userId filter is applied
 */
export function resolveListingFeedStatusQuery(
  rawStatus: string | null | undefined,
  hasOwnerScope: boolean,
): ResolveListingFeedStatusResult {
  const trimmed = (rawStatus ?? "").trim();
  const statusParam = trimmed.length === 0 ? "active" : trimmed;

  if (hasOwnerScope) {
    if (statusParam === "all") {
      return { ok: true, statusParam: "all", applyPublicIndexable: false };
    }
    if (!isListingStatusEnum(statusParam)) {
      return { ok: false, error: INVALID_STATUS_ERROR };
    }
    return { ok: true, statusParam, applyPublicIndexable: false };
  }

  // Public catalog — never enumerate non-indexable rows via status=
  if (statusParam === "active") {
    return { ok: true, statusParam: "active", applyPublicIndexable: true };
  }
  return { ok: false, error: INVALID_STATUS_ERROR };
}

/**
 * Resolve status from full search params — rejects multi-value pollution.
 */
export function resolveListingFeedStatusFromSearchParams(
  searchParams: URLSearchParams,
  hasOwnerScope: boolean,
): ResolveListingFeedStatusResult {
  const values = collectStatusQueryValues(searchParams);
  if (values.length > 1) {
    return { ok: false, error: INVALID_STATUS_ERROR };
  }
  return resolveListingFeedStatusQuery(values[0], hasOwnerScope);
}

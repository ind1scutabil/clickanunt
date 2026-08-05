/**
 * Central on-demand cache invalidation for public marketplace surfaces.
 *
 * WHY THIS EXISTS (FAZA 22):
 * The homepage ("N anunțuri în catalog") and category/city hub pages are statically
 * rendered by Next.js with a default ISR window (`revalidate: 5m` — see `app/page.tsx`
 * build output). Without an explicit trigger, a listing that changes public eligibility
 * (approved, rejected, paused, reactivated, soft-deleted, expired, ...) only becomes
 * visible on these surfaces after the *next* request that lands past the 5-minute
 * stale window — i.e. up to 5 minutes of avoidable staleness, and unbounded staleness
 * if traffic is sparse enough that no request happens to fall after the window for a
 * while (ISR keeps serving the last good render until a regeneration succeeds).
 *
 * Calling `revalidatePublicMarketplaceSurfaces()` right after a DB mutation commits
 * makes Next.js regenerate the affected static pages on the *next* request instead of
 * waiting for the passive ISR window. This is on-demand revalidation, not "real-time":
 * the very next visitor gets the fresh HTML, but this call itself does not push
 * anything to already-open browser tabs.
 *
 * Scope discipline: this must invalidate ONLY the surfaces that can be affected by a
 * change to listing public eligibility — never the whole cache/site. Call this only
 * after a DB mutation has actually committed (never speculatively, never on failure).
 */

import { revalidatePath } from "next/cache";
import { primarySlugForCategoryLabel } from "@/lib/seo/market-paths";
import { slugifyRo } from "@/lib/seo/slug";

export type MarketplaceMutationKind =
  | "create"
  | "approve"
  | "reject"
  | "pause"
  | "reactivate"
  | "expire"
  | "soft_delete"
  | "moderation";

export type RevalidateMarketplaceOptions = {
  /** Why this call was made — for logs/tracing only, does not change behavior. */
  reason: MarketplaceMutationKind;
  /** Category label of the affected listing, if known — used to also refresh its hub pages. */
  category?: string | null;
  /** City of the affected listing, if known — used to also refresh its category×city hub page. */
  city?: string | null;
};

/**
 * Revalidates exactly the public surfaces whose displayed counts/listings can change
 * when a listing's public eligibility changes. Safe to call multiple times; Next.js
 * de-dupes repeated `revalidatePath` calls for the same path within a request.
 */
export function revalidatePublicMarketplaceSurfaces(options: RevalidateMarketplaceOptions): void {
  // Homepage: "N anunțuri în catalog" badge + category shortcut counts.
  revalidatePath("/");

  const categorySlug = options.category ? primarySlugForCategoryLabel(options.category) : null;
  if (categorySlug) {
    // Category hub (aggregate count for that category).
    revalidatePath(`/${categorySlug}`);

    if (options.city) {
      const citySlug = slugifyRo(options.city);
      if (citySlug) {
        // Category×city hub — the same page family whose "no fresh data for new cities"
        // caveat is documented in lib/seo/hub-queries.ts.
        revalidatePath(`/${categorySlug}/${citySlug}`);
      }
    }
  }

  // `/listings` itself is already server-rendered per-request (no Full Route Cache),
  // so it does not need `revalidatePath` — it always reflects the current DB state.
}

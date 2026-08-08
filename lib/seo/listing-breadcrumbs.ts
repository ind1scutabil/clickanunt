/**
 * Visible breadcrumb trail for a public listing detail page.
 * JSON-LD BreadcrumbList must use the same items in the same order.
 *
 * Auto hubs are only linked when they already exist as real routes
 * (`/auto/{make}`, `/auto/{make}/{model}`, `/auto/{city}`). Empty doorway
 * pages are never invented here.
 */

import { primarySlugForCategoryLabel } from "@/lib/seo/market-paths";
import { slugifyRo } from "@/lib/seo/slug";
import {
  AUTO_CATEGORY_LABEL,
  buildAutoMakeHubPath,
  buildAutoModelHubPath,
  resolveAutoMakeFromSlug,
  resolveAutoModelFromSlug,
  autoMakeSlug,
} from "@/lib/seo/auto-hub-resolve";

export type ListingBreadcrumbItem = {
  label: string;
  /** Site-relative path. Omit on the current page (last crumb). */
  href?: string;
};

export type ListingBreadcrumbSource = {
  id: string;
  title: string;
  category: string;
  city?: string | null;
  make?: string | null;
  model?: string | null;
  subcategory?: string | null;
};

function isAutoCategory(category: string): boolean {
  return category === AUTO_CATEGORY_LABEL || primarySlugForCategoryLabel(category) === "auto";
}

/**
 * Build breadcrumb items for a listing.
 *
 * Auto trail when make/model resolve to known hubs:
 *   Acasă → Auto → {Make} → {Model} → {City} → {Title}
 * Otherwise falls back to Acasă → {Category} → {City} → {Title}.
 */
export function buildListingBreadcrumbItems(
  listing: ListingBreadcrumbSource,
): ListingBreadcrumbItem[] {
  const crumbs: ListingBreadcrumbItem[] = [{ label: "Acasă", href: "/" }];
  const catSlug = primarySlugForCategoryLabel(listing.category);
  const shortCat = listing.category.split(",")[0]?.trim() ?? listing.category;

  if (catSlug) {
    crumbs.push({ label: shortCat, href: `/${catSlug}` });
  }

  if (catSlug === "auto" && isAutoCategory(listing.category)) {
    const makeRaw = listing.make?.trim() || "";
    const modelRaw = listing.model?.trim() || "";
    const makeSlug = makeRaw ? autoMakeSlug(makeRaw) : "";
    const resolvedMake = makeSlug ? resolveAutoMakeFromSlug(makeSlug) : null;

    if (resolvedMake) {
      crumbs.push({
        label: resolvedMake,
        href: buildAutoMakeHubPath(resolvedMake),
      });

      const resolvedModel = modelRaw
        ? resolveAutoModelFromSlug(resolvedMake, slugifyRo(modelRaw))
        : null;
      if (resolvedModel) {
        crumbs.push({
          label: resolvedModel,
          href: buildAutoModelHubPath(resolvedMake, resolvedModel),
        });
      }
    }
  }

  if (catSlug && listing.city) {
    crumbs.push({
      label: listing.city,
      href: `/${catSlug}/${slugifyRo(listing.city)}`,
    });
  }

  const title = listing.title.slice(0, 72) + (listing.title.length > 72 ? "…" : "");
  crumbs.push({ label: title });
  return crumbs;
}

/** Same trail as the visible nav, shaped for BreadcrumbList JSON-LD. */
export function buildListingBreadcrumbJsonLdItems(
  listing: ListingBreadcrumbSource,
): Array<{ name: string; url: string }> {
  const items = buildListingBreadcrumbItems(listing);
  return items.map((item, index) => {
    const last = index === items.length - 1;
    return {
      name: item.label,
      url: last ? `/listings/${listing.id}` : item.href || `/listings/${listing.id}`,
    };
  });
}

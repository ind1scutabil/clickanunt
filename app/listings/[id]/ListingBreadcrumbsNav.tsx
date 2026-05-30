import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { primarySlugForCategoryLabel } from "@/lib/seo/market-paths";
import { slugifyRo } from "@/lib/seo/slug";
export async function ListingBreadcrumbsNav({ listingId }: { listingId: string }) {
  if (process.env.USE_IN_MEMORY_DB === "true") {
    return null;
  }

  const listing = await prisma.listing.findFirst({
    where: { id: listingId },
    select: {
      title: true,
      category: true,
      city: true,
      deletedAt: true,
      status: true,
      moderationStatus: true,
      expiresAt: true,
    },
  });

  if (!listing) {
    return null;
  }

  // Moderation visibility gate: don't render the real title in the breadcrumb for non-public listings.
  const NON_PUBLIC_STATUSES: readonly string[] = ["rejected", "paused", "hidden", "pending", "draft"];
  const isNonPublic = NON_PUBLIC_STATUSES.includes(listing.status);

  const crumbs: Array<{ label: string; href?: string }> = [{ label: "Acasă", href: "/" }];
  const catSlug = primarySlugForCategoryLabel(listing.category);
  const shortCat = listing.category.split(",")[0]?.trim() ?? listing.category;

  if (catSlug) {
    crumbs.push({ label: shortCat, href: `/${catSlug}` });
  }
  if (catSlug && listing.city) {
    crumbs.push({ label: listing.city, href: `/${catSlug}/${slugifyRo(listing.city)}` });
  }

  crumbs.push({
    label: isNonPublic
      ? "Anunț indisponibil"
      : listing.title.slice(0, 72) + (listing.title.length > 72 ? "…" : ""),
  });

  return (
    <nav
      aria-label="Breadcrumb"
      className="border-b border-white/10 bg-[#0F1117]/95 px-4 py-3 text-sm text-neutral-400 backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-2 gap-y-1">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {crumbs.map((c, idx) => {
            const last = idx === crumbs.length - 1;
            return (
              <li key={`${c.label}-${idx}`} className="inline-flex items-center gap-2">
                {idx > 0 && <span className="text-neutral-600" aria-hidden>/</span>}
                {last || !c.href ? (
                  <span className={`font-medium ${last ? "text-white/85" : "text-primary-200"}`}>{c.label}</span>
                ) : (
                  <Link href={c.href} className="text-primary-300 transition-colors hover:text-primary-100">
                    {c.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}

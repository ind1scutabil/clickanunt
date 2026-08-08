import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isListingSeoIndexable } from "@/lib/seo/listing-seo-eligibility";
import { buildListingBreadcrumbItems } from "@/lib/seo/listing-breadcrumbs";

export async function ListingBreadcrumbsNav({ listingId }: { listingId: string }) {
  if (process.env.USE_IN_MEMORY_DB === "true") {
    return null;
  }

  const listing = await prisma.listing.findFirst({
    where: { id: listingId },
    select: {
      id: true,
      title: true,
      category: true,
      city: true,
      make: true,
      model: true,
      subcategory: true,
      deletedAt: true,
      status: true,
      moderationStatus: true,
      expiresAt: true,
    },
  });

  if (!listing || !isListingSeoIndexable(listing)) {
    return null;
  }

  const crumbs = buildListingBreadcrumbItems(listing);

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

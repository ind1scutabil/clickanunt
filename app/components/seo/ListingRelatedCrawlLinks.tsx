import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { hubWhereBase } from "@/lib/seo/hub-queries";
import { isListingSeoIndexable } from "@/lib/seo/listing-seo-eligibility";

async function fetchRelated(
  category: string,
  excludeId: string,
  city: string | null,
  priceAmount: number,
): Promise<Array<{ id: string; title: string }>> {
  const bandLow = Math.max(0, Math.floor(priceAmount * 0.75));
  const bandHigh = Math.ceil(priceAmount * 1.25);

  const base = {
    ...hubWhereBase,
    category,
    id: { not: excludeId },
    priceAmount: { gte: bandLow, lte: bandHigh },
  };

  let rows = await prisma.listing.findMany({
    where: city ? { ...base, city } : base,
    orderBy: { updatedAt: "desc" },
    take: 10,
    select: { id: true, title: true },
  });

  if (rows.length < 4 && city) {
    rows = await prisma.listing.findMany({
      where: { ...base },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: { id: true, title: true },
    });
  }

  if (rows.length < 4) {
    rows = await prisma.listing.findMany({
      where: {
        ...hubWhereBase,
        category,
        id: { not: excludeId },
        ...(city ? { city } : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: { id: true, title: true },
    });
  }

  return rows;
}

/** Crawlable `<a>` block for related inventory (category / city / price proximity). */
export async function ListingRelatedCrawlLinks({ listingId }: { listingId: string }) {
  if (process.env.USE_IN_MEMORY_DB === "true") return null;

  const listing = await prisma.listing.findFirst({
    where: { id: listingId },
    select: {
      id: true,
      title: true,
      category: true,
      city: true,
      priceAmount: true,
      deletedAt: true,
      status: true,
      moderationStatus: true,
      expiresAt: true,
    },
  });

  if (!listing || !isListingSeoIndexable(listing)) return null;

  const related = await fetchRelated(listing.category, listing.id, listing.city ?? null, listing.priceAmount);
  if (related.length === 0) return null;

  const shortCat = listing.category.split(",")[0]?.trim() ?? listing.category;

  return (
    <section
      className="mx-auto mt-10 max-w-7xl border-t border-white/10 px-4 pt-10 pb-6"
      aria-labelledby="related-listings-seo"
    >
      <h2 id="related-listings-seo" className="mb-4 text-lg font-bold text-white">
        Anunțuri asemănătoare · {shortCat}
        {listing.city ? ` · ${listing.city}` : ""}
      </h2>
      <p className="mb-4 text-sm text-neutral-400">
        Aceeași categorie și zonă, cu prețuri în interval apropiat — legături directe către paginile publice.
      </p>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {related.map((r) => (
          <li key={r.id}>
            <Link
              href={`/listings/${r.id}`}
              className="block rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-primary-100 transition-colors hover:border-primary-400/40 hover:text-white"
            >
              <span className="line-clamp-2 font-medium">{r.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

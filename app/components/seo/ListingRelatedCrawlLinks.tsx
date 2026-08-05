import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isListingSeoIndexable } from "@/lib/seo/listing-seo-eligibility";
import { fetchRelatedListings } from "@/lib/seo/related-listings";

/** Crawlable `<a>` block for related inventory (category / city / optional price proximity). */
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
      priceCurrency: true,
      priceType: true,
      deletedAt: true,
      status: true,
      moderationStatus: true,
      expiresAt: true,
    },
  });

  if (!listing || !isListingSeoIndexable(listing)) return null;

  const { rows: related, usedPriceBand } = await fetchRelatedListings({
    id: listing.id,
    category: listing.category,
    city: listing.city ?? null,
    priceAmount: listing.priceAmount,
    priceCurrency: listing.priceCurrency,
    priceType: listing.priceType,
  });
  if (related.length === 0) return null;

  const shortCat = listing.category.split(",")[0]?.trim() ?? listing.category;

  return (
    <section
      className="mx-auto mt-10 max-w-7xl border-t border-white/10 px-4 pt-10 pb-6"
      aria-labelledby="related-listings-seo"
      data-related-price-band={usedPriceBand ? "1" : "0"}
    >
      <h2 id="related-listings-seo" className="mb-4 text-lg font-bold text-white">
        Anunțuri asemănătoare · {shortCat}
        {listing.city ? ` · ${listing.city}` : ""}
      </h2>
      <p className="mb-4 text-sm text-neutral-400">
        {usedPriceBand
          ? "Aceeași categorie și zonă, cu prețuri în interval apropiat (aceeași monedă) — legături directe către paginile publice."
          : "Alte anunțuri din aceeași categorie și zonă — legături directe către paginile publice."}
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

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { hubWhereBase } from "@/lib/seo/hub-queries";
import { listingPrimaryPhotoSrcForVariant } from "@/lib/listing-image-variants";
import { SEO_HIGHLIGHT_CITY_LABELS, SEO_NAV_CATEGORY_SLUGS, CATEGORY_LABEL_BY_CANONICAL_SLUG } from "@/lib/seo/market-paths";
import { slugifyRo } from "@/lib/seo/slug";
import { getActiveListingCountForHub } from "@/lib/seo/hub-queries";
import { isCategoryCityHubSeoIndexable } from "@/lib/seo/hub-index-policy";
import { formatListingCommercialOrSalaryLine } from "@/lib/format-listing-price";

/** Discover-oriented strip: fresh listings + crawlable hubs (server HTML). */
export async function HomeEditorialSeoStrip() {
  if (process.env.USE_IN_MEMORY_DB === "true") return null;

  const latest = await prisma.listing.findMany({
    where: hubWhereBase,
    orderBy: { createdAt: "desc" },
    take: 8,
    select: {
      id: true,
      title: true,
      photos: true,
      category: true,
      priceCurrency: true,
      priceAmount: true,
      priceType: true,
      salaryMin: true,
      salaryMax: true,
      salaryCurrency: true,
      salaryPeriod: true,
    },
  });

  const hubCandidates = SEO_NAV_CATEGORY_SLUGS.flatMap((slug) => {
    const label = CATEGORY_LABEL_BY_CANONICAL_SLUG[slug];
    if (!label) return [];
    return SEO_HIGHLIGHT_CITY_LABELS.slice(0, 4).map((city) => ({
      slug,
      label: label.split(",")[0]?.trim() ?? slug,
      categoryLabel: label,
      city,
    }));
  });

  const hubCounts = await Promise.all(
    hubCandidates.map(async (h) => ({
      ...h,
      count: await getActiveListingCountForHub(h.categoryLabel, h.city),
    })),
  );
  const hubs = hubCounts.filter((h) => isCategoryCityHubSeoIndexable(h.count));

  if (latest.length === 0 && hubs.length === 0) return null;

  return (
    <section
      className="border-t border-white/[0.06] bg-[#0b0d12]"
      aria-labelledby="editorial-discover-heading"
    >
      <div className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6 lg:px-8">
        <h2 id="editorial-discover-heading" className="mb-2 text-2xl font-black text-white md:text-3xl">
          Proaspăt pe ClickAnunț
        </h2>
        <p className="mb-8 max-w-2xl text-sm text-white/55 md:text-base">
          Cele mai noi anunțuri verificate și hub-uri rapide spre orașe populare — conținut actualizat pentru căutare și Discover.
        </p>

        {latest.length > 0 ? (
          <div className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {latest.map((l, index) => (
              <Link
                key={l.id}
                href={`/listings/${l.id}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#161B22] transition-colors hover:border-primary-400/35"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-[#1e293b] to-[#0f172a]">
                  <img
                    src={listingPrimaryPhotoSrcForVariant(l.photos, "medium")}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    loading={index === 0 ? "eager" : "lazy"}
                    decoding="async"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    {...(index === 0 ? { fetchPriority: "high" as const } : {})}
                  />
                </div>
                <div className="p-4">
                  <h3 className="line-clamp-2 text-base font-bold leading-snug text-white group-hover:text-primary-200 md:text-lg">
                    {l.title}
                  </h3>
                  <p className="mt-1 text-sm text-white/50">
                    {(() => {
                      const line = formatListingCommercialOrSalaryLine({
                        category: l.category,
                        priceType: l.priceType,
                        priceAmount: l.priceAmount,
                        priceCurrency: l.priceCurrency,
                        salaryMin: l.salaryMin,
                        salaryMax: l.salaryMax,
                        salaryCurrency: l.salaryCurrency,
                        salaryPeriod: l.salaryPeriod,
                      });
                      return line.suffix
                        ? `${line.primary} · ${line.suffix}`
                        : line.primary;
                    })()}
                  </p>
                  <span className="mt-2 inline-block text-xs font-semibold text-primary-300/90">Vezi anunțul →</span>
                </div>
              </Link>
            ))}
          </div>
        ) : null}

        {hubs.length > 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-neutral-400">
              Hub-uri populare
            </h3>
            <ul className="flex flex-wrap gap-2" data-testid="home-popular-hubs">
              {hubs.map((h) => (
                <li key={`${h.slug}-${h.city}`}>
                  <Link
                    href={`/${h.slug}/${slugifyRo(h.city)}`}
                    className="inline-flex rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-sm text-neutral-200 transition-colors hover:border-primary-400/40 hover:text-white"
                    data-hub-count={h.count}
                  >
                    {h.label} · {h.city}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm text-neutral-400">
              <Link href="/harta-site" className="text-primary-300 underline underline-offset-4 hover:text-primary-100">
                Harta site — index HTML
              </Link>{" "}
              cu legături către categorii și orașe.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

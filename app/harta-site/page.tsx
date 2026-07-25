import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import { createPageMetadata } from "@/lib/seo";
import {
  CATEGORY_LABEL_BY_CANONICAL_SLUG,
} from "@/lib/seo/market-paths";
import { getCategoryCityHubIndex } from "@/lib/seo/hub-queries";

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata({
    title: "Harta site — categorii și orașe (legături HTML) | ClickAnunț",
    description:
      "Index HTML cu legături către hub-uri categorie și categorie+oraș pentru crawl și utilizatori. Actualizat automat din structura marketplace.",
    canonicalPath: "/harta-site",
    keywords: ["harta site", "categorii", "orașe", "anunțuri", "ClickAnunț"],
    ogImage: "/opengraph-image",
  });
}

export default async function HtmlSitemapPage() {
  const slugs = Object.keys(CATEGORY_LABEL_BY_CANONICAL_SLUG).filter((s) => s !== "altele");
  const hubIndex = await getCategoryCityHubIndex();

  const hubsBySlug = new Map<string, Array<{ city: string; citySlug: string; href: string }>>();
  for (const row of hubIndex) {
    const list = hubsBySlug.get(row.categorySlug) ?? [];
    list.push({
      city: row.city,
      citySlug: row.citySlug,
      href: `/${row.categorySlug}/${row.citySlug}`,
    });
    hubsBySlug.set(row.categorySlug, list);
  }

  return (
    <div className="min-h-screen bg-[#0F1117]">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-12 text-neutral-200">
        <h1 className="mb-4 text-3xl font-black text-white">Harta site</h1>
        <p className="mb-10 text-sm leading-relaxed text-neutral-400">
          Legături crawlable către zonele principale ale marketplace-ului. Pentru motorul de căutare, folosiți și{" "}
          <Link href="/sitemap.xml" className="text-primary-300 hover:underline">
            sitemap.xml
          </Link>
          .
        </p>

        <nav aria-label="Index categorii și orașe">
          <ul className="space-y-10">
            {slugs.map((slug) => {
              const label = CATEGORY_LABEL_BY_CANONICAL_SLUG[slug];
              const short = label.split(",")[0]?.trim() ?? label;
              const cityLinks = hubsBySlug.get(slug) ?? [];
              return (
                <li key={slug} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <h2 className="mb-3 text-lg font-bold text-white">
                    <Link href={`/${slug}`} className="hover:text-primary-200 hover:underline">
                      {short}
                    </Link>
                  </h2>
                  {cityLinks.length > 0 ? (
                    <>
                      <p className="mb-3 text-xs text-neutral-500">Hub-uri oraș cu anunțuri publice</p>
                      <ul className="flex flex-wrap gap-2">
                        {cityLinks.map((link) => (
                          <li key={`${slug}-${link.citySlug}`}>
                            <Link
                              href={link.href}
                              className="inline-flex rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-sm text-neutral-200 hover:border-primary-400/40 hover:text-white"
                            >
                              {link.city}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="text-xs text-neutral-500">Nu există hub-uri oraș cu anunțuri publice momentan.</p>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </main>
    </div>
  );
}

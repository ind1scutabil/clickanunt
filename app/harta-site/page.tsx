import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import { createPageMetadata } from "@/lib/seo";
import {
  CATEGORY_LABEL_BY_CANONICAL_SLUG,
  SEO_HIGHLIGHT_CITY_LABELS,
} from "@/lib/seo/market-paths";
import { slugifyRo } from "@/lib/seo/slug";

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

export default function HtmlSitemapPage() {
  const slugs = Object.keys(CATEGORY_LABEL_BY_CANONICAL_SLUG).filter((s) => s !== "altele");
  const cities = [...SEO_HIGHLIGHT_CITY_LABELS];

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
              return (
                <li key={slug} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <h2 className="mb-3 text-lg font-bold text-white">
                    <Link href={`/${slug}`} className="hover:text-primary-200 hover:underline">
                      {short}
                    </Link>
                  </h2>
                  <p className="mb-3 text-xs text-neutral-500">Hub orașe pentru «{short}»</p>
                  <ul className="flex flex-wrap gap-2">
                    {cities.map((city) => (
                      <li key={`${slug}-${city}`}>
                        <Link
                          href={`/${slug}/${slugifyRo(city)}`}
                          className="inline-flex rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-sm text-neutral-200 hover:border-primary-400/40 hover:text-white"
                        >
                          {city}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        </nav>
      </main>
    </div>
  );
}

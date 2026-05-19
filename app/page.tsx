import type { Metadata } from "next";
import HomePageClient from "@/app/components/HomePageClient";
import { HomeEditorialSeoStrip } from "@/app/components/seo/HomeEditorialSeoStrip";
import { HERO_DESKTOP_URL } from "@/lib/hero-asset-urls";
import { createPageMetadata, generateBreadcrumbStructuredData } from "@/lib/seo";
import { getHomePageInitialStats } from "@/lib/home-page-stats";

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata({
    title: "ClickAnunț.ro — Anunțuri gratuite în România",
    description:
      "Publică și găsește anunțuri gratuite în România: auto, imobiliare, electronice, locuri de muncă și servicii. Marketplace național ClickAnunț.",
    canonicalPath: "/",
    keywords: [
      "ClickAnunt",
      "ClickAnunt.ro",
      "anunțuri gratuite",
      "anunțuri România",
      "marketplace România",
      "auto",
      "imobiliare",
      "locuri de muncă",
    ],
    ogImage: "/opengraph-image",
  });
}

export default async function HomePage() {
  const homeCrumb = generateBreadcrumbStructuredData([{ name: "Acasă", url: "/" }]);

  let initialActiveListings: number | null = null;
  let initialCategoryCounts: Record<string, number> = {};
  let initialCategoryStatsError = true;

  if (process.env.USE_IN_MEMORY_DB !== "true") {
    try {
      const stats = await getHomePageInitialStats();
      initialActiveListings = stats.activeListings;
      initialCategoryCounts = stats.categoryCounts;
      initialCategoryStatsError = false;
    } catch {
      initialCategoryStatsError = true;
    }
  }

  return (
    <>
      <link rel="preload" href={HERO_DESKTOP_URL} as="image" type="image/webp" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homeCrumb) }} />
      <HomePageClient
        editorialStrip={<HomeEditorialSeoStrip />}
        initialActiveListings={initialActiveListings}
        initialCategoryCounts={initialCategoryCounts}
        initialCategoryStatsError={initialCategoryStatsError}
      />
    </>
  );
}

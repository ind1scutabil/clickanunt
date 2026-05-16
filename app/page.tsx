import type { Metadata } from "next";
import HomePageClient from "@/app/components/HomePageClient";
import { HomeEditorialSeoStrip } from "@/app/components/seo/HomeEditorialSeoStrip";
import { HERO_DESKTOP_URL } from "@/lib/hero-asset-urls";
import { createPageMetadata, generateBreadcrumbStructuredData } from "@/lib/seo";
import { getHomePageInitialStats } from "@/lib/home-page-stats";

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata({
    title: "Anunțuri gratuite în România — Auto, Imobiliare, Electronice | ClickAnunț",
    description:
      "Publică și caută anunțuri gratuite pe ClickAnunț: auto și moto, apartamente, electronice, telefoane, locuri de muncă și multe altele. Oferte verificate din toată România.",
    canonicalPath: "/",
    keywords: [
      "anunțuri gratuite",
      "anunțuri România",
      "vânzări second hand",
      "mașini second hand",
      "imobiliare",
      "electronice",
      "ClickAnunț",
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

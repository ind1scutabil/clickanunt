import type { Metadata } from "next";
import HomePageClient from "@/app/components/HomePageClient";
import { HomeEditorialSeoStrip } from "@/app/components/seo/HomeEditorialSeoStrip";
import { HERO_DESKTOP_URL } from "@/lib/hero-asset-urls";
import { createPageMetadata, generateBreadcrumbStructuredData } from "@/lib/seo";

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

export default function HomePage() {
  const homeCrumb = generateBreadcrumbStructuredData([{ name: "Acasă", url: "/" }]);
  return (
    <>
      <link rel="preload" href={HERO_DESKTOP_URL} as="image" type="image/webp" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homeCrumb) }} />
      <HomePageClient editorialStrip={<HomeEditorialSeoStrip />} />
    </>
  );
}

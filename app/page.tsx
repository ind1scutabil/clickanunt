import type { Metadata } from "next";
import HomePageClient from "@/app/components/HomePageClient";
import { createPageMetadata } from "@/lib/seo";

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
    ogImage: "/images/og-home.jpg",
  });
}

export default function HomePage() {
  return <HomePageClient />;
}

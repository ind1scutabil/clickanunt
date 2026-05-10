import { marketplaceOpenGraphImageResponse } from "@/lib/seo/marketplace-og";

export const runtime = "edge";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };

export default function Image() {
  return marketplaceOpenGraphImageResponse({
    title: "Anunțuri gratuite în România",
    subtitle: "Auto, imobiliare, electronice, locuri de muncă și multe altele",
    footer: "ClickAnunț",
  });
}

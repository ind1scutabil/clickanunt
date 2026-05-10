import { marketplaceOpenGraphImageResponse } from "@/lib/seo/marketplace-og";
import { canonicalCategorySlug, categorySlugToLabel } from "@/lib/seo/market-paths";

export const runtime = "edge";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };

type Props = { params: Promise<{ categorySlug: string }> };

export default async function Image({ params }: Props) {
  const { categorySlug } = await params;
  const canonical = canonicalCategorySlug(categorySlug);
  const label = canonical ? categorySlugToLabel(canonical) : null;
  const short = label?.split(",")[0]?.trim() ?? "Marketplace";

  return marketplaceOpenGraphImageResponse({
    title: label ? `Anunțuri ${short}` : "ClickAnunț",
    subtitle: label ? `Categorie: ${label}` : "Anunțuri gratuite în România",
    footer: canonical ? `clickanunt.ro/${canonical}` : "clickanunt.ro",
  });
}

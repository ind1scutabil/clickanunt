import { marketplaceOpenGraphImageResponse } from "@/lib/seo/marketplace-og";
import {
  canonicalCategorySlug,
  categorySlugToLabel,
  primarySlugForCategoryLabel,
  resolveCityLabelFromSlug,
} from "@/lib/seo/market-paths";

export const runtime = "edge";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };

type Props = { params: Promise<{ categorySlug: string; citySlug: string }> };

export default async function Image({ params }: Props) {
  const { categorySlug, citySlug } = await params;
  const canonical = canonicalCategorySlug(categorySlug);
  const label = canonical ? categorySlugToLabel(canonical) : null;
  const city = resolveCityLabelFromSlug(citySlug);
  const primary = label ? primarySlugForCategoryLabel(label) ?? canonical : null;
  const short = label?.split(",")[0]?.trim() ?? "Anunțuri";

  const title =
    label && city ? `${short} în ${city}` : label ? `Anunțuri ${short}` : "ClickAnunț";
  const subtitle =
    label && city
      ? `Găsești oferte verificate în ${city}`
      : city
        ? `Oraș: ${city}`
        : label
          ? `Categorie: ${label}`
          : "Marketplace România";

  const path =
    primary && city ? `${primary}/${citySlug}` : primary ? `${primary}` : "";

  return marketplaceOpenGraphImageResponse({
    title,
    subtitle,
    footer: path ? `clickanunt.ro/${path}` : "clickanunt.ro",
  });
}

import { formatListingPrice } from "@/lib/format-listing-price";
import { marketplaceOpenGraphImageResponse } from "@/lib/seo/marketplace-og";
import { prisma } from "@/lib/prisma";
import { isListingSeoIndexable } from "@/lib/seo/listing-seo-eligibility";

export const runtime = "nodejs";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };

type Props = { params: Promise<{ id: string }> };

export default async function Image({ params }: Props) {
  const { id } = await params;

  if (process.env.USE_IN_MEMORY_DB === "true" || !id) {
    return marketplaceOpenGraphImageResponse({
      title: "Anunț pe ClickAnunț",
      subtitle: "Detalii și contact pe site",
      footer: "clickanunt.ro",
    });
  }

  const listing = await prisma.listing.findFirst({
    where: { id },
    select: {
      title: true,
      category: true,
      city: true,
      county: true,
      priceAmount: true,
      priceCurrency: true,
      deletedAt: true,
      status: true,
      moderationStatus: true,
      expiresAt: true,
    },
  });

  if (!listing || !isListingSeoIndexable(listing)) {
    return marketplaceOpenGraphImageResponse({
      title: "Anunț pe ClickAnunț",
      subtitle: "Vezi starea actuală pe site",
      footer: "clickanunt.ro",
    });
  }

  const loc = listing.city || listing.county || "";
  const currency = listing.priceCurrency?.trim() || "RON";

  return marketplaceOpenGraphImageResponse({
    title: listing.title.slice(0, 100),
    subtitle: `${listing.category.split(",")[0]?.trim() ?? listing.category}${loc ? ` · ${loc}` : ""}`,
    priceLine: formatListingPrice(listing.priceAmount, currency),
    footer: `clickanunt.ro/listings/${id}`,
  });
}

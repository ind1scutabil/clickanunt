import { prisma } from "@/lib/prisma";
import { normalizeListingPhotosArray } from "@/lib/listing-photo-url";

export async function ListingJsonLd({ listingId }: { listingId: string }) {
  if (process.env.USE_IN_MEMORY_DB === "true") {
    return null;
  }

  const listing = await prisma.listing.findFirst({
    where: { id: listingId, deletedAt: null, status: "active" },
    select: {
      id: true,
      title: true,
      description: true,
      priceAmount: true,
      priceCurrency: true,
      city: true,
      county: true,
      photos: true,
      updatedAt: true,
    },
  });

  if (!listing) {
    return null;
  }

  const normalizedPhotos = normalizeListingPhotosArray(listing.photos);
  const base = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "").replace(
    /\/$/,
    ""
  );
  let image: string | undefined;
  if (normalizedPhotos.length > 0) {
    const first = normalizedPhotos[0];
    if (first.startsWith("http://") || first.startsWith("https://")) {
      image = first;
    } else if (base && first.startsWith("/")) {
      image = `${base}${first}`;
    }
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    description: listing.description ?? undefined,
    sku: listing.id,
    image: image ? [image] : undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: listing.priceCurrency,
      price: (listing.priceAmount / 100).toFixed(2),
      availability: "https://schema.org/InStock",
      url: `${(process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "")}/listings/${listing.id}`,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

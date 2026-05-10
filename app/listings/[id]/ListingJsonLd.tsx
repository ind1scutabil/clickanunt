import { prisma } from "@/lib/prisma";
import { normalizeListingPhotosArray } from "@/lib/listing-photo-url";
import { generateBreadcrumbStructuredData } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site-url";
import { primarySlugForCategoryLabel } from "@/lib/seo/market-paths";
import { slugifyRo } from "@/lib/seo/slug";
import { isListingSeoIndexable } from "@/lib/seo/listing-seo-eligibility";

export async function ListingJsonLd({ listingId }: { listingId: string }) {
  if (process.env.USE_IN_MEMORY_DB === "true") {
    return null;
  }

  const listing = await prisma.listing.findFirst({
    where: { id: listingId },
    select: {
      id: true,
      title: true,
      category: true,
      city: true,
      description: true,
      priceAmount: true,
      priceCurrency: true,
      photos: true,
      updatedAt: true,
      createdAt: true,
      deletedAt: true,
      status: true,
      moderationStatus: true,
      expiresAt: true,
    },
  });

  if (!listing || !isListingSeoIndexable(listing)) {
    return null;
  }

  const normalizedPhotos = normalizeListingPhotosArray(listing.photos, absoluteUrl(""));
  const origin = absoluteUrl("");
  let image: string | undefined;
  if (normalizedPhotos.length > 0) {
    const first = normalizedPhotos[0];
    if (first.startsWith("http://") || first.startsWith("https://")) {
      image = first;
    } else if (first.startsWith("/")) {
      image = `${origin}${first}`;
    }
  }

  const itemUrl = absoluteUrl(`/listings/${listing.id}`);
  const productLd = {
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
      url: itemUrl,
      priceValidUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    },
    datePublished: listing.createdAt.toISOString(),
    dateModified: listing.updatedAt.toISOString(),
  };

  const crumbItems: Array<{ name: string; url: string }> = [
    { name: "Acasă", url: "/" },
    { name: "Anunțuri", url: "/listings" },
  ];

  const catSlug = primarySlugForCategoryLabel(listing.category);
  if (catSlug) {
    crumbItems.push({
      name: listing.category.split(",")[0]?.trim() ?? listing.category,
      url: `/${catSlug}`,
    });
  }
  if (catSlug && listing.city) {
    crumbItems.push({
      name: listing.city,
      url: `/${catSlug}/${slugifyRo(listing.city)}`,
    });
  }
  crumbItems.push({
    name: listing.title.slice(0, 96),
    url: `/listings/${listing.id}`,
  });

  const crumbs = generateBreadcrumbStructuredData(crumbItems);

  const scripts = [
    { id: "ld-product", payload: productLd },
    { id: "ld-breadcrumb", payload: crumbs },
  ];

  return (
    <>
      {scripts.map((s) => (
        <script
          key={s.id}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(s.payload) }}
        />
      ))}
    </>
  );
}

import { prisma } from "@/lib/prisma";
import { normalizeListingPhotosArray } from "@/lib/listing-photo-url";
import { generateBreadcrumbStructuredData } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site-url";
import { primarySlugForCategoryLabel } from "@/lib/seo/market-paths";
import { slugifyRo } from "@/lib/seo/slug";
import { isListingSeoIndexable, listingSchemaAvailabilityUrl } from "@/lib/seo/listing-seo-eligibility";
import {
  buildClassifiedOfferPolicyFields,
  buildListingProductIdentifierFields,
} from "@/lib/seo/listing-product-jsonld";
import type { Condition } from "@prisma/client";

function schemaItemConditionUrl(condition: Condition | null | undefined): string | undefined {
  if (!condition) return undefined;
  switch (condition) {
    case "new":
      return "https://schema.org/NewCondition";
    case "refurbished":
      return "https://schema.org/RefurbishedCondition";
    case "for_parts":
      return "https://schema.org/DamagedCondition";
    case "used":
    default:
      return "https://schema.org/UsedCondition";
  }
}

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
      make: true,
      model: true,
      vin: true,
      condition: true,
      updatedAt: true,
      createdAt: true,
      deletedAt: true,
      status: true,
      moderationStatus: true,
      expiresAt: true,
      owner: {
        select: {
          id: true,
          name: true,
          businessName: true,
          accountType: true,
        },
      },
    },
  });

  if (!listing || !isListingSeoIndexable(listing)) {
    return null;
  }

  const origin = absoluteUrl("");
  const normalizedPhotos = normalizeListingPhotosArray(listing.photos, origin);
  const images = normalizedPhotos
    .filter(Boolean)
    .slice(0, 12)
    .map((p) => (p.startsWith("http://") || p.startsWith("https://") ? p : `${origin}${p.startsWith("/") ? p : `/${p}`}`));

  const itemUrl = absoluteUrl(`/listings/${listing.id}`);
  const currency = (listing.priceCurrency?.trim() || "RON").toUpperCase();
  const availability = listingSchemaAvailabilityUrl(listing);
  const itemCondition = schemaItemConditionUrl(listing.condition);

  let seller: { "@type": "Organization"; name: string; url: string } | { "@type": "Person"; name: string; url: string } | undefined;
  if (listing.owner) {
    if (listing.owner.accountType === "business" && listing.owner.businessName?.trim()) {
      seller = {
        "@type": "Organization",
        name: listing.owner.businessName.trim(),
        url: absoluteUrl(`/users/${listing.owner.id}/profile`),
      };
    } else {
      seller = {
        "@type": "Person",
        name: listing.owner.name?.trim() || "Vânzător",
        url: absoluteUrl(`/users/${listing.owner.id}/profile`),
      };
    }
  }

  const offer: Record<string, unknown> = {
    "@type": "Offer",
    priceCurrency: currency,
    price: (listing.priceAmount / 100).toFixed(2),
    availability,
    url: itemUrl,
    priceValidUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    ...buildClassifiedOfferPolicyFields(),
  };
  if (seller) offer.seller = seller;

  const productLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    sku: listing.id,
    category: listing.category,
    url: itemUrl,
    offers: offer,
    datePublished: listing.createdAt.toISOString(),
    dateModified: listing.updatedAt.toISOString(),
    ...buildListingProductIdentifierFields({
      id: listing.id,
      title: listing.title,
      make: listing.make,
      model: listing.model,
      vin: listing.vin,
    }),
  };

  const desc = listing.description?.trim();
  if (desc) productLd.description = desc;
  if (images.length > 0) productLd.image = images;
  if (itemCondition) productLd.itemCondition = itemCondition;

  const shortCat = listing.category.split(",")[0]?.trim() ?? listing.category;
  const crumbItems: Array<{ name: string; url: string }> = [{ name: "Acasă", url: "/" }];
  const catSlug = primarySlugForCategoryLabel(listing.category);
  if (catSlug) {
    crumbItems.push({ name: shortCat, url: `/${catSlug}` });
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

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
    </>
  );
}

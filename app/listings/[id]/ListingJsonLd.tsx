import { prisma } from "@/lib/prisma";
import { normalizeListingPhotosArray } from "@/lib/listing-photo-url";
import { generateBreadcrumbStructuredData } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site-url";
import { buildListingBreadcrumbJsonLdItems } from "@/lib/seo/listing-breadcrumbs";
import { isListingSeoIndexable, listingSchemaAvailabilityUrl } from "@/lib/seo/listing-seo-eligibility";
import {
  buildClassifiedOfferPolicyFields,
  buildListingLocationPlace,
  buildListingProductIdentifierFields,
  buildVehicleProductFields,
} from "@/lib/seo/listing-product-jsonld";
import { listingJsonLdKindForCategory } from "@/lib/seo/listing-jsonld-policy";
import {
  buildCommercialOfferPriceFields,
  buildJobBaseSalaryJsonLd,
} from "@/lib/seo/listing-offer-jsonld";
import type { Condition } from "@prisma/client";
import type { ReactNode } from "react";

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
      subcategory: true,
      city: true,
      county: true,
      description: true,
      priceAmount: true,
      priceCurrency: true,
      priceType: true,
      salaryMin: true,
      salaryMax: true,
      salaryCurrency: true,
      salaryPeriod: true,
      photos: true,
      make: true,
      model: true,
      vin: true,
      year: true,
      mileage: true,
      fuel: true,
      transmission: true,
      condition: true,
      attributes: true,
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
  const availability = listingSchemaAvailabilityUrl(listing);
  const itemCondition = schemaItemConditionUrl(listing.condition);
  const kind = listingJsonLdKindForCategory(listing.category);
  const offerPrice = buildCommercialOfferPriceFields(listing);
  const jobBaseSalary = buildJobBaseSalaryJsonLd(listing);

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

  const locationPlace = buildListingLocationPlace({
    city: listing.city,
    county: listing.county,
  });

  // Same trail as the visible <nav aria-label="Breadcrumb"> — never diverge.
  const crumbs = generateBreadcrumbStructuredData(buildListingBreadcrumbJsonLdItems(listing));
  const desc = listing.description?.trim();

  const scripts: ReactNode[] = [
    <script key="crumbs" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />,
  ];

  if (kind === "job_posting") {
    const hiringOrg =
      seller?.["@type"] === "Organization"
        ? seller
        : {
            "@type": "Organization" as const,
            name: listing.owner?.businessName?.trim() || listing.owner?.name?.trim() || "Angajator",
            url: listing.owner
              ? absoluteUrl(`/users/${listing.owner.id}/profile`)
              : absoluteUrl("/"),
          };

    const jobLd: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "JobPosting",
      title: listing.title,
      datePosted: listing.createdAt.toISOString(),
      hiringOrganization: hiringOrg,
      url: itemUrl,
    };
    if (desc) jobLd.description = desc;
    if (images.length > 0) jobLd.image = images;
    if (listing.subcategory) jobLd.occupationalCategory = listing.subcategory;
    if (locationPlace) {
      jobLd.jobLocation = {
        "@type": "Place",
        address: locationPlace.address,
      };
    }
    const attrs =
      listing.attributes && typeof listing.attributes === "object" && !Array.isArray(listing.attributes)
        ? (listing.attributes as Record<string, unknown>)
        : {};
    if (typeof attrs.work_mode === "string") {
      const mode = attrs.work_mode.toLowerCase();
      if (mode.includes("remote")) jobLd.jobLocationType = "TELECOMMUTE";
    }
    if (jobBaseSalary) {
      jobLd.baseSalary = jobBaseSalary;
    }
    scripts.unshift(
      <script key="job" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jobLd) }} />
    );
  } else if (kind === "product_offer" || kind === "product_car") {
    const offer: Record<string, unknown> = {
      "@type": "Offer",
      availability,
      url: itemUrl,
      priceValidUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      ...buildClassifiedOfferPolicyFields(),
    };
    if (offerPrice) {
      offer.price = offerPrice.price;
      offer.priceCurrency = offerPrice.priceCurrency;
    }
    if (seller) offer.seller = seller;
    if (locationPlace) offer.availableAtOrFrom = locationPlace;

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

    if (desc) productLd.description = desc;
    if (images.length > 0) productLd.image = images;
    if (itemCondition) productLd.itemCondition = itemCondition;

    if (kind === "product_car") {
      const vehicleFields = buildVehicleProductFields({
        year: listing.year,
        mileage: listing.mileage,
        fuel: listing.fuel,
        transmission: listing.transmission,
      });
      if (Object.keys(vehicleFields).length > 0) {
        productLd["@type"] = ["Product", "Car"];
        Object.assign(productLd, vehicleFields);
      }
    }

    scripts.unshift(
      <script key="product" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }} />
    );
  }
  // omit_commercial → breadcrumbs only

  return <>{scripts}</>;
}

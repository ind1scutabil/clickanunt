import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ListingJsonLd } from "./ListingJsonLd";
import { ListingBreadcrumbsNav } from "./ListingBreadcrumbsNav";
import { ListingRelatedCrawlLinks } from "@/app/components/seo/ListingRelatedCrawlLinks";
import { formatListingCommercialOrSalaryLine } from "@/lib/format-listing-price";
import { prisma } from "@/lib/prisma";
import { createPageMetadata } from "@/lib/seo";
import { isListingSeoIndexable } from "@/lib/seo/listing-seo-eligibility";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (!id) {
    return createPageMetadata({
      title: "Anunț",
      description: "Detalii anunț ClickAnunț.",
      canonicalPath: "/listings",
    });
  }

  if (process.env.USE_IN_MEMORY_DB === "true") {
    return createPageMetadata({
      title: "Detalii anunț",
      description:
        "Vezi fotografiile, prețul, descrierea și datele de contact pentru acest anunț publicat pe ClickAnunț.",
      canonicalPath: `/listings/${id}`,
    });
  }

  const listing = await prisma.listing.findFirst({
    where: { id },
    select: {
      title: true,
      description: true,
      category: true,
      city: true,
      county: true,
      updatedAt: true,
      createdAt: true,
      priceAmount: true,
      priceCurrency: true,
      priceType: true,
      salaryMin: true,
      salaryMax: true,
      salaryCurrency: true,
      salaryPeriod: true,
      attributes: true,
      deletedAt: true,
      status: true,
      moderationStatus: true,
      expiresAt: true,
    },
  });

  if (!listing) {
    return createPageMetadata({
      title: "Anunț indisponibil",
      description: "Acest anunț nu există sau a fost eliminat.",
      canonicalPath: `/listings/${id}`,
      noindex: true,
    });
  }

  // Public metadata must not leak title/description/price for non-indexable rows
  // (deleted, paused, expired, pending, rejected, flagged). Owner still loads body via auth API.
  if (!isListingSeoIndexable(listing)) {
    return createPageMetadata({
      title: "Anunț indisponibil",
      description: "Acest anunț nu este disponibil public.",
      canonicalPath: `/listings/${id}`,
      noindex: true,
    });
  }

  const loc = listing.city || listing.county || "";
  const priceFormatted = formatListingCommercialOrSalaryLine({
    category: listing.category,
    priceType: listing.priceType,
    priceAmount: listing.priceAmount,
    priceCurrency: listing.priceCurrency,
    salaryMin: listing.salaryMin,
    salaryMax: listing.salaryMax,
    salaryCurrency: listing.salaryCurrency,
    salaryPeriod: listing.salaryPeriod,
    legacySalaryRange:
      listing.attributes &&
      typeof listing.attributes === "object" &&
      !Array.isArray(listing.attributes) &&
      typeof (listing.attributes as Record<string, unknown>).salary_range === "string"
        ? String((listing.attributes as Record<string, unknown>).salary_range)
        : null,
  });
  const priceLine = priceFormatted.suffix
    ? `${priceFormatted.primary} · ${priceFormatted.suffix}`
    : priceFormatted.primary;
  const ogImage = `/listings/${id}/opengraph-image`;

  const rawDesc = listing.description?.replace(/\s+/g, " ").trim() ?? "";
  const listingDescFallback = `Găsești «${listing.title}» (${listing.category})${loc ? ` în ${loc}` : ", România"} — ${priceLine}. Contactează vânzătorul pe ClickAnunț.`;
  const description =
    rawDesc.length >= 60
      ? `${rawDesc.slice(0, 158)}${rawDesc.length > 158 ? "…" : ""}`
      : listingDescFallback;

  const titleLead = `${listing.title} · ${priceLine}${loc ? ` · ${loc}` : ""}`;

  return createPageMetadata({
    title: titleLead,
    description,
    canonicalPath: `/listings/${id}`,
    keywords: ["ClickAnunț", listing.category, listing.city ?? "", listing.county ?? ""].filter(Boolean),
    ogType: "website",
    ogImage,
    modifiedTime: listing.updatedAt.toISOString(),
    publishedTime: listing.createdAt.toISOString(),
    noindex: false,
  });
}

export default async function ListingDetailLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      <ListingJsonLd listingId={id} />
      <ListingBreadcrumbsNav listingId={id} />
      {children}
      <ListingRelatedCrawlLinks listingId={id} />
    </>
  );
}

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ListingJsonLd } from "./ListingJsonLd";
import { prisma } from "@/lib/prisma";
import { createPageMetadata } from "@/lib/seo";
import { normalizeListingPhotosArray } from "@/lib/listing-photo-url";
import { absoluteUrl } from "@/lib/site-url";
import { isListingSeoIndexable } from "@/lib/seo/listing-seo-eligibility";

function formatListingPriceLine(priceAmount: number, priceCurrency: string): string {
  const major = Math.round(priceAmount / 100);
  if (priceCurrency === "RON") {
    return `${major.toLocaleString("ro-RO")} lei`;
  }
  return `${(priceAmount / 100).toFixed(2)} ${priceCurrency}`;
}

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
      photos: true,
      priceAmount: true,
      priceCurrency: true,
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

  const indexOk = isListingSeoIndexable(listing);
  const loc = listing.city || listing.county || "";
  const priceLine = formatListingPriceLine(listing.priceAmount, listing.priceCurrency);
  const imgs = normalizeListingPhotosArray(listing.photos, absoluteUrl(""));
  const ogImage = imgs[0] ?? "/images/og-default.jpg";

  const rawDesc = listing.description?.replace(/\s+/g, " ").trim() ?? "";
  const description =
    rawDesc.length > 0
      ? `${rawDesc.slice(0, 158)}${rawDesc.length > 158 ? "…" : ""}`
      : `Găsești «${listing.title}» (${listing.category})${loc ? ` în ${loc}` : ", România"} — ${priceLine}. Contactează vânzătorul pe ClickAnunț.`;

  const titleLead = indexOk
    ? `${listing.title} · ${priceLine}${loc ? ` · ${loc}` : ""}`
    : `${listing.title} — anunț indisponibil public`;

  return createPageMetadata({
    title: titleLead,
    description,
    canonicalPath: `/listings/${id}`,
    keywords: ["ClickAnunț", listing.category, listing.city ?? "", listing.county ?? ""].filter(Boolean),
    ogType: "website",
    ogImage,
    modifiedTime: listing.updatedAt.toISOString(),
    publishedTime: listing.createdAt.toISOString(),
    noindex: !indexOk,
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
      {children}
    </>
  );
}

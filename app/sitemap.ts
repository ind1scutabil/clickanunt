import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

function baseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = baseUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/listings`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
  ];

  if (process.env.USE_IN_MEMORY_DB === "true") {
    return staticRoutes;
  }

  const listings = await prisma.listing.findMany({
    where: { status: "active", deletedAt: null },
    select: { id: true, updatedAt: true },
    take: 50000,
    orderBy: { updatedAt: "desc" },
  });

  const listingRoutes: MetadataRoute.Sitemap = listings.map((l) => ({
    url: `${base}/listings/${l.id}`,
    lastModified: l.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...listingRoutes];
}

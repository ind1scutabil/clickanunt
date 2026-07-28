/** @jest-environment node */
import { readFileSync } from "fs";
import path from "path";
import { TAXONOMY } from "@/lib/taxonomy";
import {
  EMPTY_FOOTER_LINKS,
  buildFooterCategoryLinks,
  buildFooterIndexableLinksFromPairs,
  loadFooterIndexableLinksForTest,
} from "@/lib/seo/footer-indexable-links";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    listing: {
      groupBy: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

describe("footer indexable links", () => {
  const src = readFileSync(
    path.join(process.cwd(), "lib/seo/footer-indexable-links.ts"),
    "utf8",
  );
  const layoutSrc = readFileSync(path.join(process.cwd(), "app/layout.tsx"), "utf8");
  const footerSrc = readFileSync(
    path.join(process.cwd(), "app/components/Footer.tsx"),
    "utf8",
  );

  beforeEach(() => {
    jest.mocked(prisma.listing.groupBy).mockReset();
  });

  it("uses a single groupBy aggregation (no N+1 / no findMany / no fetch)", () => {
    const groupByCalls = src.match(/\.groupBy\(/g) ?? [];
    expect(groupByCalls.length).toBe(1);
    expect(src).toContain('by: ["category", "city"]');
    expect(src).not.toContain("findMany");
    expect(src).not.toContain("fetch(");
  });

  it("fail-soft: DB error returns empty links (page stays 200)", async () => {
    jest.mocked(prisma.listing.groupBy).mockRejectedValueOnce(new Error("db down"));
    const result = await loadFooterIndexableLinksForTest();
    expect(result).toEqual(EMPTY_FOOTER_LINKS);
    expect(result.categories).toEqual([]);
    expect(result.cities).toEqual([]);
  });

  it("categories: always the full taxonomy (same source as nav menu + sitemap-categories.xml), regardless of inventory", () => {
    const links = buildFooterCategoryLinks();
    expect(links.length).toBe(TAXONOMY.length);
    // All 12 canonical slugs present, including ones with typically low inventory.
    for (const cat of TAXONOMY) {
      expect(links.some((l) => l.href === `/${cat.slug}`)).toBe(true);
    }
    // Sorted alphabetically by (short) label.
    const labels = links.map((l) => l.label);
    const sorted = [...labels].sort((a, b) => a.localeCompare(b, "ro"));
    expect(labels).toEqual(sorted);
  });

  it("buildFooterIndexableLinksFromPairs also returns the full taxonomy for categories, independent of pairs", () => {
    const links = buildFooterIndexableLinksFromPairs([]);
    expect(links.categories.length).toBe(TAXONOMY.length);
    expect(links.categories.some((l) => l.href === "/auto")).toBe(true);
    expect(links.categories.some((l) => l.href.includes("moda"))).toBe(true);
  });

  it("cities: aggregated sitewide (summed across categories), threshold >=1, sorted desc, capped at 10", () => {
    const links = buildFooterIndexableLinksFromPairs([
      { category: "Auto, moto și ambarcațiuni", city: "București", _count: { _all: 2 } },
      { category: "Imobiliare", city: "București", _count: { _all: 1 } },
      { category: "Auto, moto și ambarcațiuni", city: "Cluj-Napoca", _count: { _all: 3 } },
      { category: "Electronice și electrocasnice", city: "Sibiu", _count: { _all: 1 } },
      { category: "Modă și frumusețe", city: null, _count: { _all: 0 } },
    ]);
    // București: 2+1=3 (aggregated across categories) > Cluj-Napoca: 3 > Sibiu: 1
    expect(links.cities.map((c) => c.label)).toEqual(["București", "Cluj-Napoca", "Sibiu"]);
    expect(links.cities.find((c) => c.label === "București")?.href).toBe(
      `/listings?city=${encodeURIComponent("București")}`,
    );
  });

  it("cities: a single listing (count 1) is enough to appear (no thin-content risk — plain search link, not an indexed hub)", () => {
    const links = buildFooterIndexableLinksFromPairs([
      { category: "Servicii și afaceri", city: "Oradea", _count: { _all: 1 } },
    ]);
    expect(links.cities.some((c) => c.label === "Oradea")).toBe(true);
  });

  it("cities: capped at top 10 by count", () => {
    const byPair = Array.from({ length: 15 }, (_, i) => ({
      category: "Auto, moto și ambarcațiuni",
      city: `Oraș${i}`,
      _count: { _all: 15 - i },
    }));
    const links = buildFooterIndexableLinksFromPairs(byPair);
    expect(links.cities.length).toBe(10);
    expect(links.cities[0]?.label).toBe("Oraș0");
  });

  it("empty DB → full taxonomy categories, empty cities", () => {
    const links = buildFooterIndexableLinksFromPairs([]);
    expect(links.categories.length).toBe(TAXONOMY.length);
    expect(links.cities).toEqual([]);
  });

  it("builder output has no PII fields", () => {
    const links = buildFooterIndexableLinksFromPairs([
      { category: "Auto, moto și ambarcațiuni", city: "București", _count: { _all: 5 } },
    ]);
    const serialized = JSON.stringify(links);
    expect(serialized).not.toMatch(/email|phone|ownerUserId|contactPhone/i);
    expect(links.categories[0]).toEqual(
      expect.objectContaining({ slug: expect.any(String), href: expect.any(String), label: expect.any(String) }),
    );
  });

  it("errors are caught inside cached loader (not thrown to cache layer)", () => {
    expect(src).toContain("loadFooterIndexableLinksSafe");
    expect(src).toMatch(/catch\s*\(/);
    expect(src).toContain("return EMPTY_FOOTER_LINKS");
  });

  it("root layout + Footer hide hubs when empty but keep static legal links", () => {
    expect(layoutSrc).toContain("getFooterIndexableLinks");
    expect(footerSrc).toContain("showHubStrip");
    expect(footerSrc).toContain("/terms");
    expect(footerSrc).toContain("/privacy");
    expect(footerSrc).toContain("/contact");
  });
});

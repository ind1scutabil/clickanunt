/** @jest-environment node */
import { readFileSync } from "fs";
import path from "path";
import { MIN_INDEXABLE_HUB_LISTINGS } from "@/lib/seo/hub-index-policy";
import {
  EMPTY_FOOTER_LINKS,
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

  it("fail-soft: DB error returns empty hubs (page stays 200)", async () => {
    jest.mocked(prisma.listing.groupBy).mockRejectedValueOnce(new Error("db down"));
    const result = await loadFooterIndexableLinksForTest();
    expect(result).toEqual(EMPTY_FOOTER_LINKS);
    expect(result.categories).toEqual([]);
    expect(result.cityHubs).toEqual([]);
  });

  it("0 and 2 → absent; 3+ → present", () => {
    const links = buildFooterIndexableLinksFromPairs([
      { category: "Auto, moto și ambarcațiuni", city: "București", _count: { _all: 2 } },
      { category: "Auto, moto și ambarcațiuni", city: "Cluj-Napoca", _count: { _all: 3 } },
      { category: "Modă și frumusețe", city: null, _count: { _all: 0 } },
    ]);
    expect(MIN_INDEXABLE_HUB_LISTINGS).toBe(3);
    expect(links.cityHubs.some((l) => l.href.includes("cluj"))).toBe(true);
    expect(links.cityHubs.some((l) => l.href.includes("bucuresti"))).toBe(false);
    // category Auto has 2+3=5 ≥ 3
    expect(links.categories.some((l) => l.href === "/auto")).toBe(true);
    expect(links.categories.some((l) => l.href.includes("moda"))).toBe(false);
  });

  it("empty DB → empty hubs", () => {
    expect(buildFooterIndexableLinksFromPairs([])).toEqual(EMPTY_FOOTER_LINKS);
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

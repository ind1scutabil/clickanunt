/**
 * Related listings price band must stay currency-safe (F12C-T1 / FAZA 12D).
 * Creates isolated fixtures via Prisma; soft-deletes on cleanup.
 */
import { test, expect } from "@playwright/test";
import { PrismaClient, type PriceType } from "@prisma/client";

const MARKER = `F12D-related-${Date.now().toString(36)}`;

async function softDeleteIds(prisma: PrismaClient, ids: string[]) {
  if (ids.length === 0) return;
  await prisma.listing.updateMany({
    where: { id: { in: ids } },
    data: { deletedAt: new Date(), status: "deleted" },
  });
}

test.describe("Related listings currency-safe band", () => {
  test("RON source excludes EUR inside numeric ±25% band", async ({ page }) => {
    const prisma = new PrismaClient();
    const createdIds: string[] = [];
    try {
      const owner = await prisma.user.findFirst({
        where: { deletedAt: null },
        select: { id: true },
      });
      expect(owner).toBeTruthy();

      const category = "Electronice și electrocasnice";
      const subcategory = "Telefoane mobile";
      const city = "Cluj-Napoca";
      const county = "Cluj";
      const base = {
        ownerUserId: owner!.id,
        category,
        subcategory,
        city,
        county,
        status: "active" as const,
        moderationStatus: "approved" as const,
        deletedAt: null,
        expiresAt: null,
        description:
          "Fixture FAZA 12D related currency — descriere suficient de lunga pentru indexare SEO.",
        photos: [] as string[],
      };

      const source = await prisma.listing.create({
        data: {
          ...base,
          title: `${MARKER} SRC RON 1000 FIXED`,
          priceType: "FIXED" as PriceType,
          priceAmount: 1000,
          priceCurrency: "RON",
        },
        select: { id: true },
      });
      createdIds.push(source.id);

      const candidates: Array<{
        title: string;
        priceType: PriceType | null;
        priceAmount: number | null;
        priceCurrency: string | null;
        status?: "active" | "paused";
        moderationStatus?: "approved" | "rejected" | "pending";
        expiresAt?: Date | null;
        category?: string;
        expectInBand: boolean;
      }> = [
        {
          title: `${MARKER} RON 800 FIXED`,
          priceType: "FIXED",
          priceAmount: 800,
          priceCurrency: "RON",
          expectInBand: true,
        },
        {
          title: `${MARKER} RON 1200 NEGOTIABLE`,
          priceType: "NEGOTIABLE",
          priceAmount: 1200,
          priceCurrency: "RON",
          expectInBand: true,
        },
        {
          title: `${MARKER} RON 1250 FROM`,
          priceType: "FROM",
          priceAmount: 1250,
          priceCurrency: "RON",
          expectInBand: true,
        },
        {
          title: `${MARKER} RON 1300 FIXED out`,
          priceType: "FIXED",
          priceAmount: 1300,
          priceCurrency: "RON",
          expectInBand: false,
        },
        {
          title: `${MARKER} EUR 900 FIXED trap`,
          priceType: "FIXED",
          priceAmount: 900,
          priceCurrency: "EUR",
          expectInBand: false,
        },
        {
          title: `${MARKER} FREE trap`,
          priceType: "FREE",
          priceAmount: null,
          priceCurrency: null,
          expectInBand: false,
        },
        {
          title: `${MARKER} ON_REQUEST trap`,
          priceType: "ON_REQUEST",
          priceAmount: null,
          priceCurrency: null,
          expectInBand: false,
        },
        {
          title: `${MARKER} RON legacy null type 1100`,
          priceType: null,
          priceAmount: 1100,
          priceCurrency: "RON",
          expectInBand: true,
        },
        {
          title: `${MARKER} other category`,
          priceType: "FIXED",
          priceAmount: 1000,
          priceCurrency: "RON",
          category: "Casă și grădină",
          expectInBand: false,
        },
        {
          title: `${MARKER} paused`,
          priceType: "FIXED",
          priceAmount: 1000,
          priceCurrency: "RON",
          status: "paused",
          expectInBand: false,
        },
        {
          title: `${MARKER} expired`,
          priceType: "FIXED",
          priceAmount: 1000,
          priceCurrency: "RON",
          expiresAt: new Date(Date.now() - 86400000),
          expectInBand: false,
        },
        {
          title: `${MARKER} rejected`,
          priceType: "FIXED",
          priceAmount: 1000,
          priceCurrency: "RON",
          moderationStatus: "rejected",
          expectInBand: false,
        },
      ];

      for (const c of candidates) {
        const row = await prisma.listing.create({
          data: {
            ...base,
            title: c.title,
            category: c.category ?? category,
            priceType: c.priceType,
            priceAmount: c.priceAmount,
            priceCurrency: c.priceCurrency,
            status: c.status ?? "active",
            moderationStatus: c.moderationStatus ?? "approved",
            expiresAt: c.expiresAt === undefined ? null : c.expiresAt,
          },
          select: { id: true },
        });
        createdIds.push(row.id);
      }

      await page.goto(`/listings/${source.id}`, { waitUntil: "domcontentloaded" });
      const section = page.locator("#related-listings-seo");
      await expect(section).toBeVisible({ timeout: 15000 });
      const relatedRoot = page.locator('[aria-labelledby="related-listings-seo"]');
      await expect(relatedRoot).toHaveAttribute("data-related-price-band", "1");

      const hrefs = await relatedRoot.locator("a[href^='/listings/']").all();
      expect(hrefs.length).toBeGreaterThan(0);
      const texts = (
        await Promise.all(hrefs.map((a) => a.innerText()))
      ).join("\n");

      expect(texts).toContain(`${MARKER} RON 800 FIXED`);
      expect(texts).toContain(`${MARKER} RON 1200 NEGOTIABLE`);
      expect(texts).not.toContain(`${MARKER} EUR 900 FIXED trap`);
      expect(texts).not.toContain(`${MARKER} FREE trap`);
      expect(texts).not.toContain(`${MARKER} ON_REQUEST trap`);
      expect(texts).not.toContain(`${MARKER} RON 1300 FIXED out`);
      expect(texts).not.toContain(`${MARKER} other category`);
      expect(texts).not.toContain(`${MARKER} paused`);
      expect(texts).not.toContain(`${MARKER} expired`);
      expect(texts).not.toContain(`${MARKER} rejected`);
      expect(texts).not.toContain(`${MARKER} SRC RON 1000 FIXED`);
    } finally {
      await softDeleteIds(prisma, createdIds);
      await prisma.$disconnect();
    }
  });

  test("EUR source excludes RON inside numeric ±25% band", async ({ page }) => {
    const prisma = new PrismaClient();
    const createdIds: string[] = [];
    try {
      const owner = await prisma.user.findFirst({
        where: { deletedAt: null },
        select: { id: true },
      });
      expect(owner).toBeTruthy();

      const category = "Electronice și electrocasnice";
      const base = {
        ownerUserId: owner!.id,
        category,
        subcategory: "Telefoane mobile",
        city: "Cluj-Napoca",
        county: "Cluj",
        status: "active" as const,
        moderationStatus: "approved" as const,
        deletedAt: null,
        expiresAt: null,
        description:
          "Fixture FAZA 12D related EUR — descriere suficient de lunga pentru indexare SEO.",
        photos: [] as string[],
      };

      const source = await prisma.listing.create({
        data: {
          ...base,
          title: `${MARKER} SRC EUR 1000 FIXED`,
          priceType: "FIXED" as PriceType,
          priceAmount: 1000,
          priceCurrency: "EUR",
        },
        select: { id: true },
      });
      createdIds.push(source.id);

      // Need ≥4 same-currency peers so the ±25% band does not fall back to taxonomy.
      for (const c of [
        { title: `${MARKER} EUR 900 peer`, priceAmount: 900, priceCurrency: "EUR" },
        { title: `${MARKER} EUR 950 peer`, priceAmount: 950, priceCurrency: "EUR" },
        { title: `${MARKER} EUR 1000 peer`, priceAmount: 1000, priceCurrency: "EUR" },
        { title: `${MARKER} EUR 1100 peer`, priceAmount: 1100, priceCurrency: "EUR" },
        { title: `${MARKER} EUR 1200 peer`, priceAmount: 1200, priceCurrency: "EUR" },
        {
          title: `${MARKER} RON 900 trap-vs-eur`,
          priceAmount: 900,
          priceCurrency: "RON",
        },
      ]) {
        const row = await prisma.listing.create({
          data: {
            ...base,
            title: c.title,
            priceType: "FIXED" as PriceType,
            priceAmount: c.priceAmount,
            priceCurrency: c.priceCurrency,
          },
          select: { id: true },
        });
        createdIds.push(row.id);
      }

      await page.goto(`/listings/${source.id}`, { waitUntil: "domcontentloaded" });
      const relatedRoot = page.locator('[aria-labelledby="related-listings-seo"]');
      await expect(relatedRoot).toBeVisible({ timeout: 15000 });
      await expect(relatedRoot).toHaveAttribute("data-related-price-band", "1");
      const texts = await relatedRoot.innerText();
      expect(texts).toContain(`${MARKER} EUR 900 peer`);
      expect(texts).not.toContain(`${MARKER} RON 900 trap-vs-eur`);
    } finally {
      await softDeleteIds(prisma, createdIds);
      await prisma.$disconnect();
    }
  });
});

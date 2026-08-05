/**
 * Seller phone privacy — absent from public DTO; reveal via dedicated endpoint.
 */
import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

test.describe("Seller phone privacy / reveal", () => {
  test("public detail DTO has no contactPhone; reveal returns number once", async ({
    request,
  }) => {
    const prisma = new PrismaClient();
    let listingId: string | null = null;
    try {
      const owner = await prisma.user.findFirst({
        where: { deletedAt: null, isBanned: false },
        select: { id: true },
      });
      expect(owner).toBeTruthy();

      const created = await prisma.listing.create({
        data: {
          ownerUserId: owner!.id,
          title: `E2E phone privacy ${Date.now()}`,
          description:
            "Fixture FAZA 13B phone privacy — descriere suficient de lunga pentru eligibilitate.",
          category: "Electronice și electrocasnice",
          subcategory: "Telefoane mobile",
          city: "Cluj-Napoca",
          county: "Cluj",
          status: "active",
          moderationStatus: "approved",
          deletedAt: null,
          expiresAt: null,
          photos: [],
          priceType: "FIXED",
          priceAmount: 999,
          priceCurrency: "RON",
          contactPhone: "0722111222",
        },
        select: { id: true },
      });
      listingId = created.id;

      const detail = await request.get(`/api/listings/${listingId}`);
      expect(detail.ok()).toBeTruthy();
      const detailBody = await detail.json();
      expect(detailBody).not.toHaveProperty("contactPhone");
      expect(detailBody.hasContactPhone).toBe(true);
      expect(JSON.stringify(detailBody)).not.toContain("0722111222");

      const html = await request.get(`/listings/${listingId}`);
      expect(html.ok()).toBeTruthy();
      const htmlText = await html.text();
      expect(htmlText).not.toContain("0722111222");

      const reveal = await request.get(`/api/listings/${listingId}/contact-phone`);
      expect(reveal.ok()).toBeTruthy();
      expect(reveal.headers()["cache-control"] || "").toMatch(/no-store/i);
      const revealed = await reveal.json();
      expect(revealed.hasPhone).toBe(true);
      expect(revealed.phone).toMatch(/0722/);
      expect(revealed.telHref).toMatch(/0722111222/);

      const paused = await prisma.listing.update({
        where: { id: listingId },
        data: { status: "paused" },
        select: { id: true },
      });
      expect(paused.id).toBe(listingId);
      const denied = await request.get(`/api/listings/${listingId}/contact-phone`);
      expect(denied.status()).toBe(404);
      const deniedBody = await denied.json();
      expect(deniedBody.phone).toBeUndefined();
    } finally {
      if (listingId) {
        await prisma.listing.updateMany({
          where: { id: listingId },
          data: { deletedAt: new Date(), status: "deleted" },
        });
      }
      await prisma.$disconnect();
    }
  });

  test("UI reveal button loads phone without preloading number in DOM", async ({
    page,
  }) => {
    const prisma = new PrismaClient();
    let listingId: string | null = null;
    try {
      const owner = await prisma.user.findFirst({
        where: { deletedAt: null, isBanned: false },
        select: { id: true },
      });
      expect(owner).toBeTruthy();
      const created = await prisma.listing.create({
        data: {
          ownerUserId: owner!.id,
          title: `E2E phone UI ${Date.now()}`,
          description:
            "Fixture FAZA 13B phone UI — descriere suficient de lunga pentru eligibilitate.",
          category: "Electronice și electrocasnice",
          subcategory: "Telefoane mobile",
          city: "Cluj-Napoca",
          county: "Cluj",
          status: "active",
          moderationStatus: "approved",
          deletedAt: null,
          expiresAt: null,
          photos: [],
          priceType: "FIXED",
          priceAmount: 888,
          priceCurrency: "RON",
          contactPhone: "0733111444",
        },
        select: { id: true },
      });
      listingId = created.id;

      await page.goto(`/listings/${listingId}`);
      await expect(page.getByRole("button", { name: /Afișează telefon/i })).toBeVisible({
        timeout: 20_000,
      });
      const before = await page.content();
      expect(before).not.toContain("0733111444");

      const revealResp = page.waitForResponse(
        (r) =>
          r.url().includes(`/api/listings/${listingId}/contact-phone`) &&
          r.request().method() === "GET",
        { timeout: 20_000 }
      );
      await page.getByRole("button", { name: /Afișează telefon/i }).click();
      const resp = await revealResp;
      expect(resp.ok()).toBeTruthy();
      await expect(page.getByRole("link", { name: /0733/ })).toBeVisible({
        timeout: 10_000,
      });
      const href = await page.getByRole("link", { name: /0733/ }).getAttribute("href");
      expect(href).toMatch(/^tel:/);
    } finally {
      if (listingId) {
        await prisma.listing.updateMany({
          where: { id: listingId },
          data: { deletedAt: new Date(), status: "deleted" },
        });
      }
      await prisma.$disconnect();
    }
  });
});

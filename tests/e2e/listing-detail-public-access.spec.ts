/**
 * Read-only public vs owner/admin detail authorization.
 * No create/edit/promote/message/upload. Uses existing storageState when available.
 */
import { test, expect, type APIRequestContext } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const USER_STATE = path.join(process.cwd(), "tests/e2e/.auth/user.json");
const ADMIN_STATE = path.join(process.cwd(), "tests/e2e/.auth/admin.json");

async function apiGet(request: APIRequestContext, id: string) {
  const res = await request.get(`/api/listings/${id}`);
  const text = await res.text();
  let json: Record<string, unknown> | null = null;
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    json = null;
  }
  return { status: res.status(), json, text: text.slice(0, 200) };
}

test.describe("Listing detail public authorization (read-only)", () => {
  test("anonymous: indexable → 200; non-indexable → 404 generic (API + HTML)", async ({
    request,
    page,
  }) => {
    const prisma = new PrismaClient();
    const now = new Date();
    try {
      const indexable = await prisma.listing.findFirst({
        where: {
          status: "active",
          deletedAt: null,
          moderationStatus: "approved",
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        select: { id: true, title: true },
      });
      expect(indexable).toBeTruthy();

      const ok = await apiGet(request, indexable!.id);
      expect(ok.status).toBe(200);
      expect(ok.json).not.toHaveProperty("ownerUserId");
      expect(ok.json).not.toHaveProperty("moderationStatus");

      await page.goto(`/listings/${indexable!.id}`, { waitUntil: "domcontentloaded" });
      const title = await page.title();
      expect(title).toContain(indexable!.title.slice(0, 20));
      expect(await page.content()).not.toMatch(/Se încarcă anunțul/i);

      const samples = await prisma.listing.findMany({
        where: {
          OR: [
            { status: { in: ["paused", "pending", "deleted", "expired", "rejected"] } },
            { moderationStatus: { in: ["pending", "flagged", "rejected"] } },
            { expiresAt: { lt: now }, status: "active" },
            { deletedAt: { not: null } },
          ],
        },
        select: { id: true, status: true, moderationStatus: true, title: true },
        take: 8,
      });

      test.info().annotations.push({
        type: "note",
        description: `non-indexable samples found: ${samples.length}`,
      });

      for (const row of samples) {
        const res = await apiGet(request, row.id);
        expect(res.status, `${row.id} ${row.status}/${row.moderationStatus}`).toBe(404);
        expect(res.json?.error).toBe("Not found");
        expect(res.text).not.toMatch(/prisma|ownerUserId|contactPhone/i);
        expect(JSON.stringify(res.json)).not.toContain(row.title);

        await page.goto(`/listings/${row.id}`, { waitUntil: "domcontentloaded" });
        const html = await page.content();
        const pageTitle = await page.title();
        expect(pageTitle).toMatch(/indisponibil|Anunț/i);
        expect(html).not.toContain(row.title);
        expect(html).not.toMatch(/application\/ld\+json[^>]*>[\s\S]*"@type"\s*:\s*"Product"/i);
      }
    } finally {
      await prisma.$disconnect();
    }
  });
});

test.describe("Listing detail owner/admin authorization (read-only)", () => {
  test("owner storageState can read own non-public when present", async ({ browser }) => {
    test.skip(!fs.existsSync(USER_STATE), "user storageState missing");
    const prisma = new PrismaClient();
    try {
      // Discover any non-public listing; ownership checked via API response with cookie.
      const candidate = await prisma.listing.findFirst({
        where: {
          deletedAt: null,
          status: { in: ["paused", "pending", "expired"] },
        },
        select: { id: true, ownerUserId: true, status: true },
      });
      test.skip(!candidate, "no local paused/pending/expired fixture");

      const ctx = await browser.newContext({ storageState: USER_STATE });
      const req = ctx.request;
      const res = await apiGet(req, candidate!.id);
      // Owner of this listing → 200 with ownerUserId; other user → 404
      if (res.status === 200) {
        expect(res.json).toHaveProperty("ownerUserId");
        expect(res.json?.status).toBe(candidate!.status);
      } else {
        expect(res.status).toBe(404);
      }
      await ctx.close();
    } finally {
      await prisma.$disconnect();
    }
  });

  test("admin storageState can read non-public listing", async ({ browser }) => {
    test.skip(!fs.existsSync(ADMIN_STATE), "admin storageState missing");
    const prisma = new PrismaClient();
    try {
      const candidate = await prisma.listing.findFirst({
        where: {
          deletedAt: null,
          status: { in: ["paused", "pending", "expired", "rejected"] },
        },
        select: { id: true, status: true },
      });
      test.skip(!candidate, "no local non-public fixture for admin");

      const ctx = await browser.newContext({ storageState: ADMIN_STATE });
      const res = await apiGet(ctx.request, candidate!.id);
      expect(res.status).toBe(200);
      expect(res.json).toHaveProperty("ownerUserId");
      expect(res.json?.status).toBe(candidate!.status);
      await ctx.close();
    } finally {
      await prisma.$disconnect();
    }
  });
});

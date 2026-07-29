import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

/**
 * FAZA 22 — homepage "N anunțuri în catalog" must reflect the canonical public
 * listing count and update on the very next request after a lifecycle mutation
 * (on-demand revalidation), not just after the passive 5-minute ISR window.
 *
 * Uses the seeded local admin (see prisma/seed.ts) to drive real lifecycle
 * transitions through the real API, then reads the real homepage HTML.
 */

const prisma = new PrismaClient();

async function csrf(request: APIRequestContext): Promise<string> {
  const res = await request.get("/api/csrf");
  expect(res.ok()).toBeTruthy();
  const data = (await res.json()) as { csrfToken?: string };
  expect(data.csrfToken).toBeTruthy();
  return data.csrfToken!;
}

function extractBadgeCount(html: string): number | null {
  const m = html.match(/([\d.]+)\s*anun[țt]uri în catalog/);
  return m ? Number(m[1].replace(/\./g, "")) : null;
}

async function getHomepageBadge(page: Page) {
  const res = await page.goto("/", { waitUntil: "domcontentloaded" });
  const html = await page.content();
  return {
    count: extractBadgeCount(html),
    cacheControl: res?.headers()["cache-control"] ?? null,
  };
}

test.describe("Homepage catalog count — lifecycle + on-demand revalidation", () => {
  test.skip(
    !process.env.CLICKANUNT_E2E_SERVER,
    "Requires a local server seeded with the admin@clickanunt.ro fixture (see prisma/seed.ts).",
  );

  let fixtureListingId: string | null = null;

  test.afterEach(async () => {
    if (fixtureListingId) {
      await prisma.moderationQueue.deleteMany({ where: { listingId: fixtureListingId } });
      await prisma.listing.deleteMany({ where: { id: fixtureListingId } });
      fixtureListingId = null;
    }
  });

  test("homepage Cache-Control forces revalidation on every navigation (no 1h browser cache)", async ({ page }) => {
    const { cacheControl } = await getHomepageBadge(page);
    expect(cacheControl).toBe("public, max-age=0, must-revalidate");
  });

  test("approve → homepage count +1 immediately; pause → homepage count -1 immediately", async ({
    page,
    request,
  }) => {
    const before = await getHomepageBadge(page);
    expect(before.count).not.toBeNull();

    const loginToken = await csrf(request);
    const loginRes = await request.post("/api/auth/login", {
      data: { email: "admin@clickanunt.ro", password: "admin123" },
      headers: { "x-csrf-token": loginToken },
    });
    expect(loginRes.ok(), await loginRes.text()).toBeTruthy();
    const { user } = (await loginRes.json()) as { user?: { id?: string } };
    expect(user?.id).toBeTruthy();

    const fixture = await prisma.listing.create({
      data: {
        owner: { connect: { id: user!.id! } },
        title: "FAZA22 E2E lifecycle fixture — DO NOT SHOW",
        category: "Electronice și electrocasnice",
        subcategory: "Telefoane mobile",
        condition: "used",
        status: "pending",
        moderationStatus: "pending",
        description: "FAZA22 E2E lifecycle fixture, safe to delete.",
        county: "Bucuresti",
        city: "București",
        region: "Bucuresti",
        photos: [],
        priceType: "FIXED",
        priceAmount: 100,
        priceCurrency: "RON",
      },
    });
    fixtureListingId = fixture.id;

    const queueItem = await prisma.moderationQueue.create({
      data: { listingId: fixture.id, status: "pending" },
    });

    // Pending listing must not move the public count.
    const afterCreate = await getHomepageBadge(page);
    expect(afterCreate.count).toBe(before.count);

    // Approve → +1, reflected on the very next homepage request.
    const approveToken = await csrf(request);
    const approveRes = await request.post(`/api/admin/moderation/${queueItem.id}/approve`, {
      headers: { "x-csrf-token": approveToken },
    });
    expect(approveRes.ok(), await approveRes.text()).toBeTruthy();

    const afterApprove = await getHomepageBadge(page);
    expect(afterApprove.count).toBe((before.count ?? 0) + 1);

    // Pause (admin PATCH) → -1, reflected on the very next homepage request.
    const pauseToken = await csrf(request);
    const pauseRes = await request.patch(`/api/listings/${fixture.id}`, {
      data: { status: "paused" },
      headers: { "x-csrf-token": pauseToken },
    });
    expect(pauseRes.ok(), await pauseRes.text()).toBeTruthy();

    const afterPause = await getHomepageBadge(page);
    expect(afterPause.count).toBe(before.count);
  });
});

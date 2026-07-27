import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

/**
 * Verifică fluxul REAL: buyer (UI fir anunț) → seller (inbox + poll), apoi seller → buyer.
 *
 * Pornește dev pe același port ca `PLAYWRIGHT_BASE_URL` sau default config (implicit 3000).
 * Cu server deja rulat:
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3004 npm run test:e2e:messaging
 *
 * Conturi implicit = seed prisma (poți override):
 *   E2E_MESSAGING_BUYER_EMAIL / *_PASSWORD — default user@example.com / Password123!
 *   E2E_MESSAGING_SELLER_EMAIL / *_PASSWORD — default alice@example.com / alice123
 */

test.describe.configure({ mode: "serial", timeout: 120_000 });

async function loginEmailPassword(
  page: import("@playwright/test").Page,
  email: string,
  password: string
) {
  await page.goto("/auth/login");
  const acceptCookies = page.getByRole("button", { name: /^Acceptă$/i });
  if (await acceptCookies.isVisible().catch(() => false)) {
    await acceptCookies.click();
  }
  // Preferințele cookie pot lăsa un al doilea input email în DOM — țintim formularul de login.
  const loginForm = page.locator("form").filter({ has: page.locator('button[type="submit"]') }).first();
  await loginForm.locator('input[type="email"]').fill(email);
  await loginForm.locator('input[type="password"]').fill(password);
  await loginForm.locator('button[type="submit"]').click();
  await page.waitForURL((u) => !u.pathname.startsWith("/auth/login"), {
    timeout: 45_000,
  });
}

test("DB+API+browser: buyer trimite din fir anunț; seller vede în inbox; răspuns revine la buyer", async ({
  browser,
}, testInfo) => {
  const buyerEmail =
    process.env.E2E_MESSAGING_BUYER_EMAIL || "user@example.com";
  const buyerPassword =
    process.env.E2E_MESSAGING_BUYER_PASSWORD || "Password123!";
  const sellerEmail =
    process.env.E2E_MESSAGING_SELLER_EMAIL || "alice@example.com";
  const sellerPassword =
    process.env.E2E_MESSAGING_SELLER_PASSWORD || "alice123";

  const baseURL =
    (typeof testInfo.project.use.baseURL === "string" && testInfo.project.use.baseURL) ||
    process.env.PLAYWRIGHT_BASE_URL ||
    "http://127.0.0.1:3000";

  const ctxBuyer = await browser.newContext({ baseURL });
  const ctxSeller = await browser.newContext({ baseURL });
  const buyerPage = await ctxBuyer.newPage();
  const sellerPage = await ctxSeller.newPage();
  let createdFixtureId: string | null = null;

  try {
    /* ---- Login ambele conturi (localStorage + cookies ca în browser real) ---- */
    try {
      await loginEmailPassword(buyerPage, buyerEmail, buyerPassword);
    } catch {
      test.skip(true, `Login buyer eșuat pentru ${buyerEmail} — verifică seed / parolă.`);
    }

    try {
      await loginEmailPassword(sellerPage, sellerEmail, sellerPassword);
    } catch {
      test.skip(true, `Login seller eșuat pentru ${sellerEmail} — verifică seed / parolă.`);
    }

    const sellerUser = await sellerPage.evaluate(() => {
      const raw = localStorage.getItem("user");
      if (!raw) return null;
      try {
        return JSON.parse(raw) as { id?: string };
      } catch {
        return null;
      }
    });
    const sellerId = sellerUser?.id?.trim();
    if (!sellerId) {
      test.skip(true, "Nu am putut citi seller id din localStorage după login.");
    }

    let listingId: string | null = null;

    const prisma = new PrismaClient();
    try {
      const created = await prisma.listing.create({
        data: {
          ownerUserId: sellerId!,
          title: `E2E messaging fixture ${Date.now()}`,
          description:
            "Anunț temporar pentru testul de mesagerie buyer↔seller. Descriere suficient de lungă.",
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
          priceAmount: 1500,
          priceCurrency: "RON",
          contactPhone: "0700000000",
        },
        select: { id: true },
      });
      listingId = created.id;
      createdFixtureId = created.id;
    } finally {
      await prisma.$disconnect();
    }

    expect(listingId).toBeTruthy();

    await expect
      .poll(
        async () => {
          const r = await buyerPage.request.get(`/api/listings/${listingId}`);
          return r.status();
        },
        { timeout: 15_000, intervals: [200, 500, 1000] }
      )
      .toBe(200);

    const stamp = `${Date.now()}`;
    const uniqueMsg = `[E2E_MSG] buyer→seller ${stamp}`;
    const replyMsg = `[E2E_REPLY] seller→buyer ${stamp}`;

    /* ---- Seller: deschide inbox înainte de trimitere (simulează tab deschis) ---- */
    await sellerPage.goto("/messages");
    await sellerPage.waitForSelector("text=Conversații", { timeout: 20_000 });

    /* ---- Buyer: fir anunț + POST ---- */
    await buyerPage.goto(`/listings/${listingId}/messages`);
    await buyerPage.getByPlaceholder(/Scrie mesajul/i).waitFor({ timeout: 25_000 });

    const postRespPromise = buyerPage.waitForResponse(
      (resp) =>
        resp.url().includes("/api/messages/") &&
        resp.request().method() === "POST" &&
        resp.status() >= 200 &&
        resp.status() < 500,
      { timeout: 45_000 }
    );

  await buyerPage.locator('input[placeholder*="Scrie mesajul"]').fill(uniqueMsg);
  await buyerPage.getByRole("button", { name: "Trimite" }).click();

    const postResp = await postRespPromise;
    expect(
      postResp.ok(),
      `POST mesaj nu a reușit: ${postResp.status()}`
    ).toBeTruthy();

    const postBody = (await postResp.json()) as {
      conversationId?: string;
      message?: { id?: string; content?: string; senderId?: string; receiverId?: string };
      success?: boolean;
    };

    expect(
      typeof postBody.conversationId === "string" && postBody.conversationId.length > 0,
      "Response POST trebuie să includă conversationId"
    ).toBeTruthy();
    expect(postBody.message?.content).toContain(uniqueMsg);

    /* ---- API (ca seller): conversațiile conțin mesajul (GET /api/messages/conversations) ---- */
    await expect
      .poll(
        async () => {
          return sellerPage.evaluate(async (needle) => {
            const t = localStorage.getItem("accessToken");
            if (!t) return false;
            const r = await fetch("/api/messages/conversations", {
              credentials: "include",
              headers: { Authorization: `Bearer ${t}` },
              cache: "no-store",
            });
            if (!r.ok) return false;
            const body = (await r.json()) as Array<{
              lastMessage?: { content?: string } | null;
            }>;
            return (
              Array.isArray(body) &&
              body.some(
                (c) =>
                  typeof c.lastMessage?.content === "string" &&
                  c.lastMessage.content.includes(needle)
              )
            );
          }, uniqueMsg);
        },
        { timeout: 45_000, intervals: [400, 800, 1500, 2500] }
      )
      .toBe(true);

    /* Reîncarcă inbox-ul după confirmarea API — SSE poate lipsi fără Redis pe gate production. */
    await sellerPage.goto("/messages");
    await sellerPage.waitForSelector("text=Conversații", { timeout: 20_000 });

    /* ---- UI seller: preview în listă (butonul e vizibil pe desktop+mobil; textul mobil e md:hidden) ---- */
    const sellerThreadBtn = sellerPage
      .locator("div.flex-1.overflow-y-auto button")
      .filter({ hasText: uniqueMsg })
      .first();
    await expect(sellerThreadBtn).toBeVisible({ timeout: 30_000 });

    /* Selectează firul care conține mesajul și răspunde */
    await sellerThreadBtn.click();

    await sellerPage.locator("#message-input").waitFor({ timeout: 15_000 });
    await sellerPage.locator("#message-input").fill(replyMsg);
    await sellerPage.locator("#send-button").click();

    /* ---- Buyer vede răspunsul pe firul anunțului ---- */
    await expect(buyerPage.getByText(replyMsg, { exact: true }).first()).toBeVisible({
      timeout: 45_000,
    });
  } finally {
    if (createdFixtureId) {
      const prisma = new PrismaClient();
      try {
        await prisma.listing.updateMany({
          where: { id: createdFixtureId },
          data: { deletedAt: new Date(), status: "deleted" },
        });
      } finally {
        await prisma.$disconnect();
      }
    }
    await ctxBuyer.close();
    await ctxSeller.close();
  }
});

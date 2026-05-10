import { expect, test } from "@playwright/test";

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
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
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

  const request = ctxBuyer.request;

  /* ---- Login ambele conturi (localStorage + cookies ca în browser real) ---- */
  try {
    await loginEmailPassword(buyerPage, buyerEmail, buyerPassword);
  } catch {
    await ctxBuyer.close();
    await ctxSeller.close();
    test.skip(true, `Login buyer eșuat pentru ${buyerEmail} — verifică seed / parolă.`);
  }

  try {
    await loginEmailPassword(sellerPage, sellerEmail, sellerPassword);
  } catch {
    await ctxBuyer.close();
    await ctxSeller.close();
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
    await ctxBuyer.close();
    await ctxSeller.close();
    test.skip(true, "Nu am putut citi seller id din localStorage după login.");
  }

  /* ---- Găsește un anunț al sellerului (API public) ---- */
  const listingsRes = await request.get("/api/listings?status=active&limit=40");
  expect(listingsRes.ok()).toBeTruthy();
  const feed = (await listingsRes.json()) as {
    data?: Array<{ id: string; owner?: { id: string }; ownerUserId?: string }>;
  };
  const listings = Array.isArray(feed.data) ? feed.data : [];
  const owned =
    listings.find((l) => {
      const oid = (l.owner?.id ?? l.ownerUserId ?? "").trim();
      return oid.length > 0 && oid.toLowerCase() === sellerId.toLowerCase();
    }) ?? null;

  if (!owned) {
    await ctxBuyer.close();
    await ctxSeller.close();
    test.skip(
      true,
      `Niciun listing activ cu owner=${sellerEmail} (${sellerId}) în feed API.`
    );
  }

  const listingId = owned.id;
  const stamp = `${Date.now()}`;
  const uniqueMsg = `[E2E_MSG] buyer→seller ${stamp}`;
  const replyMsg = `[E2E_REPLY] seller→buyer ${stamp}`;

  /* ---- Seller: deschide inbox înainte de trimitere (simulează tab deschis) ---- */
  await sellerPage.goto("/messages");
  await sellerPage.waitForSelector("text=Conversații", { timeout: 20_000 });

  /* ---- Buyer: fir anunț + POST ---- */
  await buyerPage.goto(`/listings/${listingId}/messages`);
  await buyerPage.waitForSelector('input[placeholder="Scrie mesajul tău aici..."]', {
    timeout: 25_000,
  });

  const postRespPromise = buyerPage.waitForResponse(
    (resp) =>
      resp.url().includes("/api/messages/") &&
      resp.request().method() === "POST" &&
      resp.status() >= 200 &&
      resp.status() < 500,
    { timeout: 45_000 }
  );

  await buyerPage.locator('input[placeholder="Scrie mesajul tău aici..."]').fill(uniqueMsg);
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

  /* ---- UI seller: preview în listă (fără refresh manual); SSE+safari+fallback au latență variabilă în CI/local ---- */
  await expect(sellerPage.getByText(uniqueMsg)).toBeVisible({
    timeout: 90_000,
  });

  /* Selectează firul care conține mesajul și răspunde */
  await sellerPage
    .locator("div.flex-1.overflow-y-auto button")
    .filter({ hasText: uniqueMsg })
    .first()
    .click();

  await sellerPage.locator("#message-input").waitFor({ timeout: 15_000 });
  await sellerPage.locator("#message-input").fill(replyMsg);
  await sellerPage.locator("#send-button").click();

  /* ---- Buyer vede răspunsul pe firul anunțului (poll 2s în pagină) ---- */
  await expect(buyerPage.getByText(replyMsg, { exact: true })).toBeVisible({
    timeout: 45_000,
  });

  await ctxBuyer.close();
  await ctxSeller.close();
});

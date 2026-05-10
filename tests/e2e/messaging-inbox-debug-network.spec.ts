import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

/**
 * Debugging simulat (Network + DB) pentru inbox /messages → Trimite.
 *
 * Rulează cu dev deja pornit pe 3004:
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3004 \\
 *     npx playwright test tests/e2e/messaging-inbox-debug-network.spec.ts --project=chromium
 */

test.describe.configure({ mode: "serial", timeout: 180_000 });

type ApiMessagesLog = {
  method: string;
  url: string;
  status: number;
  requestBody?: string;
  responseBody?: string;
};

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

test("DEBUG: inbox /messages — Network /api/messages + DB după Trimite", async ({
  page,
}, testInfo) => {
  const buyerEmail =
    process.env.E2E_MESSAGING_BUYER_EMAIL || "user@example.com";
  const buyerPassword =
    process.env.E2E_MESSAGING_BUYER_PASSWORD || "Password123!";

  const apiLogs: ApiMessagesLog[] = [];
  const consoleErrors: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  page.on("response", async (response) => {
    try {
      const url = response.url();
      if (!url.includes("/api/messages")) return;
      const req = response.request();
      const method = req.method();
      const status = response.status();
      let requestBody: string | undefined;
      try {
        const pd = req.postData();
        if (pd) requestBody = pd.slice(0, 8000);
      } catch {
        requestBody = undefined;
      }
      let responseBody: string | undefined;
      try {
        const ct = response.headers()["content-type"] || "";
        if (ct.includes("application/json") || ct.includes("text/")) {
          responseBody = (await response.text()).slice(0, 12000);
        }
      } catch {
        responseBody = undefined;
      }
      apiLogs.push({ method, url, status, requestBody, responseBody });
    } catch {
      /* ignore collector errors */
    }
  });

  await loginEmailPassword(page, buyerEmail, buyerPassword);

  const buyerId = await page.evaluate(() => {
    const raw = localStorage.getItem("user");
    if (!raw) return "";
    try {
      return (
        JSON.parse(raw) as { id?: string; userId?: string }
      ).id?.trim()?.toLowerCase() ||
        (
          JSON.parse(raw) as { id?: string; userId?: string }
        ).userId?.trim()?.toLowerCase() ||
        "";
    } catch {
      return "";
    }
  });

  /** Feed ca buyer autentificat — alegem un anunț cu owner ≠ buyer (fără POST login/separate CSRF). */
  const listingsRes = await page.request.get("/api/listings?status=active&limit=40");
  expect(listingsRes.ok()).toBeTruthy();
  const feed = (await listingsRes.json()) as {
    data?: Array<{ id: string; owner?: { id: string }; ownerUserId?: string }>;
  };
  const listings = Array.isArray(feed.data) ? feed.data : [];
  const owned =
    listings.find((l) => {
      const oid = (l.owner?.id ?? l.ownerUserId ?? "").trim().toLowerCase();
      return oid.length > 0 && oid !== buyerId;
    }) ?? null;

  if (!owned) {
    test.skip(
      true,
      "Niciun listing activ cu alt owner față de buyer — adaugă anunț / alt cont în seed.",
    );
  }

  /** Deschide un fir (lista conversații poate fi goală prima dată). */
  await page.goto(`/listings/${owned.id}/messages`);
  await page.waitForSelector(
    'input[placeholder="Scrie mesajul tău aici..."]',
    { timeout: 30_000 }
  );
  await page
    .locator('input[placeholder="Scrie mesajul tău aici..."]')
    .fill(`[DEBUG_THREAD] ${Date.now()}`);
  await page.getByRole("button", { name: "Trimite" }).click();
  await page.waitForTimeout(2000);

  const stamp = `${Date.now()}`;
  const uniqueContent = `TEST_DEBUG_${stamp}`;

  apiLogs.length = 0;

  await page.goto("/messages");
  await page.waitForSelector("text=Conversații", { timeout: 25_000 });

  /** Prima conversație din listă (stânga). */
  const convoBtn = page
    .locator("div.flex-1.touch-pan-y.overflow-y-auto button")
    .first();
  await expect(convoBtn).toBeVisible({ timeout: 15_000 });
  await convoBtn.click();

  await page.locator("#message-input").waitFor({ timeout: 20_000 });
  await page.locator("#message-input").fill(uniqueContent);

  await page.locator("#send-button").click();

  /** Așteaptă POST către peer sau orice confirmare în loguri */
  await expect
    .poll(
      () =>
        apiLogs.some(
          (l) => l.method === "POST" && l.url.includes("/api/messages/")
        ),
      { timeout: 45_000, intervals: [200, 500, 1000] }
    )
    .toBe(true);

  const posts = apiLogs.filter(
    (l) => l.method === "POST" && l.url.includes("/api/messages/")
  );
  const lastPost = posts[posts.length - 1];

  /** DB după POST */
  const prisma = new PrismaClient();
  const rows = await prisma.message.findMany({
    where: { content: { startsWith: "TEST_DEBUG_" } },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      content: true,
      conversationId: true,
      senderId: true,
      receiverId: true,
      createdAt: true,
    },
  });
  await prisma.$disconnect();

  /** Raport atasat în Playwright HTML report */
  await testInfo.attach("api-messages-capture.json", {
    body: Buffer.from(
      JSON.stringify(
        {
          stamp: uniqueContent,
          apiMessagesCalls: apiLogs,
          postsOnly: posts,
          lastPost,
          consoleErrors: consoleErrors.slice(0, 50),
          dbMatchingTestDebugRows: rows,
        },
        null,
        2
      ),
      "utf-8"
    ),
    contentType: "application/json",
  });

  /** Clasificare pentru raport automat */
  expect(
    lastPost,
    "Trebuie să existe cel puțin un POST către /api/messages/[userId]"
  ).toBeTruthy();
  expect(lastPost!.status).toBe(200);

  const inDb = rows.some((r) => r.content === uniqueContent);
  expect(inDb, "Mesajul TEST_DEBUG_* trebuie să apară în DB").toBe(true);

  if (consoleErrors.length > 0) {
    console.warn("[messaging-debug] browser console.error:", consoleErrors);
  }

  // eslint-disable-next-line no-console -- raport rulare CI / local vizibil în log Playwright
  console.log(
    "\n=== MESSAGING DEBUG SUMMARY ===\n",
    JSON.stringify(
      {
        classification:
          lastPost!.status === 200 && inDb
            ? "POST OK + DB row (Flux trimitere reușit; erorile din consolă — de obicei GET thread separat)."
            : "verify",
        lastPostMethod: lastPost!.method,
        lastPostUrl: lastPost!.url,
        lastPostStatus: lastPost!.status,
        requestBodyPreview: lastPost!.requestBody?.slice(0, 600),
        responseBodyPreview: lastPost!.responseBody?.slice(0, 800),
        dbRow: rows.find((r) => r.content === uniqueContent) ?? null,
        totalApiMessagesCaptured: apiLogs.length,
      },
      null,
      2
    )
  );
});

/**
 * FAZA 17B — authenticated visual captures + state probes.
 */
const { chromium } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const BASE = process.env.E2E_BASE_URL || "http://127.0.0.1:3103";
const OUT = path.resolve("test-results/faza17b/auth");
fs.mkdirSync(OUT, { recursive: true });

async function login(page, email, password) {
  const csrfRes = await page.request.get(`${BASE}/api/csrf`);
  const { csrfToken } = await csrfRes.json();
  const loginRes = await page.request.post(`${BASE}/api/auth/login`, {
    data: { email, password },
    headers: { "x-csrf-token": csrfToken },
  });
  if (![200, 206].includes(loginRes.status())) {
    throw new Error(`login ${loginRes.status()} ${await loginRes.text()}`);
  }
  const data = await loginRes.json();
  if (data.user) {
    await page.addInitScript((user) => {
      localStorage.setItem("user", JSON.stringify(user));
    }, data.user);
  }
}

async function dismissCookies(page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "clickanunt_cookie_consent_v1",
      JSON.stringify({
        v: 1,
        necessary: true,
        analytics: false,
        marketing: false,
        decidedAt: new Date().toISOString(),
      })
    );
  });
}

(async () => {
  const browser = await chromium.launch();
  const userEmail = process.env.E2E_USER_EMAIL || "user@example.com";
  const userPass = process.env.E2E_USER_PASSWORD || "Password123!";
  const adminEmail = process.env.E2E_ADMIN_EMAIL || "admin@clickanunt.ro";
  const adminPass = process.env.E2E_ADMIN_PASSWORD || "admin123";

  const jobs = [
    {
      name: "user",
      email: userEmail,
      password: userPass,
      routes: [
        "/dashboard",
        "/dashboard/listings",
        "/dashboard/settings",
        "/dashboard/invoices",
        "/favorites",
        "/messages",
        "/listings/new",
        "/listings/new?step=category",
      ],
      vps: [
        { n: "m320", w: 320, h: 568 },
        { n: "m390", w: 390, h: 844 },
        { n: "d1440", w: 1440, h: 900 },
      ],
    },
    {
      name: "admin",
      email: adminEmail,
      password: adminPass,
      routes: [
        "/admin/dashboard",
        "/admin/moderation",
        "/admin/promotions",
        "/admin/invoices",
        "/admin/messaging",
        "/admin/users",
        "/admin/listings",
        "/admin/analytics",
      ],
      vps: [
        { n: "m320", w: 320, h: 568 },
        { n: "m390", w: 390, h: 844 },
        { n: "d1024", w: 1024, h: 768 },
        { n: "d1440", w: 1440, h: 900 },
      ],
    },
  ];

  const results = [];
  for (const job of jobs) {
    for (const vp of job.vps) {
      const ctx = await browser.newContext({
        viewport: { width: vp.w, height: vp.h },
        baseURL: BASE,
      });
      const page = await ctx.newPage();
      await dismissCookies(page);
      try {
        await login(page, job.email, job.password);
      } catch (e) {
        results.push({ job: job.name, error: e.message, vp: vp.n });
        await ctx.close();
        continue;
      }
      for (const route of job.routes) {
        const id = `${job.name}-${route.replace(/\W+/g, "_")}-${vp.n}`;
        try {
          const res = await page.goto(route, {
            waitUntil: "domcontentloaded",
            timeout: 45000,
          });
          await page.waitForTimeout(900);
          const file = path.join(OUT, `${id}.png`);
          await page.screenshot({ path: file, fullPage: false });
          const overflowX = await page.evaluate(
            () => document.documentElement.scrollWidth > window.innerWidth + 1
          );
          const searchW = await page
            .locator('input[aria-label*="Caută" i]')
            .first()
            .boundingBox()
            .catch(() => null);
          results.push({
            id,
            status: res?.status(),
            url: page.url(),
            overflowX,
            searchW: searchW ? Math.round(searchW.width) : null,
            screenshot: path.relative(process.cwd(), file),
          });
          console.log(id, res?.status(), "searchW", searchW?.width, "ovx", overflowX);
        } catch (e) {
          results.push({ id, error: e.message });
          console.error(id, e.message);
        }
      }
      await ctx.close();
    }
  }

  // Public home search measure after cookie dismiss (for after-fix re-check when rebuild done)
  {
    const ctx = await browser.newContext({
      viewport: { width: 320, height: 568 },
      baseURL: BASE,
    });
    const page = await ctx.newPage();
    await dismissCookies(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);
    const measure = await page.evaluate(() => {
      const input = document.querySelector('input[aria-label*="Caută anunțuri mobile" i]');
      const r = input?.getBoundingClientRect();
      const icons = Array.from(
        document.querySelectorAll(".navbar-mobile-icon-btn")
      ).filter((el) => {
        const b = el.getBoundingClientRect();
        return b.width > 0 && b.height > 0;
      });
      return {
        searchW: r ? Math.round(r.width) : null,
        iconCount: icons.length,
        iconSizes: icons.map((el) => {
          const b = el.getBoundingClientRect();
          return {
            label: el.getAttribute("aria-label"),
            w: Math.round(b.width),
            h: Math.round(b.height),
          };
        }),
      };
    });
    await page.screenshot({
      path: path.join(OUT, "home-m320-cookies-dismissed.png"),
      fullPage: false,
    });
    results.push({ id: "home-m320-measure", ...measure });
    console.log("home-m320-measure", measure);
    await ctx.close();
  }

  fs.writeFileSync(
    path.resolve("docs/audits/faza17b/auth-captures.json"),
    JSON.stringify({ at: new Date().toISOString(), base: BASE, results }, null, 2)
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * FAZA 17C — axe color-contrast inventory with fg/bg/ratio when available.
 */
const { chromium } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const fs = require("fs");
const path = require("path");

const BASE = process.env.E2E_BASE_URL || "http://127.0.0.1:3104";
const LISTING_ID =
  process.env.E2E_LISTING_ID || "b010091f-d0c8-4de5-8edb-6b529d12dccd";
const OUT = path.resolve("docs/audits/faza17c");
fs.mkdirSync(OUT, { recursive: true });

const ROUTES = [
  { id: "home", path: "/" },
  { id: "listings", path: "/listings" },
  { id: "detail", path: `/listings/${LISTING_ID}` },
  { id: "publish", path: "/listings/new" },
  { id: "dashboard-listings", path: "/dashboard/listings" },
  { id: "messages", path: "/messages" },
  { id: "admin-moderation", path: "/admin/moderation" },
  { id: "not-found", path: "/no-such-route-faza17c" },
];

(async () => {
  const phase = process.env.AXE_PHASE || "before";
  const browser = await chromium.launch();
  const rows = [];
  for (const route of ROUTES) {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      baseURL: BASE,
    });
    const page = await ctx.newPage();
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
    try {
      await page.goto(route.path, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForTimeout(900);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      const contrast = results.violations.filter((v) => v.id === "color-contrast");
      const other = results.violations.filter((v) => v.id !== "color-contrast");
      const nodes = [];
      for (const v of contrast) {
        for (const n of v.nodes) {
          const data = n.any?.[0]?.data || n.all?.[0]?.data || {};
          nodes.push({
            route: route.path,
            selector: Array.isArray(n.target) ? n.target.join(" ") : String(n.target),
            html: n.html?.slice(0, 220),
            fg: data.fgColor || data.fg || null,
            bg: data.bgColor || data.bg || null,
            ratio: data.contrastRatio || data.contrastRatio != null ? data.contrastRatio : data.ratio || null,
            expected: data.expectedContrastRatio || data.expectedRatio || null,
            fontSize: data.fontSize || null,
            fontWeight: data.fontWeight || null,
            message: n.failureSummary?.split("\n")[0] || v.help,
          });
        }
      }
      // Enrich with computed styles for first 30 nodes
      for (const node of nodes.slice(0, 40)) {
        try {
          const enriched = await page.evaluate((sel) => {
            const el = document.querySelector(sel);
            if (!el) return null;
            const cs = getComputedStyle(el);
            const text = (el.textContent || "").trim().slice(0, 80);
            return {
              text,
              color: cs.color,
              backgroundColor: cs.backgroundColor,
              className: typeof el.className === "string" ? el.className.slice(0, 120) : "",
              tag: el.tagName.toLowerCase(),
            };
          }, node.selector.split(" ")[0]);
          if (enriched) Object.assign(node, enriched);
        } catch {
          /* selector may be complex */
        }
      }
      rows.push({
        id: route.id,
        path: route.path,
        url: page.url(),
        contrastCount: nodes.length,
        otherViolations: other.map((v) => ({ id: v.id, count: v.nodes.length })),
        nodes,
      });
      console.log(`${route.id}: contrast=${nodes.length} other=${other.length}`);
    } catch (e) {
      rows.push({ id: route.id, path: route.path, error: e.message });
      console.error(route.id, e.message);
    }
    await ctx.close();
  }
  await browser.close();
  const flat = rows.flatMap((r) => r.nodes || []);
  const out = {
    phase,
    base: BASE,
    at: new Date().toISOString(),
    totalContrastNodes: flat.length,
    rows,
    flat,
  };
  const outPath = path.join(OUT, `axe-contrast-${phase}.json`);
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log("wrote", outPath, "total", flat.length);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

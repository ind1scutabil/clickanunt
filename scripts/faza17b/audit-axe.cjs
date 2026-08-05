/**
 * FAZA 17B — axe-core scan on production build routes.
 * Output: docs/audits/faza17b/axe-results.json
 */
const { chromium } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const fs = require("fs");
const path = require("path");

const BASE = process.env.E2E_BASE_URL || "http://127.0.0.1:3103";
const LISTING_ID =
  process.env.E2E_LISTING_ID || "b010091f-d0c8-4de5-8edb-6b529d12dccd";
const DOC = path.resolve("docs/audits/faza17b");
fs.mkdirSync(DOC, { recursive: true });

const ROUTES = [
  { id: "home", path: "/" },
  { id: "listings", path: "/listings" },
  { id: "detail", path: `/listings/${LISTING_ID}` },
  { id: "login", path: "/auth/login" },
  { id: "register", path: "/auth/register" },
  { id: "publish", path: "/listings/new" },
  { id: "dashboard-listings", path: "/dashboard/listings" },
  { id: "messages", path: "/messages" },
  { id: "admin-moderation", path: "/admin/moderation" },
  { id: "not-found", path: "/no-such-route-faza17b" },
];

(async () => {
  const browser = await chromium.launch();
  const rows = [];
  for (const route of ROUTES) {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      baseURL: BASE,
    });
    const page = await ctx.newPage();
    try {
      await page.goto(route.path, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForTimeout(800);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      const violations = results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        help: v.help,
        helpUrl: v.helpUrl,
        nodes: v.nodes.slice(0, 8).map((n) => ({
          target: n.target,
          html: n.html?.slice(0, 200),
          failureSummary: n.failureSummary,
        })),
      }));
      rows.push({
        route: route.path,
        id: route.id,
        url: page.url(),
        violationCount: violations.length,
        violations,
        incompleteCount: results.incomplete?.length ?? 0,
      });
      console.log(`${route.id}: ${violations.length} violations`);
    } catch (e) {
      rows.push({ route: route.path, id: route.id, error: e.message });
      console.error(route.id, e.message);
    }
    await ctx.close();
  }
  await browser.close();
  const out = {
    base: BASE,
    at: new Date().toISOString(),
    rows,
    flat: rows.flatMap((r) =>
      (r.violations || []).flatMap((v) =>
        v.nodes.map((n) => ({
          route: r.route,
          rule: v.id,
          impact: v.impact,
          selector: Array.isArray(n.target) ? n.target.join(" ") : String(n.target),
          help: v.help,
        }))
      )
    ),
  };
  fs.writeFileSync(path.join(DOC, "axe-results.json"), JSON.stringify(out, null, 2));
  console.log(
    JSON.stringify(
      {
        routes: rows.length,
        totalViolations: out.flat.length,
        byImpact: out.flat.reduce((acc, x) => {
          acc[x.impact || "unknown"] = (acc[x.impact || "unknown"] || 0) + 1;
          return acc;
        }, {}),
      },
      null,
      2
    )
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * FAZA 17B — visual / overflow / link / measurement probe (production build).
 * Output: docs/audits/faza17b/matrix.json + screenshots in test-results/faza17b/
 */
const { chromium, devices } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const BASE = process.env.E2E_BASE_URL || "http://127.0.0.1:3103";
const OUT_DIR = path.resolve("test-results/faza17b");
const DOC_DIR = path.resolve("docs/audits/faza17b");
const LISTING_ID =
  process.env.E2E_LISTING_ID || "b010091f-d0c8-4de5-8edb-6b529d12dccd";

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(DOC_DIR, { recursive: true });

const CRITICAL_VIEWPORTS = [
  { name: "d1920", width: 1920, height: 1080 },
  { name: "d1440", width: 1440, height: 900 },
  { name: "d1280", width: 1280, height: 800 },
  { name: "d1024", width: 1024, height: 768 },
  { name: "m320", width: 320, height: 568 },
  { name: "m360", width: 360, height: 800 },
  { name: "m390", width: 390, height: 844 },
  { name: "m393", width: 393, height: 852 },
  { name: "m430", width: 430, height: 932 },
  { name: "land844", width: 844, height: 390 },
];

const ROUTES = [
  { id: "home", path: "/", critical: true },
  { id: "listings", path: "/listings", critical: true },
  { id: "listings-q", path: "/listings?q=bmw", critical: true },
  { id: "listings-empty", path: "/listings?q=zzzxnoresults999", critical: false },
  { id: "detail", path: `/listings/${LISTING_ID}`, critical: true },
  { id: "business", path: "/business", critical: false },
  { id: "contact", path: "/contact", critical: false },
  { id: "gdpr", path: "/gdpr", critical: false },
  { id: "404", path: "/no-such-route-faza17b", critical: false },
  { id: "login", path: "/auth/login", critical: false },
  { id: "register", path: "/auth/register", critical: false },
  { id: "forgot", path: "/auth/forgot-password", critical: false },
  { id: "verify", path: "/auth/verify-email", critical: false },
  { id: "publish", path: "/listings/new", critical: true },
  { id: "favorites", path: "/favorites", critical: false },
  { id: "dashboard", path: "/dashboard", critical: true },
  { id: "dash-listings", path: "/dashboard/listings", critical: true },
  { id: "messages", path: "/messages", critical: true },
  { id: "admin", path: "/admin/dashboard", critical: false },
  { id: "admin-mod", path: "/admin/moderation", critical: true },
];


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

function slug(s) {
  return s.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "");
}

async function measureMobileChrome(page) {
  return page.evaluate(() => {
    const header = document.querySelector("header");
    const search = document.querySelector('input[aria-label*="Caută" i]');
    const icons = Array.from(document.querySelectorAll("header a, header button")).map(
      (el) => {
        const r = el.getBoundingClientRect();
        return {
          name: el.getAttribute("aria-label") || el.textContent?.trim().slice(0, 40) || el.tagName,
          w: Math.round(r.width),
          h: Math.round(r.height),
          right: Math.round(r.right),
          clipped: r.right > window.innerWidth + 1 || r.left < -1,
        };
      }
    );
    const bottomNav = document.querySelector('nav[aria-label], [class*="MobileBottom"]');
    const bottom = bottomNav?.getBoundingClientRect();
    const overflowX = document.documentElement.scrollWidth > window.innerWidth + 1;
    return {
      vw: window.innerWidth,
      headerH: header ? Math.round(header.getBoundingClientRect().height) : null,
      searchW: search ? Math.round(search.getBoundingClientRect().width) : null,
      searchVisible: search
        ? search.getBoundingClientRect().width > 40 &&
          getComputedStyle(search).visibility !== "hidden"
        : false,
      overflowX,
      icons,
      bottomNavH: bottom ? Math.round(bottom.height) : null,
      firstViewportUseful: (() => {
        const main = document.querySelector("main") || document.body;
        const r = main.getBoundingClientRect();
        return { top: Math.round(r.top), visibleH: Math.round(Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0)) };
      })(),
    };
  });
}

async function collectLinks(page) {
  return page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll("a[href]"));
    return anchors.map((a) => ({
      text: (a.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80),
      href: a.getAttribute("href") || "",
    }));
  });
}

(async () => {
  const browser = await chromium.launch();
  const startedAt = new Date().toISOString();
  const matrix = [];
  const defects = [];
  const linkSet = new Map();

  // Capture critical routes at key viewports + all routes at 1440 + 390
  const capturePlan = [];
  for (const route of ROUTES) {
    capturePlan.push({ route, vp: CRITICAL_VIEWPORTS.find((v) => v.name === "d1440") });
    capturePlan.push({ route, vp: CRITICAL_VIEWPORTS.find((v) => v.name === "m390") });
    if (route.critical) {
      for (const vp of CRITICAL_VIEWPORTS) {
        if (vp.name === "d1440" || vp.name === "m390") continue;
        capturePlan.push({ route, vp });
      }
    }
  }

  for (const { route, vp } of capturePlan) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      baseURL: BASE,
    });
    const page = await ctx.newPage();
    await dismissCookies(page);
    let status = null;
    let error = null;
    try {
      const res = await page.goto(route.path, {
        waitUntil: "domcontentloaded",
        timeout: 45000,
      });
      status = res?.status() ?? null;
      await page.waitForTimeout(700);
      const file = path.join(OUT_DIR, `${route.id}-${vp.name}.png`);
      await page.screenshot({ path: file, fullPage: false });
      let measures = null;
      if (vp.width <= 430 || vp.name === "land844") {
        measures = await measureMobileChrome(page);
        if (measures.overflowX) {
          defects.push({
            id: `OVX-${route.id}-${vp.name}`,
            severity: "P1",
            route: route.path,
            viewport: `${vp.width}x${vp.height}`,
            observation: "Horizontal overflow (document scrollWidth > innerWidth)",
            measures,
          });
        }
        const smallTargets = (measures.icons || []).filter(
          (i) => i.w > 0 && i.h > 0 && (i.w < 44 || i.h < 44) && /favorite|mesaj|meniu|Adaugă|Caută/i.test(i.name)
        );
        if (smallTargets.length && route.id === "home") {
          defects.push({
            id: `TT-${vp.name}`,
            severity: "P2",
            route: route.path,
            viewport: `${vp.width}x${vp.height}`,
            observation: `Touch targets under 44px: ${smallTargets
              .map((t) => `${t.name} ${t.w}x${t.h}`)
              .join("; ")}`,
            measures: smallTargets,
          });
        }
        if (measures.searchW != null && measures.searchW < 72 && vp.width <= 360) {
          defects.push({
            id: `SEARCH-NARROW-${vp.name}`,
            severity: "P1",
            route: route.path,
            viewport: `${vp.width}x${vp.height}`,
            observation: `Mobile search input width ${measures.searchW}px may be unusable`,
            measures,
          });
        }
      }
      if (vp.name === "d1440" || vp.name === "m390") {
        const links = await collectLinks(page);
        for (const l of links) {
          if (!l.href || l.href.startsWith("#") || l.href.startsWith("mailto:") || l.href.startsWith("tel:")) {
            linkSet.set(`${l.text}|${l.href}`, { ...l, source: route.path });
            continue;
          }
          linkSet.set(`${l.text}|${l.href}`, { ...l, source: route.path });
        }
      }
      matrix.push({
        route: route.path,
        id: route.id,
        viewport: vp.name,
        size: `${vp.width}x${vp.height}`,
        status,
        screenshot: path.relative(process.cwd(), file),
        measures,
      });
    } catch (e) {
      error = e.message;
      defects.push({
        id: `NAV-${route.id}-${vp.name}`,
        severity: "P1",
        route: route.path,
        viewport: `${vp.width}x${vp.height}`,
        observation: `Navigation/capture failed: ${error}`,
      });
      matrix.push({
        route: route.path,
        id: route.id,
        viewport: vp.name,
        status,
        error,
      });
    }
    await ctx.close();
  }

  // Probe absolute/relative link health (unique hrefs, same-origin)
  const linkResults = [];
  const hrefs = [...new Set([...linkSet.values()].map((l) => l.href))].slice(0, 80);
  const ctx = await browser.newContext({ baseURL: BASE });
  const req = ctx.request;
  for (const href of hrefs) {
    let result = { href, status: null, ok: null, note: "" };
    try {
      if (href.startsWith("http") && !href.includes("127.0.0.1") && !href.includes("localhost") && !href.includes("clickanunt")) {
        result.note = "external";
        result.ok = true;
      } else if (href.startsWith("mailto:") || href.startsWith("tel:")) {
        result.note = "scheme";
        result.ok = true;
      } else {
        const url = href.startsWith("http") ? href : new URL(href, BASE).toString();
        const res = await req.get(url, { maxRedirects: 5 });
        result.status = res.status();
        result.ok = res.status() < 400;
        if (!result.ok) {
          defects.push({
            id: `LINK-${result.status}-${slug(href).slice(0, 40)}`,
            severity: result.status === 404 ? "P1" : "P2",
            route: href,
            viewport: "n/a",
            observation: `Link returns HTTP ${result.status}`,
          });
        }
      }
    } catch (e) {
      result.ok = false;
      result.note = e.message;
      defects.push({
        id: `LINK-ERR-${slug(href).slice(0, 40)}`,
        severity: "P1",
        route: href,
        viewport: "n/a",
        observation: `Link request failed: ${e.message}`,
      });
    }
    linkResults.push(result);
  }
  await ctx.close();
  await browser.close();

  const report = {
    startedAt,
    finishedAt: new Date().toISOString(),
    base: BASE,
    head: process.env.GIT_HEAD || null,
    listingId: LISTING_ID,
    matrixCount: matrix.length,
    defects,
    matrix,
    links: linkResults,
  };
  fs.writeFileSync(path.join(DOC_DIR, "matrix.json"), JSON.stringify(report, null, 2));
  fs.writeFileSync(
    path.join(DOC_DIR, "defects-from-probe.json"),
    JSON.stringify(defects, null, 2)
  );
  console.log(
    JSON.stringify(
      {
        matrixCount: matrix.length,
        defectCount: defects.length,
        defects: defects.slice(0, 30),
        linkFail: linkResults.filter((l) => l.ok === false).length,
      },
      null,
      2
    )
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

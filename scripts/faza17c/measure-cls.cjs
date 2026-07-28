/**
 * FAZA 17C — CLS measurement + layout-shift attribution (Playwright Chromium).
 * 5 runs per route; reports all values + median (3rd of sorted) + shift entries.
 *
 * Conditions: production build, mobile 390x844, cookies dismissed, reduced motion,
 * fonts wait, networkidle-ish settle. Cache: disabled via context.
 */
const { chromium } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const BASE = process.env.E2E_BASE_URL || "http://127.0.0.1:3104";
const LISTING_ID = process.env.E2E_LISTING_ID || "b010091f-d0c8-4de5-8edb-6b529d12dccd";
const OUT = path.resolve("docs/audits/faza17c");
const TRACE_DIR = path.resolve("test-results/faza17c/traces");
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(TRACE_DIR, { recursive: true });

function median5(vals) {
  const a = [...vals].sort((x, y) => x - y);
  return a[2];
}

async function login(page, email, password) {
  const csrfRes = await page.request.get(`${BASE}/api/csrf`);
  const { csrfToken } = await csrfRes.json();
  const loginRes = await page.request.post(`${BASE}/api/auth/login`, {
    data: { email, password },
    headers: { "x-csrf-token": csrfToken },
  });
  if (loginRes.status() !== 200) {
    throw new Error(`login ${loginRes.status()} ${await loginRes.text()}`);
  }
  const data = await loginRes.json();
  if (data.user) {
    await page.addInitScript((user) => {
      localStorage.setItem("user", JSON.stringify(user));
    }, data.user);
  }
}

async function preparePage(context, { auth } = {}) {
  const page = await context.newPage();
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
    try {
      document.documentElement.style.setProperty("scroll-behavior", "auto");
    } catch {}
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  if (auth) {
    await login(
      page,
      process.env.E2E_USER_EMAIL || "user@example.com",
      process.env.E2E_USER_PASSWORD || "Password123!"
    );
  }
  return page;
}

async function measureCls(page, url, settleMs = 4500) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  // Collect layout-shift entries from navigation start
  const result = await page.evaluate(async (settle) => {
    const shifts = [];
    let cls = 0;
    const po = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.hadRecentInput) continue;
        const entry = /** @type {any} */ (e);
        cls += entry.value;
        const sources = (entry.sources || []).map((s) => {
          const node = s.node;
          let selector = null;
          let html = null;
          if (node && node.nodeType === 1) {
            const el = /** @type {Element} */ (node);
            selector =
              el.id
                ? `#${el.id}`
                : el.getAttribute("data-testid")
                  ? `[data-testid="${el.getAttribute("data-testid")}"]`
                  : el.className && typeof el.className === "string"
                    ? `.${el.className.trim().split(/\s+/).slice(0, 3).join(".")}`
                    : el.tagName.toLowerCase();
            html = el.outerHTML?.slice(0, 180);
          }
          return {
            selector,
            html,
            previousRect: s.previousRect
              ? {
                  x: Math.round(s.previousRect.x),
                  y: Math.round(s.previousRect.y),
                  w: Math.round(s.previousRect.width),
                  h: Math.round(s.previousRect.height),
                }
              : null,
            currentRect: s.currentRect
              ? {
                  x: Math.round(s.currentRect.x),
                  y: Math.round(s.currentRect.y),
                  w: Math.round(s.currentRect.width),
                  h: Math.round(s.currentRect.height),
                }
              : null,
          };
        });
        shifts.push({
          value: entry.value,
          startTime: entry.startTime,
          sources,
        });
      }
    });
    po.observe({ type: "layout-shift", buffered: true });
    await new Promise((r) => setTimeout(r, settle));
    // flush
    try {
      po.takeRecords();
    } catch {}
    po.disconnect();
    // also read web-vitals style from performance if available
    const nav = performance.getEntriesByType("navigation")[0];
    return {
      cls,
      shifts: shifts.sort((a, b) => b.value - a.value),
      url: location.href,
      hideNav: document.documentElement.dataset.hideMobileBottomNav || null,
      bodyScrollH: document.body.scrollHeight,
      footerPb: getComputedStyle(document.querySelector("footer") || document.body).paddingBottom,
    };
  }, settleMs);
  return result;
}

(async () => {
  const browser = await chromium.launch();
  const phase = process.env.CLS_PHASE || "before";
  const routes = [
    { id: "publish", path: "/listings/new", auth: true },
    { id: "detail", path: `/listings/${LISTING_ID}`, auth: false },
  ];
  const report = {
    phase,
    base: BASE,
    listingId: LISTING_ID,
    viewport: "390x844",
    formFactor: "mobile",
    cache: "disabled",
    reducedMotion: true,
    cookieConsent: "pre-dismissed",
    at: new Date().toISOString(),
    routes: {},
  };

  for (const route of routes) {
    const runs = [];
    let medianIdx = 0;
    for (let i = 1; i <= 5; i++) {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        baseURL: BASE,
        // disable HTTP cache for repeatability
        serviceWorkers: "block",
      });
      // CDP: disable cache
      const page = await preparePage(context, { auth: route.auth });
      const cdp = await context.newCDPSession(page);
      await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });

      const tracing = i === 3; // will re-pick median later; capture all traces named by run
      if (true) {
        await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
      }
      const measured = await measureCls(page, route.path, 5000);
      const tracePath = path.join(TRACE_DIR, `${phase}-${route.id}-run${i}.zip`);
      await context.tracing.stop({ path: tracePath });
      runs.push({
        run: i,
        cls: measured.cls,
        url: measured.url,
        hideNav: measured.hideNav,
        footerPb: measured.footerPb,
        topShifts: measured.shifts.slice(0, 8),
        shiftCount: measured.shifts.length,
        trace: path.relative(process.cwd(), tracePath),
      });
      console.log(`${route.id} run${i} CLS=${measured.cls.toFixed(4)} shifts=${measured.shifts.length} url=${measured.url}`);
      if (measured.shifts[0]) {
        console.log(
          "  top:",
          measured.shifts[0].value.toFixed(4),
          measured.shifts[0].sources?.[0]?.selector,
          measured.shifts[0].sources?.[0]?.html?.slice(0, 80)
        );
      }
      await context.close();
    }
    const clsValues = runs.map((r) => r.cls);
    const med = median5(clsValues);
    // pick run closest to median for "median trace"
    medianIdx = runs
      .map((r, idx) => ({ idx, d: Math.abs(r.cls - med) }))
      .sort((a, b) => a.d - b.d)[0].idx;
    report.routes[route.id] = {
      path: route.path,
      auth: route.auth,
      runs: clsValues,
      median: med,
      runDetails: runs,
      medianRun: runs[medianIdx].run,
      medianTrace: runs[medianIdx].trace,
      topContributorsMerged: (() => {
        const map = new Map();
        for (const r of runs) {
          for (const s of r.topShifts) {
            for (const src of s.sources || []) {
              const key = src.selector || src.html || "unknown";
              const prev = map.get(key) || {
                selector: src.selector,
                html: src.html,
                maxContribution: 0,
                samples: 0,
                previousRect: src.previousRect,
                currentRect: src.currentRect,
              };
              prev.maxContribution = Math.max(prev.maxContribution, s.value);
              prev.samples += 1;
              map.set(key, prev);
            }
          }
        }
        return [...map.values()].sort((a, b) => b.maxContribution - a.maxContribution).slice(0, 12);
      })(),
    };
  }

  const outPath = path.join(OUT, `cls-${phase}.json`);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log("wrote", outPath);
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

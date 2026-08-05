/**
 * FAZA 17C — Lighthouse 3-run medians for publish + detail only.
 */
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const BASE = process.env.E2E_BASE_URL || "http://127.0.0.1:3104";
const LISTING_ID =
  process.env.E2E_LISTING_ID || "b010091f-d0c8-4de5-8edb-6b529d12dccd";
const DOC = path.resolve("docs/audits/faza17c");
const OUT = path.resolve("test-results/faza17c/lighthouse");
fs.mkdirSync(DOC, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

const ROUTES = [
  { id: "publish", path: "/listings/new" },
  { id: "detail", path: `/listings/${LISTING_ID}` },
];

function median(nums) {
  const a = [...nums].sort((x, y) => x - y);
  return a[Math.floor(a.length / 2)];
}

function runLighthouse(url, outJson) {
  return new Promise((resolve, reject) => {
    const args = [
      "lighthouse",
      url,
      "--quiet",
      "--chrome-flags=--headless --no-sandbox --disable-gpu",
      "--only-categories=performance,accessibility,best-practices,seo",
      "--output=json",
      `--output-path=${outJson}`,
      "--form-factor=mobile",
      "--screenEmulation.mobile=true",
      "--screenEmulation.width=390",
      "--screenEmulation.height=844",
      "--screenEmulation.deviceScaleFactor=2",
      "--throttling-method=simulate",
    ];
    const child = spawn("npx", args, { cwd: process.cwd(), env: process.env, stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    child.stderr.on("data", (d) => { err += d.toString(); });
    child.on("close", (code) => {
      if (code !== 0) reject(new Error(`lh ${code}: ${err.slice(-400)}`));
      else resolve();
    });
  });
}

function pick(report) {
  const cats = report.categories || {};
  const audits = report.audits || {};
  const score = (c) => (c && typeof c.score === "number" ? Math.round(c.score * 100) : null);
  return {
    performance: score(cats.performance),
    accessibility: score(cats.accessibility),
    bestPractices: score(cats["best-practices"]),
    seo: score(cats.seo),
    lcpMs: audits["largest-contentful-paint"]?.numericValue ?? null,
    cls: audits["cumulative-layout-shift"]?.numericValue ?? null,
    tbtMs: audits["total-blocking-time"]?.numericValue ?? null,
  };
}

(async () => {
  const phase = process.env.LH_PHASE || "after";
  const summary = {
    label: "LOCAL LAB MEASUREMENT — NU FIELD DATA DE PRODUCȚIE",
    base: BASE,
    formFactor: "mobile-390x844-simulated-throttling",
    at: new Date().toISOString(),
    phase,
    routes: {},
  };
  for (const route of ROUTES) {
    const runs = [];
    for (let i = 1; i <= 3; i++) {
      const outJson = path.join(OUT, `${phase}-${route.id}-run${i}.json`);
      console.log(`LH ${phase} ${route.id} run ${i}`);
      await runLighthouse(`${BASE}${route.path}`, outJson);
      runs.push(pick(JSON.parse(fs.readFileSync(outJson, "utf8"))));
    }
    const medians = {};
    for (const k of Object.keys(runs[0])) {
      const vals = runs.map((r) => r[k]).filter((v) => typeof v === "number");
      medians[k] = vals.length ? median(vals) : null;
    }
    summary.routes[route.id] = { path: route.path, runs, medians };
    console.log(route.id, medians);
  }
  const outPath = path.join(DOC, `lighthouse-${phase}.json`);
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));
  console.log("wrote", outPath);
})().catch((e) => { console.error(e); process.exit(1); });

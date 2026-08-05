#!/usr/bin/env node
/**
 * One-time (or occasional) backfill: submits every public URL currently in the
 * live sitemaps to IndexNow (Bing/Yandex/other participating engines), so
 * pages that existed before IndexNow was wired into publish/republish don't
 * wait for organic crawl discovery.
 *
 * Requires INDEXNOW_KEY to already be live on the server (this script reads
 * the sitemaps over HTTPS, it does not touch the database or the server
 * filesystem) — https://www.clickanunt.ro/indexnow-key.txt must return that
 * same key before IndexNow will accept submissions for this host.
 *
 * Usage:
 *   node scripts/indexnow-submit-all.mjs [--dry-run]
 *
 * Env:
 *   INDEXNOW_KEY   required (same value configured on the server)
 *   SITE_ORIGIN    default: https://www.clickanunt.ro
 */

const SITE_ORIGIN = process.env.SITE_ORIGIN || "https://www.clickanunt.ro";
const KEY = process.env.INDEXNOW_KEY?.trim();
const DRY_RUN = process.argv.includes("--dry-run");
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
const MAX_BATCH = 100;

// Same non-HTML / private-path exclusions as lib/seo/indexnow-client.ts —
// keep in sync if that allowlist logic changes.
const BLOCKED_PATH_PREFIXES = ["/api/", "/admin", "/dashboard", "/auth", "/messages", "/favorites"];
function isBlockedPath(pathname) {
  if (BLOCKED_PATH_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  if (pathname.includes("/edit")) return true;
  if (pathname.includes("/promote")) return true;
  if (pathname === "/listings/new") return true;
  return false;
}

const SITEMAPS = [
  "/sitemap.xml",
  "/sitemap-categories.xml",
  "/sitemap-cities.xml",
  "/sitemap-listings.xml",
  "/sitemap-auto-hubs.xml",
  // sitemap-images.xml deliberately excluded — image URLs, not indexable pages.
];

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.text();
}

function extractLocs(xml) {
  const matches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)];
  return matches.map((m) => m[1].trim());
}

async function collectAllUrls() {
  const seen = new Set();
  const nested = [];

  for (const path of SITEMAPS) {
    const url = `${SITE_ORIGIN}${path}`;
    let xml;
    try {
      xml = await fetchText(url);
    } catch (e) {
      console.warn(`⚠️  skip ${url}: ${e.message}`);
      continue;
    }
    for (const loc of extractLocs(xml)) {
      // sitemap.xml is itself a sitemap index for large sets — locs pointing at
      // another *.xml under a sitemap-serve/ path need one more fetch level.
      if (/\.xml$/i.test(loc) || loc.includes("/sitemap-serve/")) {
        nested.push(loc);
        continue;
      }
      seen.add(loc);
    }
  }

  for (const nestedUrl of nested) {
    try {
      const xml = await fetchText(nestedUrl);
      for (const loc of extractLocs(xml)) {
        if (/\.xml$/i.test(loc)) continue; // one level of nesting is enough here
        seen.add(loc);
      }
    } catch (e) {
      console.warn(`⚠️  skip nested ${nestedUrl}: ${e.message}`);
    }
  }

  const host = new URL(SITE_ORIGIN).host;
  return [...seen].filter((raw) => {
    try {
      const u = new URL(raw);
      return u.protocol === "https:" && u.host === host && !u.search && !u.hash && !isBlockedPath(u.pathname);
    } catch {
      return false;
    }
  });
}

async function main() {
  if (!KEY) {
    console.error("❌ INDEXNOW_KEY env var is required (same value already live on the server).");
    process.exit(1);
  }

  // Never accidentally POST from a laptop pointing at localhost/staging without explicit override.
  const host = new URL(SITE_ORIGIN).host;
  const isCanonicalProdHost = host === "www.clickanunt.ro";
  if (!isCanonicalProdHost && process.env.INDEXNOW_ALLOW_NON_PRODUCTION !== "1") {
    console.error(
      `❌ Refusing to submit for host=${host}. Use SITE_ORIGIN=https://www.clickanunt.ro or set INDEXNOW_ALLOW_NON_PRODUCTION=1 for a deliberate non-prod test.`
    );
    process.exit(1);
  }

  console.log(`🔎 Colectez URL-uri publice din sitemap-urile de pe ${SITE_ORIGIN} ...`);
  console.log("   (INDEXNOW_KEY is set; value is not printed)");
  const urls = await collectAllUrls();
  console.log(`   găsite: ${urls.length} URL-uri eligibile`);

  if (urls.length === 0) {
    console.log("Nimic de trimis.");
    return;
  }

  const keyLocation = `${SITE_ORIGIN}/indexnow-key.txt`;

  for (let i = 0; i < urls.length; i += MAX_BATCH) {
    const batch = urls.slice(i, i + MAX_BATCH);
    console.log(`\n📦 Batch ${Math.floor(i / MAX_BATCH) + 1}: ${batch.length} URL-uri`);
    batch.forEach((u) => console.log(`   - ${u}`));

    if (DRY_RUN) {
      console.log("   [DRY-RUN] nu trimit efectiv.");
      continue;
    }

    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host, key: KEY, keyLocation, urlList: batch }),
    });

    // 200/202 = accepted for processing by IndexNow. NOT proof that Bing indexed the URLs.
    if (res.status === 200 || res.status === 202) {
      console.log(
        `   ✅ acceptat pentru procesare (HTTP ${res.status}) — nu înseamnă „indexat în Bing”`
      );
    } else {
      const body = await res.text().catch(() => "");
      console.error(`   ❌ HTTP ${res.status} ${body.slice(0, 300)}`);
    }
  }

  console.log("\n✅ Gata.");
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});

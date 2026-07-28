/** @jest-environment node */
import {
  MARKETPLACE_GA4_EVENT,
  sanitizeMarketplaceGa4Params,
} from "@/lib/seo/marketplace-ga4-events";
import { evaluateListingJsonLdQuality } from "@/lib/seo/jsonld-quality-gate";
import { buildListingShareUrl } from "@/lib/seo/share-url";
import { decideHubIndexability } from "@/lib/seo/hub-indexability";
import { readFileSync } from "fs";
import path from "path";

describe("marketplace GA4 sanitizer", () => {
  it("strips PII keys", () => {
    const clean = sanitizeMarketplaceGa4Params({
      channel: "whatsapp",
      email: "a@b.c",
      phone: "0700000000",
      listing_category: "Auto",
    });
    expect(clean).toEqual({ channel: "whatsapp", listing_category: "Auto" });
    expect(MARKETPLACE_GA4_EVENT.share_clicked).toBe("share_clicked");
  });
});

describe("JSON-LD quality gate", () => {
  it("rejects invented FREE offer price and PII", () => {
    const issues = evaluateListingJsonLdQuality({
      priceType: "FREE",
      offerPrice: 0,
      containsPhone: true,
      containsEmail: false,
      emitsCommercialOffer: true,
    });
    expect(issues.some((i) => i.code === "INVENTED_OFFER_PRICE")).toBe(true);
    expect(issues.some((i) => i.code === "PII_PHONE")).toBe(true);
  });

  it("flags canonical mismatch", () => {
    const issues = evaluateListingJsonLdQuality({
      canonicalUrl: "https://www.clickanunt.ro/listings/a",
      jsonLdUrl: "https://clickanunt.ro/listings/a",
    });
    expect(issues.some((i) => i.code === "URL_MISMATCH")).toBe(true);
  });
});

describe("share URL", () => {
  it("builds www canonical with UTM", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.clickanunt.ro";
    const url = buildListingShareUrl({
      listingId: "abc",
      channel: "whatsapp",
    });
    expect(url).toContain("https://www.clickanunt.ro/listings/abc");
    expect(url).toContain("utm_source=whatsapp");
    expect(url).toContain("utm_medium=share");
    expect(url).not.toMatch(/email|phone|token/i);
  });
});

describe("hub indexability", () => {
  it("noindexes thin category×city hubs", () => {
    const d = decideHubIndexability("category_city", 2);
    expect(d.indexable).toBe(false);
    expect(d.includeInSitemap).toBe(false);
    expect(d.robots).toBe("noindex, follow");
  });

  it("indexes hubs at threshold", () => {
    const d = decideHubIndexability("category_city", 3);
    expect(d.indexable).toBe(true);
    expect(d.includeInSitemap).toBe(true);
  });
});

describe("image sitemap URL canonicalization", () => {
  const base = "https://www.clickanunt.ro";

  it("rewrites localhost upload serve URLs onto canonical origin", async () => {
    const { canonicalizeSitemapImageUrl } = await import("@/lib/seo/sitemap-image-url");
    const out = canonicalizeSitemapImageUrl(
      "https://localhost:3000/api/uploads/serve?key=listings%2Fa%2Foriginal%2Fx.jpg",
      base,
    );
    expect(out).toBe(
      "https://www.clickanunt.ro/api/uploads/serve?key=listings%2Fa%2Foriginal%2Fx.jpg",
    );
    expect(out).not.toContain("localhost");
  });

  it("rejects foreign hosts", async () => {
    const { canonicalizeSitemapImageUrl } = await import("@/lib/seo/sitemap-image-url");
    expect(
      canonicalizeSitemapImageUrl("https://evil.example/api/uploads/serve?key=x", base),
    ).toBeNull();
  });

  it("keeps canonical https upload URLs", async () => {
    const { canonicalizeSitemapImageUrl } = await import("@/lib/seo/sitemap-image-url");
    const u =
      "https://www.clickanunt.ro/api/uploads/serve?key=listings%2Fa%2Foriginal%2Fx.jpg";
    expect(canonicalizeSitemapImageUrl(u, base)).toBe(u);
  });
});

describe("robots + sitemap contracts", () => {
  it("robots lists image sitemap and does not disallow HTML private by path", () => {
    const src = readFileSync(path.join(process.cwd(), "app/robots.ts"), "utf8");
    expect(src).toContain("sitemap-images.xml");
    expect(src).toContain('disallow: technicalDisallow');
    expect(src).not.toMatch(/disallow:\s*\[[^\]]*\/dashboard/);
  });

  it("next rewrites include image sitemap shards", () => {
    const src = readFileSync(path.join(process.cwd(), "next.config.ts"), "utf8");
    expect(src).toContain("/sitemap-images.xml");
    expect(src).toContain("/sitemap-images-:chunk.xml");
  });

  it("static sitemap avoids fake daily lastmod by default", () => {
    const src = readFileSync(path.join(process.cwd(), "app/sitemap.ts"), "utf8");
    expect(src).toContain("SEO_STATIC_LASTMOD");
    expect(src).not.toMatch(/lastModified:\s*now/);
  });
});

/** @jest-environment node */
import {
  getVerifiedBrandSameAsUrls,
  sanitizeBrandSocialUrl,
} from "@/lib/brand-social-urls";
import { buildOrganizationJsonLd } from "@/lib/seo/site-jsonld";

const ORIGINAL = {
  fb: process.env.NEXT_PUBLIC_BRAND_FACEBOOK_URL,
  ig: process.env.NEXT_PUBLIC_BRAND_INSTAGRAM_URL,
  tw: process.env.NEXT_PUBLIC_BRAND_TWITTER_URL,
  x: process.env.NEXT_PUBLIC_BRAND_X_URL,
  site: process.env.NEXT_PUBLIC_SITE_URL,
};

beforeAll(() => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://www.clickanunt.ro";
});

afterAll(() => {
  process.env.NEXT_PUBLIC_BRAND_FACEBOOK_URL = ORIGINAL.fb;
  process.env.NEXT_PUBLIC_BRAND_INSTAGRAM_URL = ORIGINAL.ig;
  process.env.NEXT_PUBLIC_BRAND_TWITTER_URL = ORIGINAL.tw;
  process.env.NEXT_PUBLIC_BRAND_X_URL = ORIGINAL.x;
  process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL.site;
});

function clearBrandSocialEnv() {
  delete process.env.NEXT_PUBLIC_BRAND_FACEBOOK_URL;
  delete process.env.NEXT_PUBLIC_BRAND_INSTAGRAM_URL;
  delete process.env.NEXT_PUBLIC_BRAND_TWITTER_URL;
  delete process.env.NEXT_PUBLIC_BRAND_X_URL;
}

describe("sanitizeBrandSocialUrl", () => {
  it("rejects generic facebook.com roots", () => {
    expect(sanitizeBrandSocialUrl("https://facebook.com")).toBeNull();
    expect(sanitizeBrandSocialUrl("https://www.facebook.com")).toBeNull();
    expect(sanitizeBrandSocialUrl("https://www.facebook.com/")).toBeNull();
    expect(sanitizeBrandSocialUrl("https://instagram.com")).toBeNull();
  });

  it("rejects invalid / non-HTTPS / javascript", () => {
    expect(sanitizeBrandSocialUrl("http://www.facebook.com/clickanunt")).toBeNull();
    expect(sanitizeBrandSocialUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeBrandSocialUrl("not-a-url")).toBeNull();
    expect(sanitizeBrandSocialUrl("https://evil.example/clickanunt")).toBeNull();
  });

  it("accepts absolute HTTPS brand profile URLs", () => {
    expect(sanitizeBrandSocialUrl("https://www.facebook.com/clickanunt")).toBe(
      "https://www.facebook.com/clickanunt",
    );
    expect(sanitizeBrandSocialUrl("https://www.instagram.com/clickanunt/")).toBe(
      "https://www.instagram.com/clickanunt",
    );
  });
});

describe("Organization JSON-LD sameAs", () => {
  it("omits sameAs and Facebook/Instagram when no brand URL configured", () => {
    clearBrandSocialEnv();
    const org = buildOrganizationJsonLd() as Record<string, unknown>;
    expect(org.sameAs).toBeUndefined();
    const serialized = JSON.stringify(org);
    expect(serialized).not.toMatch(/facebook\.com/i);
    expect(serialized).not.toMatch(/instagram\.com/i);
  });

  it("rejects generic https://facebook.com even if set in env", () => {
    clearBrandSocialEnv();
    process.env.NEXT_PUBLIC_BRAND_FACEBOOK_URL = "https://facebook.com";
    expect(getVerifiedBrandSameAsUrls()).toEqual([]);
    const org = buildOrganizationJsonLd() as Record<string, unknown>;
    expect(org.sameAs).toBeUndefined();
  });

  it("includes only valid configured brand URLs", () => {
    clearBrandSocialEnv();
    process.env.NEXT_PUBLIC_BRAND_FACEBOOK_URL = "https://www.facebook.com/clickanunt";
    process.env.NEXT_PUBLIC_BRAND_INSTAGRAM_URL = "https://www.instagram.com/clickanunt";
    const sameAs = getVerifiedBrandSameAsUrls();
    expect(sameAs).toEqual([
      "https://www.facebook.com/clickanunt",
      "https://www.instagram.com/clickanunt",
    ]);
    const org = buildOrganizationJsonLd() as Record<string, unknown>;
    expect(org.sameAs).toEqual(sameAs);
  });
});

/** @jest-environment node */
import { createPageMetadata } from "@/lib/seo";
import { PRIVATE_PAGE_ROBOTS, privatePageMetadata } from "@/lib/seo/private-page-metadata";
import { isListingSeoIndexable } from "@/lib/seo/listing-seo-eligibility";
import { seoIndexableListingWhere } from "@/lib/seo/indexable-listing-where";
import { publicBrowseListingWhere } from "@/lib/listings/public-browse-server";
import robots from "@/app/robots";
import fs from "node:fs";
import path from "node:path";

jest.mock("@/lib/staging/site-mode", () => ({
  isStagingSite: () => false,
}));

jest.mock("@/lib/seo/site-url-guard", () => ({
  siteOriginForSeoFeeds: () => "https://www.clickanunt.ro",
}));

describe("private page metadata", () => {
  it("emits noindex,nofollow for dashboard-style routes", () => {
    const meta = privatePageMetadata("Dashboard — ClickAnunț");
    expect(meta.robots).toEqual(PRIVATE_PAGE_ROBOTS);
    expect(PRIVATE_PAGE_ROBOTS).toMatchObject({ index: false, follow: false });
  });
});

describe("createPageMetadata robots", () => {
  it("uses noindex,follow for thin hubs (links remain discoverable)", () => {
    const meta = createPageMetadata({
      title: "Hub gol",
      description: "Test",
      canonicalPath: "/auto/cluj-napoca",
      noindex: true,
    });
    expect(meta.robots).toMatchObject({ index: false, follow: true });
  });

  it("uses noindex,nofollow when explicitly requested", () => {
    const meta = createPageMetadata({
      title: "Privat",
      description: "Test",
      canonicalPath: "/dashboard",
      noindex: true,
      nofollow: true,
    });
    expect(meta.robots).toMatchObject({ index: false, follow: false });
  });

  it("uses index,follow for public pages by default", () => {
    const meta = createPageMetadata({
      title: "Public",
      description: "Test",
      canonicalPath: "/listings",
    });
    expect(meta.robots).toMatchObject({ index: true, follow: true });
  });
});

describe("public listing eligibility alignment", () => {
  it("public browse uses the same Prisma filter as sitemap indexability", () => {
    const now = new Date("2026-07-26T12:00:00.000Z");
    expect(publicBrowseListingWhere(now)).toEqual(seoIndexableListingWhere(now));
  });

  it("has a single return delegating to seoIndexableListingWhere", () => {
    const src = fs.readFileSync(
      path.join(__dirname, "..", "..", "lib", "listings", "public-browse-server.ts"),
      "utf8",
    );
    const fnBody = src.slice(src.indexOf("export function publicBrowseListingWhere"));
    expect(fnBody).toMatch(/return seoIndexableListingWhere\(/);
    expect(fnBody).not.toMatch(/activePublicListingExpiryWhere/);
  });

  it("rejects non-approved, expired, and deleted listings for SEO", () => {
    const future = new Date(Date.now() + 86_400_000 * 30);
    const past = new Date(Date.now() - 86_400_000);
    expect(
      isListingSeoIndexable({
        deletedAt: null,
        status: "active",
        moderationStatus: "approved",
        expiresAt: future,
      }),
    ).toBe(true);
    expect(
      isListingSeoIndexable({
        deletedAt: null,
        status: "active",
        moderationStatus: "pending",
        expiresAt: null,
      }),
    ).toBe(false);
    expect(
      isListingSeoIndexable({
        deletedAt: null,
        status: "active",
        moderationStatus: "flagged",
        expiresAt: null,
      }),
    ).toBe(false);
    expect(
      isListingSeoIndexable({
        deletedAt: null,
        status: "active",
        moderationStatus: "rejected",
        expiresAt: null,
      }),
    ).toBe(false);
    expect(
      isListingSeoIndexable({
        deletedAt: null,
        status: "active",
        moderationStatus: "approved",
        expiresAt: past,
      }),
    ).toBe(false);
    expect(
      isListingSeoIndexable({
        deletedAt: new Date(),
        status: "active",
        moderationStatus: "approved",
        expiresAt: null,
      }),
    ).toBe(false);
  });
});

describe("public copy hygiene", () => {
  const root = path.join(__dirname, "..", "..");

  function read(rel: string): string {
    return fs.readFileSync(path.join(root, rel), "utf8");
  }

  it("does not expose fabricated KPI strings on business/listings/contact/cookies", () => {
    expect(read("app/business/page.tsx")).not.toMatch(/1000\+|50K\+|95%/);
    expect(read("app/listings/page.tsx")).not.toMatch(/mii de anunțuri/i);
    expect(read("app/contact/page.tsx")).not.toMatch(/XXX XXX XXX|\[email protected\]/);
    expect(read("app/components/legal/CompanyDetailsBox.tsx")).not.toMatch(/NEXT_PUBLIC_COMPANY_/);
    expect(read("app/components/Footer.tsx")).not.toMatch(/XXX XXX XXX/);
  });
});

describe("robots.txt policy", () => {
  it("does not disallow HTML private pages (noindex is in page metadata)", () => {
    const config = robots();
    const disallow = config.rules?.flatMap((r) => r.disallow ?? []) ?? [];
    const disallowList = disallow.map((d) => (typeof d === "string" ? d : String(d)));

    for (const path of [
      "/dashboard",
      "/dashboard/",
      "/favorites",
      "/favorites/",
      "/admin",
      "/account",
      "/auth",
      "/messages",
      "/listings/new",
    ]) {
      expect(disallowList).not.toContain(path);
    }
  });

  it("does not block /_next/ assets", () => {
    const config = robots();
    const disallow = config.rules?.flatMap((r) => r.disallow ?? []) ?? [];
    const disallowList = disallow.map((d) => (typeof d === "string" ? d : String(d)));
    expect(disallowList).not.toContain("/_next/");
    expect(disallowList).not.toContain("/_next");
  });

  it("blocks /api/ technical routes", () => {
    const config = robots();
    const disallow = config.rules?.flatMap((r) => r.disallow ?? []) ?? [];
    const disallowList = disallow.map((d) => (typeof d === "string" ? d : String(d)));
    expect(disallowList).toContain("/api/");
    expect(disallowList).toContain("/api");
  });

  it("source file documents noindex-over-disallow policy", () => {
    const src = fs.readFileSync(path.join(__dirname, "..", "..", "app", "robots.ts"), "utf8");
    expect(src).not.toMatch(/["']\/dashboard/);
    expect(src).not.toMatch(/["']\/favorites/);
    expect(src).not.toMatch(/["']\/_next/);
  });
});

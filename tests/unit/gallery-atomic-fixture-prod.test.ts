/** @jest-environment node */
import fs from "node:fs";
import path from "node:path";
import { isGalleryAtomicFixtureEnabled } from "@/lib/gallery-atomic-fixture-guard";
import { privatePageMetadata } from "@/lib/seo/private-page-metadata";

describe("gallery-atomic fixture production guard", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("is disabled in production (must 404)", () => {
    process.env.NODE_ENV = "production";
    expect(isGalleryAtomicFixtureEnabled()).toBe(false);
  });

  it("is enabled in development and test for Playwright", () => {
    process.env.NODE_ENV = "development";
    expect(isGalleryAtomicFixtureEnabled()).toBe(true);
    process.env.NODE_ENV = "test";
    expect(isGalleryAtomicFixtureEnabled()).toBe(true);
  });

  it("page calls notFound when fixture is disabled", () => {
    const src = fs.readFileSync(
      path.join(
        process.cwd(),
        "app",
        "ui-demo",
        "gallery-atomic",
        "page.tsx",
      ),
      "utf8",
    );
    expect(src).toContain("isGalleryAtomicFixtureEnabled");
    expect(src).toContain("notFound");
    expect(src).not.toMatch(/prisma|fetch\(|\/api\/listings/i);
  });

  it("uses noindex,nofollow metadata and synthetic fixture photos only", () => {
    const layout = fs.readFileSync(
      path.join(
        process.cwd(),
        "app",
        "ui-demo",
        "gallery-atomic",
        "layout.tsx",
      ),
      "utf8",
    );
    expect(layout).toContain("privatePageMetadata");
    const meta = privatePageMetadata("Gallery atomic demo — ClickAnunț");
    expect(meta.robots).toMatchObject({ index: false, follow: false });

    const client = fs.readFileSync(
      path.join(
        process.cwd(),
        "app",
        "ui-demo",
        "gallery-atomic",
        "GalleryAtomicClient.tsx",
      ),
      "utf8",
    );
    expect(client).toContain("gallery-atomic-fixture");
    expect(client).not.toMatch(/de63e45e-fa79-427d-83ce-c34b2b99b0fc/i);
    expect(client).not.toMatch(/\bprisma\b|\btrackView\b/i);
    expect(client).toMatch(/ListingPhotoGallery/);
  });

  it("ui-demo remains a reserved non-sitemap category slug", () => {
    const market = fs.readFileSync(
      path.join(process.cwd(), "lib", "seo", "market-paths.ts"),
      "utf8",
    );
    expect(market).toMatch(/['"]ui-demo['"]/);
  });
});

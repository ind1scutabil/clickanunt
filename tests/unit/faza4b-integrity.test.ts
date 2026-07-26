/** @jest-environment node */
import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "../..");

describe("FAZA 4B integrity", () => {
  it("create schema does not accept video field", () => {
    const schemas = fs.readFileSync(
      path.join(ROOT, "lib/security/validation-schemas.ts"),
      "utf8"
    );
    // listingCreateBaseSchema must not declare video
    const createBlock = schemas.slice(
      schemas.indexOf("const listingCreateBaseSchema"),
      schemas.indexOf("export const listingCreateSchema")
    );
    expect(createBlock).not.toMatch(/\bvideo:/);
  });

  it("web and mobile hide non-functional video UI", () => {
    const flow = fs.readFileSync(
      path.join(ROOT, "app/components/OptimizedListingFlow.tsx"),
      "utf8"
    );
    expect(flow).toMatch(/Video: hidden/);
    expect(flow).not.toMatch(/accept=["']video\/\*["']/);

    const mobile = fs.readFileSync(
      path.join(ROOT, "apps/mobile/src/screens/ListingFormScreen.tsx"),
      "utf8"
    );
    expect(mobile).toMatch(/mediaTypes:\s*\[['"]images['"]\]/);
    expect(mobile).not.toMatch(/mediaTypes:\s*\[['"]images['"],\s*['"]videos['"]\]/);
  });

  it("layout drops bottom-nav padding when nav hidden", () => {
    const css = fs.readFileSync(path.join(ROOT, "app/globals.css"), "utf8");
    expect(css).toMatch(/data-hide-mobile-bottom-nav/);
    const nav = fs.readFileSync(
      path.join(ROOT, "app/components/MobileBottomNav.tsx"),
      "utf8"
    );
    expect(nav).toMatch(/hideMobileBottomNav/);
  });
});

describe("HEIC / MIME factual support (upload allowlist)", () => {
  it("image-upload allowlist is jpeg/png/webp only — HEIC not claimed", () => {
    const src = fs.readFileSync(
      path.join(ROOT, "lib/security/image-upload.ts"),
      "utf8"
    );
    expect(src).toMatch(/image\/jpeg/);
    expect(src).toMatch(/image\/png/);
    expect(src).toMatch(/image\/webp/);
    expect(src.toLowerCase()).not.toMatch(/image\/heic/);
    expect(src.toLowerCase()).not.toMatch(/image\/heif/);
  });
});

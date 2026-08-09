import fs from "fs";
import path from "path";
import { buildOrganizationJsonLd } from "@/lib/seo/site-jsonld";

const ROOT = path.join(__dirname, "../..");

function pngDimensions(buf: Buffer): { width: number; height: number } {
  if (buf.subarray(0, 8).toString("binary") !== "\x89PNG\r\n\x1a\n") {
    throw new Error("Not a PNG");
  }
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
  };
}

function parseIcoEntries(buf: Buffer): Array<{ width: number; height: number; isPng: boolean }> {
  const type = buf.readUInt16LE(2);
  const count = buf.readUInt16LE(4);
  expect(type).toBe(1);
  const entries = [];
  for (let i = 0; i < count; i++) {
    const off = 6 + i * 16;
    const w = buf.readUInt8(off) || 256;
    const h = buf.readUInt8(off + 1) || 256;
    const size = buf.readUInt32LE(off + 8);
    const offset = buf.readUInt32LE(off + 12);
    const payload = buf.subarray(offset, offset + size);
    const isPng = payload.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    entries.push({ width: w, height: h, isPng });
  }
  return entries;
}

const ORIGINAL_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

beforeAll(() => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://www.clickanunt.ro";
});

afterAll(() => {
  process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL_SITE_URL;
});

describe("brand favicon and logo assets", () => {
  it("keeps the full logo as an unmodified 1254×1254 PNG", () => {
    const buf = fs.readFileSync(path.join(ROOT, "public/brand/clickanunt-logo.png"));
    const { width, height } = pngDimensions(buf);
    expect(width).toBe(1254);
    expect(height).toBe(1254);
  });

  it("ships deterministic square brand icons at required sizes", () => {
    const expected: Record<string, number> = {
      "public/brand/clickanunt-favicon-96.png": 96,
      "public/brand/clickanunt-icon-192.png": 192,
      "public/brand/clickanunt-icon-512.png": 512,
      "public/brand/apple-touch-icon-180.png": 180,
    };
    for (const [rel, size] of Object.entries(expected)) {
      const buf = fs.readFileSync(path.join(ROOT, rel));
      const { width, height } = pngDimensions(buf);
      expect(width).toBe(size);
      expect(height).toBe(size);
    }
  });

  it("ships a real multi-size ICO with 16/32/48 PNG frames", () => {
    const buf = fs.readFileSync(path.join(ROOT, "public/favicon.ico"));
    expect(buf.readUInt16LE(0)).toBe(0);
    expect(buf.readUInt16LE(2)).toBe(1);
    const entries = parseIcoEntries(buf);
    expect(entries.map((e) => `${e.width}x${e.height}`)).toEqual(["16x16", "32x32", "48x48"]);
    expect(entries.every((e) => e.isPng)).toBe(true);
  });

  it("does not keep the legacy hashed app/favicon.ico source", () => {
    expect(fs.existsSync(path.join(ROOT, "app/favicon.ico"))).toBe(false);
  });

  it("exposes Organization once with ImageObject logo metadata", () => {
    const org = buildOrganizationJsonLd();
    expect(org["@type"]).toBe("Organization");
    expect(org["@id"]).toBe("https://www.clickanunt.ro/#organization");
    expect(org.alternateName).toEqual(
      expect.arrayContaining(["ClickAnunt", "clickanunt", "clickanunt.ro"]),
    );
    expect(org.url).toBe("https://www.clickanunt.ro/");
    const logo = org.logo as { "@type": string; width: number; height: number; url: string };
    expect(logo["@type"]).toBe("ImageObject");
    expect(logo.width).toBe(1254);
    expect(logo.height).toBe(1254);
    expect(logo.url).toBe("https://www.clickanunt.ro/brand/clickanunt-logo.png");
  });
});

describe("app manifest brand icons", () => {
  it("declares 192 and 512 icons via app/manifest.ts", async () => {
    const mod = await import("@/app/manifest");
    const manifest = mod.default();
    expect(manifest.name).toBe("ClickAnunț — Anunțuri gratuite în România");
    expect(manifest.short_name).toBe("ClickAnunț");
    expect(manifest.background_color).toBe("#111111");
    expect(manifest.theme_color).toBe("#111111");
    const sizes = (manifest.icons ?? []).map((i) => i.sizes);
    expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
  });
});

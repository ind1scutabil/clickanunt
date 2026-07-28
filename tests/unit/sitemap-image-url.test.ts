/** @jest-environment node */
import { canonicalizeSitemapImageUrl } from "@/lib/seo/sitemap-image-url";

const BASE = "https://www.clickanunt.ro";

describe("canonicalizeSitemapImageUrl", () => {
  it("rewrites relative /uploads path onto canonical https origin", () => {
    expect(canonicalizeSitemapImageUrl("/uploads/a.jpg", BASE)).toBe(
      "https://www.clickanunt.ro/uploads/a.jpg",
    );
  });

  it("rewrites relative api serve path", () => {
    expect(
      canonicalizeSitemapImageUrl("/api/uploads/serve?key=listings%2Fa%2Fx.jpg", BASE),
    ).toBe("https://www.clickanunt.ro/api/uploads/serve?key=listings%2Fa%2Fx.jpg");
  });

  it("rewrites http localhost uploads onto canonical", () => {
    expect(canonicalizeSitemapImageUrl("http://localhost:3000/uploads/a.jpg", BASE)).toBe(
      "https://www.clickanunt.ro/uploads/a.jpg",
    );
  });

  it("rewrites https localhost serve onto canonical", () => {
    expect(
      canonicalizeSitemapImageUrl(
        "https://localhost:3000/api/uploads/serve?key=listings%2Fa%2Fx.jpg",
        BASE,
      ),
    ).toBe("https://www.clickanunt.ro/api/uploads/serve?key=listings%2Fa%2Fx.jpg");
  });

  it("rewrites 127.0.0.1 upload paths", () => {
    expect(canonicalizeSitemapImageUrl("http://127.0.0.1:3000/uploads/a.jpg", BASE)).toBe(
      "https://www.clickanunt.ro/uploads/a.jpg",
    );
  });

  it("rewrites IPv6 loopback upload paths", () => {
    expect(canonicalizeSitemapImageUrl("http://[::1]:3000/uploads/a.jpg", BASE)).toBe(
      "https://www.clickanunt.ro/uploads/a.jpg",
    );
  });

  it("keeps canonical https upload URLs", () => {
    const u = "https://www.clickanunt.ro/api/uploads/serve?key=listings%2Fa%2Fx.jpg";
    expect(canonicalizeSitemapImageUrl(u, BASE)).toBe(u);
  });

  it("normalizes mixed-case canonical host", () => {
    expect(
      canonicalizeSitemapImageUrl("https://WWW.ClickAnunt.RO/uploads/a.jpg", BASE),
    ).toBe("https://www.clickanunt.ro/uploads/a.jpg");
  });

  it("strips fragments", () => {
    expect(canonicalizeSitemapImageUrl("/uploads/a.jpg#x", BASE)).toBe(
      "https://www.clickanunt.ro/uploads/a.jpg",
    );
  });

  it("rejects foreign hosts", () => {
    expect(canonicalizeSitemapImageUrl("https://evil.example/uploads/a.jpg", BASE)).toBeNull();
    expect(
      canonicalizeSitemapImageUrl("https://evil.example/api/uploads/serve?key=x", BASE),
    ).toBeNull();
  });

  it("rejects protocol-relative foreign hosts", () => {
    expect(canonicalizeSitemapImageUrl("//evil.example/uploads/a.jpg", BASE)).toBeNull();
  });

  it("rejects subdomain spoof", () => {
    expect(
      canonicalizeSitemapImageUrl("https://www.clickanunt.ro.evil.example/uploads/a.jpg", BASE),
    ).toBeNull();
  });

  it("rejects credentials in URL", () => {
    expect(
      canonicalizeSitemapImageUrl("https://user:pass@www.clickanunt.ro/uploads/a.jpg", BASE),
    ).toBeNull();
  });

  it("rejects forbidden schemes", () => {
    expect(canonicalizeSitemapImageUrl("javascript:alert(1)", BASE)).toBeNull();
    expect(canonicalizeSitemapImageUrl("data:image/png;base64,aaa", BASE)).toBeNull();
    expect(canonicalizeSitemapImageUrl("file:///etc/passwd", BASE)).toBeNull();
  });

  it("rejects non-upload paths even on canonical host", () => {
    expect(canonicalizeSitemapImageUrl("https://www.clickanunt.ro/listings/x", BASE)).toBeNull();
    expect(canonicalizeSitemapImageUrl("/admin/secret", BASE)).toBeNull();
    expect(canonicalizeSitemapImageUrl("/api/health", BASE)).toBeNull();
  });

  it("rejects non-default ports on canonical host", () => {
    expect(
      canonicalizeSitemapImageUrl("https://www.clickanunt.ro:8443/uploads/a.jpg", BASE),
    ).toBeNull();
  });

  it("rejects path traversal and double-encoded traversal", () => {
    expect(canonicalizeSitemapImageUrl("/uploads/../etc/passwd", BASE)).toBeNull();
    expect(
      canonicalizeSitemapImageUrl("/api/uploads/serve?key=..%2F..%2Fetc%2Fpasswd", BASE),
    ).toBeNull();
    expect(
      canonicalizeSitemapImageUrl(
        "/api/uploads/serve?key=%252e%252e%252fetc%252fpasswd",
        BASE,
      ),
    ).toBeNull();
  });

  it("rejects extra query params on serve endpoint", () => {
    expect(
      canonicalizeSitemapImageUrl(
        "/api/uploads/serve?key=listings%2Fa.jpg&redirect=https://evil.example",
        BASE,
      ),
    ).toBeNull();
  });

  it("rejects empty serve key", () => {
    expect(canonicalizeSitemapImageUrl("/api/uploads/serve?key=", BASE)).toBeNull();
    expect(canonicalizeSitemapImageUrl("/api/uploads/serve", BASE)).toBeNull();
  });

  it("rejects malformed / empty / nullish", () => {
    expect(canonicalizeSitemapImageUrl("", BASE)).toBeNull();
    expect(canonicalizeSitemapImageUrl("   ", BASE)).toBeNull();
    expect(canonicalizeSitemapImageUrl("https://", BASE)).toBeNull();
    expect(canonicalizeSitemapImageUrl("not a url :::@@@", BASE)).toBeNull();
    // @ts-expect-error intentional
    expect(canonicalizeSitemapImageUrl(null, BASE)).toBeNull();
    // @ts-expect-error intentional
    expect(canonicalizeSitemapImageUrl(undefined, BASE)).toBeNull();
  });

  it("rejects http on canonical host (must be https output)", () => {
    expect(canonicalizeSitemapImageUrl("http://www.clickanunt.ro/uploads/a.jpg", BASE)).toBeNull();
  });

  it("does not perform network I/O (pure function)", () => {
    const before = performance.now();
    for (let i = 0; i < 100; i++) {
      canonicalizeSitemapImageUrl("https://evil.example/uploads/a.jpg", BASE);
      canonicalizeSitemapImageUrl("http://localhost:3000/uploads/a.jpg", BASE);
    }
    expect(performance.now() - before).toBeLessThan(500);
  });
});

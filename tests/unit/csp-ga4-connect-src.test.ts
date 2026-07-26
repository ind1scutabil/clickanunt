import { getCSPHeader } from "@/lib/security/headers";

function directiveValues(csp: string, name: string): string[] {
  const part = csp
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${name} `));
  if (!part) return [];
  return part.slice(name.length).trim().split(/\s+/).filter(Boolean);
}

describe("CSP GA4 + Clarity connect-src", () => {
  const csp = getCSPHeader("www.clickanunt.ro");
  const connect = directiveValues(csp, "connect-src");
  const script = directiveValues(csp, "script-src");

  it("allows observed GA4 regional collect host pattern in connect-src", () => {
    expect(connect).toContain("https://*.google-analytics.com");
    expect(connect).toContain("https://*.analytics.google.com");
    expect(connect).toContain("https://www.googletagmanager.com");
  });

  it("allows Clarity hosts documented by Microsoft", () => {
    expect(connect).toContain("https://*.clarity.ms");
    expect(connect).toContain("https://c.bing.com");
    expect(script).toContain("https://www.clarity.ms");
    expect(script).toContain("https://scripts.clarity.ms");
  });

  it("allows gtag script host in script-src", () => {
    expect(script).toContain("https://www.googletagmanager.com");
  });

  it("does not use connect-src * or arbitrary open hosts", () => {
    expect(connect).not.toContain("*");
    expect(connect.some((v) => v === "https:" || v === "http:" || v === "data:")).toBe(false);
    expect(
      connect.every(
        (v) => v === "'self'" || v.startsWith("https://") || v === "ws:" || v === "wss:"
      )
    ).toBe(true);
  });

  it("keeps hostile origins and ad networks blocked", () => {
    expect(connect.join(" ")).not.toMatch(/evil\.example|attacker\.com|doubleclick|googlesyndication/i);
    expect(connect).not.toContain("https://evil.example");
    expect(script.join(" ")).not.toMatch(/doubleclick|googlesyndication/i);
  });

  it("emits a single CSP string without duplicated connect-src directives", () => {
    const connects = csp.match(/connect-src\s/g) || [];
    expect(connects).toHaveLength(1);
  });
});

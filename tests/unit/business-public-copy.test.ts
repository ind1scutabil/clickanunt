/** @jest-environment node */
import { readFileSync } from "fs";
import path from "path";

describe("business page — no invented commercial claims", () => {
  const src = readFileSync(path.join(process.cwd(), "app/business/page.tsx"), "utf8");

  it("does not publish invented prices, discounts, or undelivered enterprise claims", () => {
    expect(src).not.toMatch(/\b299\b/);
    expect(src).not.toMatch(/\b799\b/);
    expect(src).not.toMatch(/2 luni gratuit/i);
    expect(src).not.toMatch(/RON\/lun/i);
    expect(src).not.toMatch(/\bSLA\b/i);
    expect(src).not.toMatch(/Top\s*3|Top\s*10/i);
    expect(src).not.toMatch(/\bCSV\b/i);
    expect(src).not.toMatch(/bulk upload|API bulk/i);
    expect(src).not.toMatch(/white-?label/i);
    expect(src).not.toMatch(/account manager|manager dedicat/i);
    expect(src).not.toMatch(/sub 24h|mai puțin de 24h|setup garantat/i);
    expect(src).not.toMatch(/price_[A-Za-z0-9]+/);
    expect(src).not.toMatch(/stripe\.com|create-intent/i);
  });

  it("uses solicit-offer CTAs to /contact with factual commercial copy", () => {
    expect(src).toContain("Solicită ofertă");
    expect(src).toContain('href="/contact"');
    expect(src).toContain("Detaliile comerciale se stabilesc în funcție de necesarul companiei");
    expect(src).toContain("OFFER_CARDS");
    expect(src).not.toContain("PLANS");
  });
});

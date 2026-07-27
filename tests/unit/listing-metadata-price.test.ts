/** @jest-environment node */
import { readFileSync } from "fs";
import path from "path";
import { formatListingPrice } from "@/lib/format-listing-price";
import { Prisma } from "@prisma/client";

function majorUnitFromUnknown(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  if (value instanceof Prisma.Decimal) return value.toNumber();
  if (
    typeof value === "object" &&
    value !== null &&
    "toNumber" in value &&
    typeof (value as { toNumber: () => number }).toNumber === "function"
  ) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return null;
}

describe("listing metadata price — major units", () => {
  it("formatListingPrice formats major units without dividing by 100", () => {
    expect(formatListingPrice(22, "EUR")).toBe("22 EUR");
    expect(formatListingPrice(1200, "RON")).toBe("1.200 RON");
    expect(formatListingPrice(2500, "RON")).toBe("2.500 RON");
    expect(formatListingPrice(3500, "EUR")).toBe("3.500 EUR");
    expect(formatListingPrice(10290, "EUR")).toBe("10.290 EUR");
    expect(formatListingPrice(17000, "EUR")).toBe("17.000 EUR");
    expect(formatListingPrice(101000, "EUR")).toBe("101.000 EUR");
    expect(formatListingPrice(110000, "RON")).toBe("110.000 RON");
    expect(formatListingPrice(99.5, "EUR")).toBe("100 EUR");
  });

  it("accepts Prisma Decimal / string / number inputs as major units", () => {
    expect(majorUnitFromUnknown(10290)).toBe(10290);
    expect(majorUnitFromUnknown("10290")).toBe(10290);
    expect(majorUnitFromUnknown(new Prisma.Decimal("10290"))).toBe(10290);
    expect(majorUnitFromUnknown(new Prisma.Decimal(2500))).toBe(2500);
    expect(formatListingPrice(majorUnitFromUnknown(new Prisma.Decimal("17000"))!, "EUR")).toBe(
      "17.000 EUR",
    );
    expect(formatListingPrice(0, "EUR")).toBe("Negociabil");
    expect(formatListingPrice(Number.NaN, "RON")).toBe("Negociabil");
  });

  it("does not double currency codes", () => {
    const eur = formatListingPrice(10290, "EUR");
    const ron = formatListingPrice(2500, "RON");
    expect(eur).not.toMatch(/EUR\s*EUR/);
    expect(ron).not.toMatch(/RON\s*RON/);
    expect(eur).toBe("10.290 EUR");
    expect(ron).toBe("2.500 RON");
  });

  it("listing layout metadata uses formatListingCommercialOrSalaryLine and does not divide by 100", () => {
    const src = readFileSync(
      path.join(process.cwd(), "app/listings/[id]/layout.tsx"),
      "utf8",
    );
    expect(src).toContain('from "@/lib/format-listing-price"');
    expect(src).toContain("formatListingCommercialOrSalaryLine(");
    expect(src).not.toMatch(/priceAmount\s*\/\s*100/);
    expect(src).not.toMatch(/\/\s*100/);
  });

  it("opengraph-image uses formatListingCommercialOrSalaryLine and does not divide by 100", () => {
    const src = readFileSync(
      path.join(process.cwd(), "app/listings/[id]/opengraph-image.tsx"),
      "utf8",
    );
    expect(src).toContain('from "@/lib/format-listing-price"');
    expect(src).toContain("formatListingCommercialOrSalaryLine(");
    expect(src).not.toMatch(/priceAmount\s*\/\s*100/);
    expect(src).not.toMatch(/\/\s*100/);
  });

  it("ListingJsonLd Offer.price uses factual commercial helper (major units)", () => {
    const src = readFileSync(
      path.join(process.cwd(), "app/listings/[id]/ListingJsonLd.tsx"),
      "utf8",
    );
    expect(src).toContain("buildCommercialOfferPriceFields");
    expect(src).toContain("buildJobBaseSalaryJsonLd");
    expect(src).not.toMatch(/priceAmount\s*\/\s*100/);
    expect(src).toContain("offerPrice.priceCurrency");
  });
});

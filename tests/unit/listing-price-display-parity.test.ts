/** @jest-environment node */
import {
  formatListingCommercialOrSalaryLine,
  formatListingPrice,
  formatListingPublicPriceLine,
} from "@/lib/format-listing-price";
import { buildCommercialOfferPriceFields } from "@/lib/seo/listing-offer-jsonld";
import { readFileSync } from "fs";
import path from "path";

/**
 * priceAmount is stored and displayed as major currency units (RON/EUR whole amounts),
 * not Stripe-style minor units (bani/cents).
 */
describe("listing price display parity matrix", () => {
  const cases: Array<{
    name: string;
    input: Parameters<typeof formatListingPublicPriceLine>[0];
    display: string;
    jsonLd: { price: number; priceCurrency: string } | null;
  }> = [
    {
      name: "FIXED RON 2500",
      input: { priceType: "FIXED", priceAmount: 2500, priceCurrency: "RON", category: "Auto" },
      display: "2.500 RON",
      jsonLd: { price: 2500, priceCurrency: "RON" },
    },
    {
      name: "FIXED EUR 10290 (Peugeot)",
      input: { priceType: "FIXED", priceAmount: 10290, priceCurrency: "EUR", category: "Auto" },
      display: "10.290 EUR",
      jsonLd: { price: 10290, priceCurrency: "EUR" },
    },
    {
      name: "FIXED EUR 22",
      input: { priceType: "FIXED", priceAmount: 22, priceCurrency: "EUR", category: "Electronice" },
      display: "22 EUR",
      jsonLd: { price: 22, priceCurrency: "EUR" },
    },
    {
      name: "FIXED RON 110000",
      input: { priceType: "FIXED", priceAmount: 110000, priceCurrency: "RON", category: "Imobiliare" },
      display: "110.000 RON",
      jsonLd: { price: 110000, priceCurrency: "RON" },
    },
    {
      name: "NEGOTIABLE with amount",
      input: { priceType: "NEGOTIABLE", priceAmount: 2500, priceCurrency: "RON", category: "Auto" },
      display: "2.500 RON · Negociabil",
      jsonLd: { price: 2500, priceCurrency: "RON" },
    },
    {
      name: "NEGOTIABLE without amount",
      input: { priceType: "NEGOTIABLE", priceAmount: null, priceCurrency: "RON", category: "Auto" },
      display: "Negociabil",
      jsonLd: null,
    },
    {
      name: "FROM",
      input: { priceType: "FROM", priceAmount: 10290, priceCurrency: "EUR", category: "Auto" },
      display: "De la 10.290 EUR",
      jsonLd: { price: 10290, priceCurrency: "EUR" },
    },
    {
      name: "FREE",
      input: { priceType: "FREE", priceAmount: null, priceCurrency: "RON", category: "Casă și grădină" },
      display: "Gratuit",
      jsonLd: null,
    },
    {
      name: "ON_REQUEST",
      input: { priceType: "ON_REQUEST", priceAmount: 999, priceCurrency: "RON", category: "Auto" },
      display: "Preț la cerere",
      jsonLd: null,
    },
    {
      name: "Job salary exact",
      input: {
        category: "Locuri de muncă",
        salaryMin: 5000,
        salaryMax: 5000,
        salaryCurrency: "RON",
        salaryPeriod: "MONTH",
      },
      display: "5.000 RON · /lună",
      jsonLd: null,
    },
    {
      name: "Job salary interval",
      input: {
        category: "Locuri de muncă",
        salaryMin: 4000,
        salaryMax: 6000,
        salaryCurrency: "RON",
        salaryPeriod: "MONTH",
      },
      display: "4.000–6.000 RON · /lună",
      jsonLd: null,
    },
    {
      name: "Job legacy text",
      input: {
        category: "Locuri de muncă",
        legacySalaryRange: "negociabil după experiență",
      },
      display: "negociabil după experiență · detalii text",
      jsonLd: null,
    },
  ];

  it.each(cases)("$name — card/detail/metadata line", ({ input, display }) => {
    const line = formatListingCommercialOrSalaryLine(input);
    const publicLine = formatListingPublicPriceLine(input);
    expect(publicLine).toBe(display);
    expect(publicLine).toBe(line.suffix ? `${line.primary} · ${line.suffix}` : line.primary);
    // Never invent cents formatting for listing prices
    expect(publicLine).not.toMatch(/\d+\.\d{2}\s+(EUR|RON)\b/);
    expect(publicLine).not.toContain("102.90");
  });

  it.each(cases)("$name — JSON-LD Offer.price", ({ input, jsonLd }) => {
    expect(buildCommercialOfferPriceFields(input)).toEqual(jsonLd);
  });

  it("formatListingPrice never divides by 100", () => {
    expect(formatListingPrice(10290, "EUR")).toBe("10.290 EUR");
    expect(formatListingPrice(10290, "EUR")).not.toBe("102.90 EUR");
  });

  it("metadata/layout/og use formatListingPublicPriceLine without /100", () => {
    for (const rel of [
      "app/listings/[id]/layout.tsx",
      "app/listings/[id]/opengraph-image.tsx",
    ]) {
      const src = readFileSync(path.join(process.cwd(), rel), "utf8");
      expect(src).toContain("formatListingPublicPriceLine");
      expect(src).not.toMatch(/priceAmount\s*\/\s*100/);
    }
  });
});

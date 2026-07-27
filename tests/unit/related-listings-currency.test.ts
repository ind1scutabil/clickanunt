/** @jest-environment node */
import {
  COMPARABLE_COMMERCIAL_PRICE_TYPES,
  isComparableCommercialPriceType,
  relatedPriceBandWhere,
  resolveRelatedPriceBand,
  RELATED_PRICE_BAND_RATIO,
  sqlComparableCommercialPriceType,
} from "@/lib/listings/comparable-commercial-price";
import { relatedListingsWhereForTest } from "@/lib/seo/related-listings";
import { Prisma } from "@prisma/client";

describe("comparable commercial price policy", () => {
  it("treats legacy null and FIXED/NEGOTIABLE/FROM as comparable", () => {
    expect(isComparableCommercialPriceType(null)).toBe(true);
    expect(isComparableCommercialPriceType(undefined)).toBe(true);
    expect(isComparableCommercialPriceType("FIXED")).toBe(true);
    expect(isComparableCommercialPriceType("NEGOTIABLE")).toBe(true);
    expect(isComparableCommercialPriceType("FROM")).toBe(true);
    expect(isComparableCommercialPriceType("FREE")).toBe(false);
    expect(isComparableCommercialPriceType("ON_REQUEST")).toBe(false);
    expect([...COMPARABLE_COMMERCIAL_PRICE_TYPES]).toEqual([
      "FIXED",
      "NEGOTIABLE",
      "FROM",
    ]);
  });

  it("keeps ±25% ratio", () => {
    expect(RELATED_PRICE_BAND_RATIO).toBe(0.25);
  });

  it("SQL fragment lists comparable types only", () => {
    const sql = sqlComparableCommercialPriceType();
    const flat = sql.strings.join("") + sql.values.join("");
    expect(flat).toContain("FIXED");
    expect(flat).toContain("NEGOTIABLE");
    expect(flat).toContain("FROM");
    expect(flat).not.toContain("FREE");
  });
});

describe("resolveRelatedPriceBand", () => {
  const base = {
    category: "Electronice și electrocasnice",
    priceAmount: 1000,
    priceCurrency: "RON",
    priceType: "FIXED" as string | null,
  };

  it("applies RON band for FIXED source", () => {
    const band = resolveRelatedPriceBand(base);
    expect(band).toEqual({
      mode: "band",
      currency: "RON",
      amount: 1000,
      bandLow: 750,
      bandHigh: 1250,
    });
  });

  it("applies EUR band for EUR source", () => {
    const band = resolveRelatedPriceBand({
      ...base,
      priceCurrency: "EUR",
      priceAmount: 1000,
    });
    expect(band.mode).toBe("band");
    if (band.mode === "band") {
      expect(band.currency).toBe("EUR");
      expect(band.bandLow).toBe(750);
      expect(band.bandHigh).toBe(1250);
    }
  });

  it("allows NEGOTIABLE, FROM, and legacy null type", () => {
    expect(
      resolveRelatedPriceBand({ ...base, priceType: "NEGOTIABLE" }).mode
    ).toBe("band");
    expect(resolveRelatedPriceBand({ ...base, priceType: "FROM" }).mode).toBe(
      "band"
    );
    expect(resolveRelatedPriceBand({ ...base, priceType: null }).mode).toBe(
      "band"
    );
  });

  it("does not invent a band for FREE / ON_REQUEST / null amount / missing currency", () => {
    expect(
      resolveRelatedPriceBand({ ...base, priceType: "FREE", priceAmount: null })
        .mode
    ).toBe("taxonomy");
    expect(
      resolveRelatedPriceBand({
        ...base,
        priceType: "ON_REQUEST",
        priceAmount: null,
      }).mode
    ).toBe("taxonomy");
    expect(
      resolveRelatedPriceBand({ ...base, priceAmount: null }).mode
    ).toBe("taxonomy");
    expect(
      resolveRelatedPriceBand({ ...base, priceCurrency: null }).mode
    ).toBe("taxonomy");
    expect(
      resolveRelatedPriceBand({ ...base, priceCurrency: "  " }).mode
    ).toBe("taxonomy");
  });

  it("does not invent a band for Jobs salary sources", () => {
    expect(
      resolveRelatedPriceBand({
        category: "Locuri de muncă",
        priceAmount: 5000,
        priceCurrency: "RON",
        priceType: null,
      }).mode
    ).toBe("taxonomy");
  });
});

describe("relatedPriceBandWhere / relatedListingsWhereForTest", () => {
  it("requires matching currency inside the band where", () => {
    const band = resolveRelatedPriceBand({
      category: "Electronice și electrocasnice",
      priceAmount: 1000,
      priceCurrency: "RON",
      priceType: "FIXED",
    });
    expect(band.mode).toBe("band");
    if (band.mode !== "band") return;
    const frag = relatedPriceBandWhere(band);
    expect(frag.priceCurrency).toBe("RON");
    expect(frag.priceAmount).toEqual({ gte: 750, lte: 1250 });
  });

  it("band-applied related where includes priceCurrency and excludes source id", () => {
    const where = relatedListingsWhereForTest(
      {
        id: "src-1",
        category: "Electronice și electrocasnice",
        city: "Cluj-Napoca",
        priceAmount: 1000,
        priceCurrency: "RON",
        priceType: "FIXED",
      },
      { includeCity: true, applyBand: true }
    );
    expect(where.category).toBe("Electronice și electrocasnice");
    expect(where.city).toBe("Cluj-Napoca");
    expect(where.id).toEqual({ not: "src-1" });
    expect(where.status).toBe("active");
    expect(where.deletedAt).toBeNull();
    expect(where.moderationStatus).toBe("approved");
    const and = where.AND as Prisma.ListingWhereInput[];
    expect(Array.isArray(and)).toBe(true);
    const bandClause = and.find(
      (c) => c && typeof c === "object" && "priceCurrency" in c
    ) as Prisma.ListingWhereInput | undefined;
    expect(bandClause?.priceCurrency).toBe("RON");
    expect(bandClause?.priceAmount).toEqual({ gte: 750, lte: 1250 });
  });

  it("taxonomy path omits priceCurrency band", () => {
    const where = relatedListingsWhereForTest(
      {
        id: "src-free",
        category: "Altele",
        city: null,
        priceAmount: null,
        priceCurrency: null,
        priceType: "FREE",
      },
      { includeCity: false, applyBand: true }
    );
    const and = (where.AND || []) as Prisma.ListingWhereInput[];
    expect(
      and.some((c) => c && typeof c === "object" && "priceCurrency" in c)
    ).toBe(false);
  });
});

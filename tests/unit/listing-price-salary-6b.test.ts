/** @jest-environment node */
import { normalizeDraftMoneyFields } from "@/lib/listing-draft-money";
import { PRICE_TYPES, SALARY_PERIODS } from "@/lib/listing-price-salary-policy";
import { PriceType, SalaryPeriod } from "@prisma/client";
import { draftCreateSchema } from "@/lib/security/validation-schemas";
import { prismaOrderByForListingSort } from "@/lib/listing-feed-sort";
import { readFileSync } from "fs";
import path from "path";

describe("enum parity Prisma ↔ contracts", () => {
  it("PriceType values match", () => {
    expect([...PRICE_TYPES].sort()).toEqual(
      Object.values(PriceType).sort()
    );
  });
  it("SalaryPeriod values match", () => {
    expect([...SALARY_PERIODS].sort()).toEqual(
      Object.values(SalaryPeriod).sort()
    );
  });
});

describe("normalizeDraftMoneyFields", () => {
  it("keeps null amount (does not coerce to 0)", () => {
    expect(
      normalizeDraftMoneyFields({
        category: "Electronice și electrocasnice",
        subcategory: "Telefoane mobile",
        priceType: "FREE",
        priceAmount: null,
      }).priceAmount
    ).toBeNull();
  });

  it("maps undefined amount without inventing 0 for ON_REQUEST", () => {
    const n = normalizeDraftMoneyFields({
      category: "Servicii",
      subcategory: "Reparații",
      priceType: "ON_REQUEST",
    });
    expect(n.priceType).toBe("ON_REQUEST");
    expect(n.priceAmount).toBeNull();
  });

  it("keeps FIXED amount", () => {
    const n = normalizeDraftMoneyFields({
      category: "Electronice și electrocasnice",
      subcategory: "Telefoane mobile",
      priceType: "FIXED",
      priceAmount: 100,
      priceCurrency: "RON",
    });
    expect(n).toMatchObject({
      priceType: "FIXED",
      priceAmount: 100,
      priceCurrency: "RON",
    });
  });

  it("legacy non-Job amount → FIXED", () => {
    expect(
      normalizeDraftMoneyFields({
        category: "Electronice și electrocasnice",
        subcategory: "Telefoane mobile",
        priceAmount: 50,
        priceCurrency: "EUR",
      })
    ).toMatchObject({ priceType: "FIXED", priceAmount: 50 });
  });

  it("Job structured salary clears product price", () => {
    const n = normalizeDraftMoneyFields({
      category: "Locuri de muncă",
      subcategory: "IT/Software",
      priceAmount: 8000,
      salaryMin: 5000,
      salaryMax: 5000,
      salaryCurrency: "RON",
      salaryPeriod: "MONTH",
    });
    expect(n.priceAmount).toBeNull();
    expect(n.salaryMin).toBe(5000);
    expect(n.salaryPeriod).toBe("MONTH");
  });

  it("Job legacy amount without salary kept as legacy placeholder", () => {
    const n = normalizeDraftMoneyFields({
      category: "Locuri de muncă",
      subcategory: "IT/Software",
      priceAmount: 8000,
    });
    expect(n.priceType).toBeNull();
    expect(n.priceAmount).toBe(8000);
    expect(n.salaryMin).toBeNull();
  });
});

describe("draftCreateSchema", () => {
  it("accepts null priceAmount", () => {
    expect(draftCreateSchema.safeParse({ priceAmount: null }).success).toBe(true);
  });
  it("accepts FREE priceType without amount", () => {
    expect(
      draftCreateSchema.safeParse({
        category: "Altele",
        priceType: "FREE",
        priceAmount: null,
      }).success
    ).toBe(true);
  });
  it("does not coerce missing priceAmount to 0", () => {
    const parsed = draftCreateSchema.safeParse({ title: "x" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.priceAmount).toBeUndefined();
    }
  });
});

describe("price sort nulls last", () => {
  it("priceAsc uses nulls last", () => {
    expect(prismaOrderByForListingSort("priceAsc")[0]).toEqual({
      priceAmount: { sort: "asc", nulls: "last" },
    });
  });
  it("priceDesc uses nulls last", () => {
    expect(prismaOrderByForListingSort("priceDesc")[0]).toEqual({
      priceAmount: { sort: "desc", nulls: "last" },
    });
  });
});

describe("draft route does not use || 0", () => {
  it("source omits priceAmount || 0", () => {
    const src = readFileSync(
      path.join(process.cwd(), "app/api/listings/draft/route.ts"),
      "utf8"
    );
    expect(src).not.toMatch(/priceAmount\s*\|\|\s*0/);
    expect(src).toContain("normalizeDraftMoneyFields");
  });
});

describe("input-validation listingValidationSchema is example-only", () => {
  it("is imported only by route.example.ts among app/api", () => {
    const example = readFileSync(
      path.join(process.cwd(), "app/api/listings/create/route.example.ts"),
      "utf8"
    );
    expect(example).toContain("listingValidationSchema");
    const activeCreate = readFileSync(
      path.join(process.cwd(), "app/api/listings/route.ts"),
      "utf8"
    );
    expect(activeCreate).not.toContain("listingValidationSchema");
    expect(activeCreate).toContain("listingCreateSchema");
  });
});

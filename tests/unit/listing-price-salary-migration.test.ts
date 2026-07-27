/** @jest-environment node */
import { readFileSync } from "fs";
import path from "path";

describe("listing price/salary migration SQL", () => {
  const sql = readFileSync(
    path.join(
      process.cwd(),
      "prisma/migrations/20260726230000_listing_price_type_and_salary/migration.sql"
    ),
    "utf8"
  );

  it("is expand-only (no DROP TABLE / destructive column drops)", () => {
    expect(sql).not.toMatch(/DROP\s+TABLE/i);
    expect(sql).not.toMatch(/DROP\s+COLUMN/i);
    expect(sql).toMatch(/CREATE TYPE "PriceType"/);
    expect(sql).toMatch(/CREATE TYPE "SalaryPeriod"/);
    expect(sql).toMatch(/ALTER COLUMN "priceAmount" DROP NOT NULL/);
  });

  it("backfills FIXED only for non-Job amount > 0", () => {
    expect(sql).toMatch(/SET "priceType" = 'FIXED'/);
    expect(sql).toMatch(/"category" <> 'Locuri de muncă'/);
    expect(sql).toMatch(/"priceAmount" > 0/);
    expect(sql).not.toMatch(/SET "salaryMin"/);
    expect(sql).not.toMatch(/SET "salaryMax"/);
  });

  it("does not invent FREE/ON_REQUEST/salaryPeriod in backfill", () => {
    expect(sql).not.toMatch(/priceType.*=.*'FREE'/);
    expect(sql).not.toMatch(/priceType.*=.*'ON_REQUEST'/);
    expect(sql).not.toMatch(/SET "salaryPeriod"/);
  });
});

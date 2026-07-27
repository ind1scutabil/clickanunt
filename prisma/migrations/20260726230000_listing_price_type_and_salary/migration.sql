-- Expand-only: commercial priceType + optional structured salary for Jobs.
-- Does NOT apply on production from this branch. Forward-only; no data invented for FREE/ON_REQUEST.

CREATE TYPE "PriceType" AS ENUM ('FIXED', 'NEGOTIABLE', 'FREE', 'ON_REQUEST', 'FROM');
CREATE TYPE "SalaryPeriod" AS ENUM ('HOUR', 'DAY', 'WEEK', 'MONTH', 'YEAR');

ALTER TABLE "listings" ADD COLUMN "priceType" "PriceType";
ALTER TABLE "listings" ADD COLUMN "salaryMin" INTEGER;
ALTER TABLE "listings" ADD COLUMN "salaryMax" INTEGER;
ALTER TABLE "listings" ADD COLUMN "salaryCurrency" TEXT;
ALTER TABLE "listings" ADD COLUMN "salaryPeriod" "SalaryPeriod";

-- Allow null commercial amounts (FREE / ON_REQUEST / Jobs without product price).
ALTER TABLE "listings" ALTER COLUMN "priceAmount" DROP NOT NULL;
ALTER TABLE "listings" ALTER COLUMN "priceCurrency" DROP NOT NULL;

-- Backfill non-Job commercial listings with amount > 0 → FIXED.
-- Jobs keep priceAmount as legacy numeric placeholder; priceType stays NULL (no invented salaryPeriod).
UPDATE "listings"
SET "priceType" = 'FIXED'
WHERE "priceAmount" IS NOT NULL
  AND "priceAmount" > 0
  AND "category" <> 'Locuri de muncă';

CREATE INDEX "listings_priceType_idx" ON "listings"("priceType");
CREATE INDEX "listings_salaryMin_idx" ON "listings"("salaryMin");
CREATE INDEX "listings_salaryMax_idx" ON "listings"("salaryMax");
CREATE INDEX "listings_status_priceType_priceAmount_idx" ON "listings"("status", "priceType", "priceAmount");

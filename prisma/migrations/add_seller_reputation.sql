-- Migration: Add seller reputation fields
-- Created: 2026-02-05
-- Purpose: Track seller activity and reputation metrics

-- Add seller reputation fields
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "responseRate" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totalSales" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totalListings" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0.0;

-- Create index for lastActiveAt (for finding active sellers)
CREATE INDEX IF NOT EXISTS "users_lastActiveAt_idx" ON "users"("lastActiveAt");

-- Create index for responseRate (for filtering responsive sellers)
CREATE INDEX IF NOT EXISTS "users_responseRate_idx" ON "users"("responseRate");

-- Update totalListings for existing users
UPDATE "users" u
SET "totalListings" = (
  SELECT COUNT(*) 
  FROM "listings" l 
  WHERE l."ownerUserId" = u.id
);

-- Analyze table
ANALYZE "users";

-- Migration: Add search performance indexes
-- Created: 2026-02-05
-- Purpose: Improve listing search and filter performance

-- Add individual indexes for common filters
CREATE INDEX IF NOT EXISTS "listings_city_idx" ON "listings"("city");
CREATE INDEX IF NOT EXISTS "listings_year_idx" ON "listings"("year");
CREATE INDEX IF NOT EXISTS "listings_priceAmount_idx" ON "listings"("priceAmount");

-- Add compound indexes for common query patterns
CREATE INDEX IF NOT EXISTS "listings_category_city_idx" ON "listings"("category", "city");
CREATE INDEX IF NOT EXISTS "listings_status_priceAmount_idx" ON "listings"("status", "priceAmount");
CREATE INDEX IF NOT EXISTS "listings_status_createdAt_idx" ON "listings"("status", "createdAt");

-- Analyze table after adding indexes
ANALYZE "listings";

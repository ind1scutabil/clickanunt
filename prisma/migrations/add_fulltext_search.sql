-- Migration: Add full-text search support
-- Created: 2026-02-05
-- Purpose: Enable fast text search on listings title and description

-- Add tsvector column for search
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "search_vector" tsvector;

-- Create function to update search vector
CREATE OR REPLACE FUNCTION listings_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('romanian', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('romanian', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('romanian', coalesce(NEW.make, '')), 'C') ||
    setweight(to_tsvector('romanian', coalesce(NEW.model, '')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update search vector on insert/update
DROP TRIGGER IF EXISTS listings_search_vector_trigger ON "listings";
CREATE TRIGGER listings_search_vector_trigger 
  BEFORE INSERT OR UPDATE ON "listings"
  FOR EACH ROW EXECUTE FUNCTION listings_search_vector_update();

-- Update existing rows
UPDATE "listings" SET "updatedAt" = "updatedAt";

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS "listings_search_vector_idx" ON "listings" USING GIN ("search_vector");

-- Analyze table
ANALYZE "listings";

-- Idempotent repair: ensure listings.search_vector + full-text search support exist.
-- Safe when 20260212_002_add_fulltext_search already applied (IF NOT EXISTS / OR REPLACE).

ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "search_vector" tsvector;

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

DROP TRIGGER IF EXISTS listings_search_vector_trigger ON "listings";
CREATE TRIGGER listings_search_vector_trigger
  BEFORE INSERT OR UPDATE ON "listings"
  FOR EACH ROW EXECUTE FUNCTION listings_search_vector_update();

-- Backfill rows where vector is still null (fires trigger)
UPDATE "listings" SET "title" = "title" WHERE "search_vector" IS NULL;

CREATE INDEX IF NOT EXISTS "listings_search_vector_idx" ON "listings" USING GIN ("search_vector");
ANALYZE "listings";

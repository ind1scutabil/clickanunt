-- Feed keyset + indexi pentru scalare (milions de anunțuri / mesaje)

ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "feedBoost" INTEGER NOT NULL DEFAULT 0;

UPDATE "listings"
SET "feedBoost" = CASE
  WHEN "isPromoted" = true THEN 1000
  WHEN "isFeatured" = true THEN 100
  ELSE 0
END
WHERE "feedBoost" = 0 OR "feedBoost" IS NULL;

CREATE INDEX IF NOT EXISTS "listings_status_feedBoost_createdAt_id_idx"
  ON "listings" ("status", "feedBoost" DESC, "createdAt" DESC, "id" DESC);

CREATE INDEX IF NOT EXISTS "messages_conversationId_createdAt_idx"
  ON "messages" ("conversationId", "createdAt");

CREATE INDEX IF NOT EXISTS "messages_receiverId_isRead_idx"
  ON "messages" ("receiverId", "isRead");

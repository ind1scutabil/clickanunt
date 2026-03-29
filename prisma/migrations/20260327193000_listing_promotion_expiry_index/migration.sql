-- Index pentru job-ul de expirare promovări: WHERE isPromoted AND promotionExpiresAt < now
CREATE INDEX IF NOT EXISTS "listings_isPromoted_promotionExpiresAt_idx" ON "listings" ("isPromoted", "promotionExpiresAt");

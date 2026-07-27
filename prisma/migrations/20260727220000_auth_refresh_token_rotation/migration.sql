-- Expand-only: single-use refresh token persistence (hash only).
CREATE TABLE IF NOT EXISTS "auth_refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "replacedById" TEXT,
    "revokeReason" TEXT,
    CONSTRAINT "auth_refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "auth_refresh_tokens_tokenHash_key" ON "auth_refresh_tokens"("tokenHash");
CREATE INDEX IF NOT EXISTS "auth_refresh_tokens_userId_idx" ON "auth_refresh_tokens"("userId");
CREATE INDEX IF NOT EXISTS "auth_refresh_tokens_familyId_idx" ON "auth_refresh_tokens"("familyId");
CREATE INDEX IF NOT EXISTS "auth_refresh_tokens_expiresAt_idx" ON "auth_refresh_tokens"("expiresAt");
CREATE INDEX IF NOT EXISTS "auth_refresh_tokens_userId_revokedAt_idx" ON "auth_refresh_tokens"("userId", "revokedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'auth_refresh_tokens_userId_fkey'
  ) THEN
    ALTER TABLE "auth_refresh_tokens"
      ADD CONSTRAINT "auth_refresh_tokens_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

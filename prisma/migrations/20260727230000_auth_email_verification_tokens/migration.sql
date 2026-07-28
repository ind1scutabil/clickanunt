-- Expand-only: hash-only email verification / email-change tokens.
CREATE TABLE IF NOT EXISTS "auth_email_verification_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "auth_email_verification_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "auth_email_verification_tokens_tokenHash_key"
  ON "auth_email_verification_tokens"("tokenHash");
CREATE INDEX IF NOT EXISTS "auth_email_verification_tokens_userId_idx"
  ON "auth_email_verification_tokens"("userId");
CREATE INDEX IF NOT EXISTS "auth_email_verification_tokens_email_idx"
  ON "auth_email_verification_tokens"("email");
CREATE INDEX IF NOT EXISTS "auth_email_verification_tokens_expiresAt_idx"
  ON "auth_email_verification_tokens"("expiresAt");
CREATE INDEX IF NOT EXISTS "auth_email_verification_tokens_userId_purpose_idx"
  ON "auth_email_verification_tokens"("userId", "purpose");
CREATE INDEX IF NOT EXISTS "auth_email_verification_tokens_userId_revokedAt_usedAt_idx"
  ON "auth_email_verification_tokens"("userId", "revokedAt", "usedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'auth_email_verification_tokens_userId_fkey'
  ) THEN
    ALTER TABLE "auth_email_verification_tokens"
      ADD CONSTRAINT "auth_email_verification_tokens_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

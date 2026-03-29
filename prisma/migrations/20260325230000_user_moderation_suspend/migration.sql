-- Suspendare temporară din panoul admin (distinctă de ban permanent)
ALTER TABLE "users" ADD COLUMN "moderationSuspendedUntil" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "moderationSuspensionReason" TEXT;
ALTER TABLE "users" ADD COLUMN "moderationSuspendedBy" TEXT;

CREATE INDEX IF NOT EXISTS "users_moderationSuspendedUntil_idx" ON "users"("moderationSuspendedUntil");

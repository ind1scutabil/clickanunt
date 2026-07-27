-- Expand-only: session revocation counter for JWT claim `sv`
-- Physical table is `users` (@@map), not Prisma model name `User`.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- creditsBalance on User model (table name is "users" per @@map("users"))
-- IF NOT EXISTS: safe if column was added manually or migration is retried after a failed run.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "creditsBalance" INTEGER NOT NULL DEFAULT 0;

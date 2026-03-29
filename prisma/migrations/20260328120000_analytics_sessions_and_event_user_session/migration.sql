-- Analytics sessions (client-generated id)
CREATE TABLE "analytics_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "ipHash" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "analytics_sessions_userId_idx" ON "analytics_sessions"("userId");
CREATE INDEX "analytics_sessions_firstSeenAt_idx" ON "analytics_sessions"("firstSeenAt");

ALTER TABLE "analytics_sessions" ADD CONSTRAINT "analytics_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Events: session + unified userId
ALTER TABLE "analytics_events" ADD COLUMN "sessionId" TEXT;
ALTER TABLE "analytics_events" ADD COLUMN "userId" TEXT;

UPDATE "analytics_events" SET "userId" = "actorUserId" WHERE "userId" IS NULL AND "actorUserId" IS NOT NULL;

UPDATE "analytics_events"
SET "metadata" = COALESCE("metadata", '{}'::jsonb) || jsonb_build_object('legacyTargetUserId', "targetUserId")
WHERE "targetUserId" IS NOT NULL;

ALTER TABLE "analytics_events" DROP CONSTRAINT IF EXISTS "analytics_events_listingId_fkey";

ALTER TABLE "analytics_events" DROP COLUMN "actorUserId";
ALTER TABLE "analytics_events" DROP COLUMN "targetUserId";

ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "analytics_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DROP INDEX IF EXISTS "analytics_events_actorUserId_createdAt_idx";

CREATE INDEX "analytics_events_sessionId_createdAt_idx" ON "analytics_events"("sessionId", "createdAt");
CREATE INDEX "analytics_events_userId_createdAt_idx" ON "analytics_events"("userId", "createdAt");

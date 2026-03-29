-- Enterprise scale: analytics queue, daily rollups, error logs, soft delete

CREATE TABLE "analytics_event_queue" (
    "id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "analytics_event_queue_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "analytics_event_queue_createdAt_idx" ON "analytics_event_queue"("createdAt");

CREATE TABLE "analytics_daily" (
    "id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "listingViews" INTEGER NOT NULL DEFAULT 0,
    "contactClicks" INTEGER NOT NULL DEFAULT 0,
    "messagesSent" INTEGER NOT NULL DEFAULT 0,
    "searchesPerformed" INTEGER NOT NULL DEFAULT 0,
    "loginSuccess" INTEGER NOT NULL DEFAULT 0,
    "uniqueSessions" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "analytics_daily_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "analytics_daily_day_key" ON "analytics_daily"("day");

CREATE TABLE "system_error_logs" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "system_error_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "system_error_logs_createdAt_idx" ON "system_error_logs"("createdAt");
CREATE INDEX "system_error_logs_source_idx" ON "system_error_logs"("source");

ALTER TABLE "users" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "listings" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");
CREATE INDEX "listings_deletedAt_idx" ON "listings"("deletedAt");

-- Admin alert center (staff notifications)
CREATE TYPE "AdminNotificationSeverity" AS ENUM ('info', 'success', 'warning', 'critical');

CREATE TABLE "admin_notifications" (
    "id" TEXT NOT NULL,
    "type" VARCHAR(64) NOT NULL,
    "severity" "AdminNotificationSeverity" NOT NULL,
    "title" VARCHAR(220) NOT NULL,
    "message" TEXT NOT NULL,
    "entityType" VARCHAR(40),
    "entityId" VARCHAR(64),
    "readAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_notifications_createdAt_idx" ON "admin_notifications"("createdAt");
CREATE INDEX "admin_notifications_severity_readAt_idx" ON "admin_notifications"("severity", "readAt");
CREATE INDEX "admin_notifications_type_idx" ON "admin_notifications"("type");

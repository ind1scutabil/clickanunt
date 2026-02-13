-- Migration: Add error logging system
-- Created: 2026-02-05
-- Purpose: Track application errors for monitoring and debugging

-- Create error_logs table
CREATE TABLE IF NOT EXISTS "error_logs" (
  "id" TEXT PRIMARY KEY,
  "level" TEXT NOT NULL, -- 'error', 'warning', 'info'
  "message" TEXT NOT NULL,
  "stack" TEXT,
  "context" JSONB,
  "userId" TEXT,
  "path" TEXT,
  "method" TEXT,
  "statusCode" INTEGER,
  "userAgent" TEXT,
  "ipAddress" TEXT,
  "resolved" BOOLEAN NOT NULL DEFAULT false,
  "resolvedAt" TIMESTAMP(3),
  "resolvedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for querying
CREATE INDEX IF NOT EXISTS "error_logs_level_idx" ON "error_logs"("level");
CREATE INDEX IF NOT EXISTS "error_logs_createdAt_idx" ON "error_logs"("createdAt");
CREATE INDEX IF NOT EXISTS "error_logs_resolved_idx" ON "error_logs"("resolved");
CREATE INDEX IF NOT EXISTS "error_logs_userId_idx" ON "error_logs"("userId");
CREATE INDEX IF NOT EXISTS "error_logs_path_idx" ON "error_logs"("path");

-- Create request_logs table for request monitoring
CREATE TABLE IF NOT EXISTS "request_logs" (
  "id" TEXT PRIMARY KEY,
  "method" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "statusCode" INTEGER NOT NULL,
  "duration" INTEGER NOT NULL, -- milliseconds
  "userId" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "request_logs_createdAt_idx" ON "request_logs"("createdAt");
CREATE INDEX IF NOT EXISTS "request_logs_path_idx" ON "request_logs"("path");
CREATE INDEX IF NOT EXISTS "request_logs_statusCode_idx" ON "request_logs"("statusCode");
CREATE INDEX IF NOT EXISTS "request_logs_duration_idx" ON "request_logs"("duration");

-- Analyze tables
ANALYZE "error_logs";
ANALYZE "request_logs";

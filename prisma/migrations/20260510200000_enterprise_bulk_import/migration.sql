-- CreateEnum
CREATE TYPE "ImportSourceKind" AS ENUM ('csv_upload', 'xml_feed', 'manual');

-- CreateEnum
CREATE TYPE "ImportBatchStatus" AS ENUM ('draft', 'pending_approval', 'approved', 'processing', 'completed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "ImportRowStatus" AS ENUM ('pending', 'processing', 'success', 'skipped_duplicate', 'failed');

-- CreateTable
CREATE TABLE "import_feeds" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "sourceKind" "ImportSourceKind" NOT NULL DEFAULT 'xml_feed',
    "feedUrl" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "xmlProfile" TEXT NOT NULL DEFAULT 'generic',
    "lastError" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_feeds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_batches" (
    "id" TEXT NOT NULL,
    "feedId" TEXT,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "targetOwnerId" TEXT NOT NULL,
    "status" "ImportBatchStatus" NOT NULL DEFAULT 'draft',
    "sourceKind" "ImportSourceKind" NOT NULL,
    "columnMapping" JSONB,
    "feedPayloadMeta" JSONB,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "processedRows" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "nextChunkRow" INTEGER NOT NULL DEFAULT 0,
    "errorSummary" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_rows" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "status" "ImportRowStatus" NOT NULL DEFAULT 'pending',
    "rawData" JSONB NOT NULL,
    "normalized" JSONB,
    "errorMessage" TEXT,
    "duplicateReason" TEXT,
    "listingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_rows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "import_feeds_ownerUserId_idx" ON "import_feeds"("ownerUserId");

-- CreateIndex
CREATE INDEX "import_feeds_isEnabled_idx" ON "import_feeds"("isEnabled");

-- CreateIndex
CREATE INDEX "import_batches_createdById_idx" ON "import_batches"("createdById");

-- CreateIndex
CREATE INDEX "import_batches_targetOwnerId_idx" ON "import_batches"("targetOwnerId");

-- CreateIndex
CREATE INDEX "import_batches_status_idx" ON "import_batches"("status");

-- CreateIndex
CREATE UNIQUE INDEX "import_rows_batchId_rowIndex_key" ON "import_rows"("batchId", "rowIndex");

-- CreateIndex
CREATE INDEX "import_rows_batchId_status_idx" ON "import_rows"("batchId", "status");

-- AddForeignKey
ALTER TABLE "import_feeds" ADD CONSTRAINT "import_feeds_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "import_feeds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_targetOwnerId_fkey" FOREIGN KEY ("targetOwnerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "listings" ADD COLUMN "importExternalRef" TEXT;

-- CreateIndex
CREATE INDEX "listings_ownerUserId_importExternalRef_idx" ON "listings"("ownerUserId", "importExternalRef");

-- CreateIndex
CREATE INDEX "listings_vin_idx" ON "listings"("vin");

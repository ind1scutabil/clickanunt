/*
  Warnings:

  - You are about to drop the column `entityId` on the `appeals` table. All the data in the column will be lost.
  - You are about to drop the column `entityType` on the `appeals` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `appeals` table. All the data in the column will be lost.
  - You are about to drop the column `after` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `before` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `entityId` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `entityType` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `timestamp` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `userEmail` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `userRole` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `clientAddress` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `clientCui` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `clientEmail` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `clientName` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `companyAddress` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `companyCui` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `companyName` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `pdfUrl` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `subtotal` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `vatAmount` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `vatRate` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `moderationFlags` on the `listings` table. All the data in the column will be lost.
  - You are about to drop the column `moderationScore` on the `listings` table. All the data in the column will be lost.
  - You are about to drop the column `promotedViews` on the `listings` table. All the data in the column will be lost.
  - You are about to drop the column `rejectionReason` on the `listings` table. All the data in the column will be lost.
  - You are about to drop the column `searchVector` on the `listings` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `listings` table. All the data in the column will be lost.
  - The `scamFlags` column on the `listings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `assignedAt` on the `moderation_queue` table. All the data in the column will be lost.
  - You are about to drop the column `decision` on the `moderation_queue` table. All the data in the column will be lost.
  - You are about to drop the column `entityId` on the `moderation_queue` table. All the data in the column will be lost.
  - You are about to drop the column `entityType` on the `moderation_queue` table. All the data in the column will be lost.
  - You are about to drop the column `flags` on the `moderation_queue` table. All the data in the column will be lost.
  - You are about to drop the column `reviewedAt` on the `moderation_queue` table. All the data in the column will be lost.
  - You are about to drop the column `entityId` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `entityType` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `errorMessage` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `invoiceId` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `refundedAt` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `entityId` on the `reports` table. All the data in the column will be lost.
  - You are about to drop the column `entityType` on the `reports` table. All the data in the column will be lost.
  - You are about to drop the column `entityId` on the `staff_notes` table. All the data in the column will be lost.
  - You are about to drop the column `entityType` on the `staff_notes` table. All the data in the column will be lost.
  - You are about to drop the column `note` on the `staff_notes` table. All the data in the column will be lost.
  - You are about to drop the `feature_flags` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `promotions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `settings` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `resource` to the `audit_logs` table without a default value. This is not possible if the table is not empty.
  - Made the column `scamScore` on table `listings` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `listingId` to the `moderation_queue` table without a default value. This is not possible if the table is not empty.
  - Added the required column `listingId` to the `reports` table without a default value. This is not possible if the table is not empty.
  - Added the required column `content` to the `staff_notes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `staff_notes` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('private', 'business');

-- CreateEnum
CREATE TYPE "VerificationLevel" AS ENUM ('none', 'email', 'phone', 'business');

-- DropForeignKey
ALTER TABLE "moderation_queue" DROP CONSTRAINT "moderation_queue_entityId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "reports" DROP CONSTRAINT "reports_entityId_fkey";

-- DropForeignKey
ALTER TABLE "staff_notes" DROP CONSTRAINT "staff_notes_authorId_fkey";

-- DropIndex
DROP INDEX "appeals_createdAt_idx";

-- DropIndex
DROP INDEX "audit_logs_entityType_entityId_idx";

-- DropIndex
DROP INDEX "audit_logs_timestamp_idx";

-- DropIndex
DROP INDEX "listings_category_status_createdAt_idx";

-- DropIndex
DROP INDEX "listings_category_subcategory_status_idx";

-- DropIndex
DROP INDEX "listings_county_city_category_idx";

-- DropIndex
DROP INDEX "listings_createdAt_idx";

-- DropIndex
DROP INDEX "listings_make_model_year_idx";

-- DropIndex
DROP INDEX "listings_ownerUserId_status_idx";

-- DropIndex
DROP INDEX "listings_priceAmount_category_idx";

-- DropIndex
DROP INDEX "listings_slug_idx";

-- DropIndex
DROP INDEX "listings_slug_key";

-- DropIndex
DROP INDEX "listings_status_isFeatured_createdAt_idx";

-- DropIndex
DROP INDEX "moderation_queue_assignedTo_idx";

-- DropIndex
DROP INDEX "moderation_queue_entityType_entityId_idx";

-- DropIndex
DROP INDEX "moderation_queue_priority_createdAt_idx";

-- DropIndex
DROP INDEX "payments_entityType_entityId_idx";

-- DropIndex
DROP INDEX "payments_invoiceId_key";

-- DropIndex
DROP INDEX "reports_createdAt_idx";

-- DropIndex
DROP INDEX "reports_entityType_entityId_idx";

-- DropIndex
DROP INDEX "staff_notes_entityType_entityId_idx";

-- AlterTable
ALTER TABLE "appeals" DROP COLUMN "entityId",
DROP COLUMN "entityType",
DROP COLUMN "type",
ADD COLUMN     "evidence" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "audit_logs" DROP COLUMN "after",
DROP COLUMN "before",
DROP COLUMN "entityId",
DROP COLUMN "entityType",
DROP COLUMN "metadata",
DROP COLUMN "timestamp",
DROP COLUMN "userEmail",
DROP COLUMN "userRole",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "details" JSONB,
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "resource" TEXT NOT NULL,
ADD COLUMN     "resourceId" TEXT,
ADD COLUMN     "userAgent" TEXT;

-- AlterTable
ALTER TABLE "invoices" DROP COLUMN "clientAddress",
DROP COLUMN "clientCui",
DROP COLUMN "clientEmail",
DROP COLUMN "clientName",
DROP COLUMN "companyAddress",
DROP COLUMN "companyCui",
DROP COLUMN "companyName",
DROP COLUMN "pdfUrl",
DROP COLUMN "subtotal",
DROP COLUMN "vatAmount",
DROP COLUMN "vatRate",
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "paymentId" TEXT;

-- AlterTable
ALTER TABLE "listings" DROP COLUMN "moderationFlags",
DROP COLUMN "moderationScore",
DROP COLUMN "promotedViews",
DROP COLUMN "rejectionReason",
DROP COLUMN "searchVector",
DROP COLUMN "slug",
ADD COLUMN     "dealerBrands" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "dealerPriceMax" INTEGER,
ADD COLUMN     "dealerPriceMin" INTEGER,
ADD COLUMN     "duplicateOfId" TEXT,
ADD COLUMN     "isDealer" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isScamSuspected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "moderationNotes" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
DROP COLUMN "scamFlags",
ADD COLUMN     "scamFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "scamScore" SET NOT NULL,
ALTER COLUMN "scamScore" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "moderation_queue" DROP COLUMN "assignedAt",
DROP COLUMN "decision",
DROP COLUMN "entityId",
DROP COLUMN "entityType",
DROP COLUMN "flags",
DROP COLUMN "reviewedAt",
ADD COLUMN     "listingId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "entityId",
DROP COLUMN "entityType",
DROP COLUMN "errorMessage",
DROP COLUMN "invoiceId",
DROP COLUMN "refundedAt",
ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "reports" DROP COLUMN "entityId",
DROP COLUMN "entityType",
ADD COLUMN     "listingId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "staff_notes" DROP COLUMN "entityId",
DROP COLUMN "entityType",
DROP COLUMN "note",
ADD COLUMN     "content" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "accountType" "AccountType" NOT NULL DEFAULT 'private',
ADD COLUMN     "avatar" TEXT,
ADD COLUMN     "businessCUI" TEXT,
ADD COLUMN     "businessDescription" TEXT,
ADD COLUMN     "businessEmail" TEXT,
ADD COLUMN     "businessLocation" TEXT,
ADD COLUMN     "businessLogo" TEXT,
ADD COLUMN     "businessName" TEXT,
ADD COLUMN     "businessPhone" TEXT,
ADD COLUMN     "businessRegCom" TEXT,
ADD COLUMN     "businessWebsite" TEXT,
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "freeBoostsRemaining" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "verificationLevel" "VerificationLevel" NOT NULL DEFAULT 'none';

-- DropTable
DROP TABLE "feature_flags";

-- DropTable
DROP TABLE "promotions";

-- DropTable
DROP TABLE "settings";

-- CreateIndex
CREATE INDEX "audit_logs_resource_idx" ON "audit_logs"("resource");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "invoices_paymentId_idx" ON "invoices"("paymentId");

-- CreateIndex
CREATE INDEX "listings_ownerUserId_idx" ON "listings"("ownerUserId");

-- CreateIndex
CREATE INDEX "listings_category_idx" ON "listings"("category");

-- CreateIndex
CREATE INDEX "listings_status_idx" ON "listings"("status");

-- CreateIndex
CREATE INDEX "listings_createdAt_idx" ON "listings"("createdAt");

-- CreateIndex
CREATE INDEX "listings_isPromoted_idx" ON "listings"("isPromoted");

-- CreateIndex
CREATE INDEX "listings_scamScore_idx" ON "listings"("scamScore");

-- CreateIndex
CREATE INDEX "moderation_queue_listingId_idx" ON "moderation_queue"("listingId");

-- CreateIndex
CREATE INDEX "moderation_queue_priority_idx" ON "moderation_queue"("priority");

-- CreateIndex
CREATE INDEX "reports_listingId_idx" ON "reports"("listingId");

-- CreateIndex
CREATE INDEX "staff_notes_userId_idx" ON "staff_notes"("userId");

-- CreateIndex
CREATE INDEX "users_accountType_idx" ON "users"("accountType");

-- CreateIndex
CREATE INDEX "users_verificationLevel_idx" ON "users"("verificationLevel");

-- CreateIndex
CREATE INDEX "users_businessName_idx" ON "users"("businessName");

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_queue" ADD CONSTRAINT "moderation_queue_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_notes" ADD CONSTRAINT "staff_notes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

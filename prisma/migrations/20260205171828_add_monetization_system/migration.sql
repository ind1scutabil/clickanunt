-- CreateEnum
CREATE TYPE "PromotionType" AS ENUM ('boost_24h', 'boost_72h', 'boost_7days', 'highlight', 'featured');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('free', 'business', 'premium');

-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "isPromoted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "promotedViews" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "promotionExpiresAt" TIMESTAMP(3),
ADD COLUMN     "promotionStartedAt" TIMESTAMP(3),
ADD COLUMN     "promotionType" "PromotionType";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "subscriptionExpiresAt" TIMESTAMP(3),
ADD COLUMN     "subscriptionRenewsAt" TIMESTAMP(3),
ADD COLUMN     "subscriptionTier" "SubscriptionTier" NOT NULL DEFAULT 'free';

-- CreateTable
CREATE TABLE "promotions" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "PromotionType" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priceAmount" INTEGER NOT NULL,
    "priceCurrency" TEXT NOT NULL DEFAULT 'RON',
    "paymentId" TEXT,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "viewsBefore" INTEGER NOT NULL DEFAULT 0,
    "viewsDuring" INTEGER NOT NULL DEFAULT 0,
    "clicksDuring" INTEGER NOT NULL DEFAULT 0,
    "messagesDuring" INTEGER NOT NULL DEFAULT 0,
    "refundedAt" TIMESTAMP(3),
    "refundReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "promotions_paymentId_key" ON "promotions"("paymentId");

-- CreateIndex
CREATE INDEX "promotions_listingId_idx" ON "promotions"("listingId");

-- CreateIndex
CREATE INDEX "promotions_userId_idx" ON "promotions"("userId");

-- CreateIndex
CREATE INDEX "promotions_isActive_expiresAt_idx" ON "promotions"("isActive", "expiresAt");

-- CreateIndex
CREATE INDEX "promotions_type_idx" ON "promotions"("type");

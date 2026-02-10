-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "scamFlags" JSONB,
ADD COLUMN     "scamScore" INTEGER;

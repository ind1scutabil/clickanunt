-- AddColumn creditsBalance to User table
ALTER TABLE "User" ADD COLUMN "creditsBalance" INTEGER NOT NULL DEFAULT 0;

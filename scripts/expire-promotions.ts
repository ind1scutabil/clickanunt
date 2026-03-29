/**
 * Rulează manual expirarea promovărilor (același SQL ca cron-ul HTTP).
 * Exemplu: npm run expire-promotions
 */
import { prisma } from "../lib/prisma";
import { expireAllExpiredPromotions } from "../lib/expire-listing-promotions";

async function main() {
  if (process.env.USE_IN_MEMORY_DB === "true") {
    console.log("[expire-promotions] skipped (USE_IN_MEMORY_DB)");
    return;
  }
  const { updated } = await expireAllExpiredPromotions(prisma);
  console.log(`[expire-promotions] updated rows: ${updated}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  });

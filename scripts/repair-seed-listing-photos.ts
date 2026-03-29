/**
 * One-off repair: clears fake/stock photo URLs from enterprise seed listings (`seed-owner-*`).
 * Sets `photos` to [] so the app shows the default listing image until real uploads exist.
 */
/* eslint-disable @typescript-eslint/no-var-requires */
const { prisma } = require('../lib/prisma') as { prisma: typeof import('../lib/prisma').prisma };

async function main() {
  const listings = await prisma.listing.findMany({
    where: {
      status: 'active',
      owner: {
        email: {
          startsWith: 'seed-owner-',
        },
      },
    },
    select: {
      id: true,
    },
  });

  console.log(`Found seed active listings: ${listings.length}`);
  let updated = 0;

  for (const listing of listings) {
    await prisma.listing.update({
      where: { id: listing.id },
      data: { photos: [] },
    });
    updated++;
  }

  console.log(`Cleared stock photo URLs (empty photos) for ${updated} listings`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Repair photos failed:', e);
    process.exit(1);
  });

export {};

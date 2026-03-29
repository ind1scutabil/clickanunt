/**
 * @deprecated Prefer `scripts/sanitize-listing-photos.ts` (--dry-run / --execute).
 * Legacy entry: removes stale draft paths via the same sanitizer.
 */
import { prisma } from "../lib/prisma";
import { sanitizeListingPhotos } from "../lib/listing-photo-sanitize";

async function main() {
  if (process.env.USE_IN_MEMORY_DB === "true") {
    console.log("[sanitize-listing-temp-photos] skipped (USE_IN_MEMORY_DB)");
    return;
  }

  const rows = await prisma.$queryRaw<Array<{ id: string; photos: string[] }>>`
    SELECT id, photos
    FROM listings
    WHERE photos::text LIKE '%/listings/temp-%'
       OR photos::text LIKE '%listings/temp-%'
  `;

  let fixedCount = 0;
  for (const row of rows) {
    const { kept, removed } = sanitizeListingPhotos(row.photos ?? []);
    if (removed.length === 0) continue;

    await prisma.listing.update({
      where: { id: row.id },
      data: { photos: kept },
    });
    fixedCount++;
    console.log(
      JSON.stringify({
        listingId: row.id,
        removedCount: removed.length,
      })
    );
  }

  console.log(
    JSON.stringify({
      scannedWithTempPattern: rows.length,
      fixedListings: fixedCount,
    })
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  });

/**
 * Idempotent cleanup of `listing.photos`: removes draft temp paths, blob: previews,
 * blocked hosts, and invalid URLs; keeps normalized valid upload URLs.
 * Does not delete listings or users; only updates `photos` JSON when needed.
 *
 * Usage (from project root):
 *   npx ts-node --transpile-only --project tsconfig.scripts.json scripts/sanitize-listing-photos.ts --dry-run
 *   npx ts-node --transpile-only --project tsconfig.scripts.json scripts/sanitize-listing-photos.ts --execute
 */
import { prisma } from "../lib/prisma";
import { sanitizeListingPhotos } from "../lib/listing-photo-sanitize";

const dryRun = process.argv.includes("--dry-run");
const execute = process.argv.includes("--execute");

function toPhotoArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string");
}

async function main() {
  if (!dryRun && !execute) {
    console.error("Usage: add --dry-run or --execute");
    process.exit(1);
  }

  if (process.env.USE_IN_MEMORY_DB === "true") {
    console.log("[sanitize-listing-photos] skipped (USE_IN_MEMORY_DB)");
    return;
  }

  const rows = await prisma.listing.findMany({
    where: { deletedAt: null },
    select: { id: true, photos: true },
  });

  let listingsNeedingUpdate = 0;
  const touchedIds: string[] = [];
  let entriesBefore = 0;
  let entriesAfter = 0;

  for (const row of rows) {
    const photos = toPhotoArray(row.photos);
    entriesBefore += photos.length;
    const { kept } = sanitizeListingPhotos(photos);
    entriesAfter += kept.length;

    if (JSON.stringify(photos) === JSON.stringify(kept)) {
      continue;
    }

    listingsNeedingUpdate++;
    touchedIds.push(row.id);

    if (execute) {
      await prisma.listing.update({
        where: { id: row.id },
        data: { photos: kept },
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: execute ? "execute" : "dry-run",
        listingsScanned: rows.length,
        listingsUpdatedOrWouldUpdate: listingsNeedingUpdate,
        touchedListingIds: touchedIds,
        totalPhotoEntriesBefore: entriesBefore,
        totalPhotoEntriesAfter: entriesAfter,
      },
      null,
      2
    )
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  });

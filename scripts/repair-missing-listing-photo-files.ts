/**
 * One-off: clear `photos` when no files exist on disk for any stored serve key.
 * Run on VPS: `npx tsx scripts/repair-missing-listing-photo-files.ts` (dry-run default).
 *
 *   DRY_RUN=0 npx tsx scripts/repair-missing-listing-photo-files.ts
 */
/* eslint-disable @typescript-eslint/no-var-requires */
import fs from "fs";
import path from "path";

const { prisma } = require("../lib/prisma") as {
  prisma: typeof import("../lib/prisma").prisma;
};

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");
const DRY_RUN = process.env.DRY_RUN !== "0";

function keyFromServeUrl(url: string): string | null {
  const m = url.match(/[?&]key=([^&]+)/);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return null;
  }
}

function fileExistsForKey(key: string): boolean {
  return fs.existsSync(path.join(UPLOAD_ROOT, key));
}

function listingHasAnyFile(photos: unknown): boolean {
  if (!Array.isArray(photos)) return false;
  for (const raw of photos) {
    if (typeof raw !== "string") continue;
    const key = keyFromServeUrl(raw);
    if (!key) continue;
    if (fileExistsForKey(key)) return true;
    const medium = key.replace(/\/original\//i, "/medium/");
    const thumb = key.replace(/\/original\//i, "/thumb/");
    if (medium !== key && fileExistsForKey(medium)) return true;
    if (thumb !== key && fileExistsForKey(thumb)) return true;
  }
  return false;
}

async function main() {
  const rows = await prisma.listing.findMany({
    where: { status: { in: ["active", "pending", "draft"] }, deletedAt: null },
    select: { id: true, title: true, photos: true, status: true },
  });

  let cleared = 0;
  for (const row of rows) {
    const photos = row.photos;
    if (!Array.isArray(photos) || photos.length === 0) continue;
    if (listingHasAnyFile(photos)) continue;

    console.log(
      `${DRY_RUN ? "[dry-run] " : ""}clear photos listing=${row.id} status=${row.status} title=${(row.title || "").slice(0, 50)}`
    );
    if (!DRY_RUN) {
      await prisma.listing.update({
        where: { id: row.id },
        data: { photos: [] },
      });
    }
    cleared++;
  }

  console.log(`Done. ${cleared} listing(s) with no files on disk. DRY_RUN=${DRY_RUN}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

export {};

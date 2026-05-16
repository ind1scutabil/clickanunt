#!/usr/bin/env npx ts-node
/**
 * Optional backfill: generate thumb + medium next to existing originals on disk.
 * Does NOT delete or overwrite originals. Skips keys that already have variants.
 *
 *   npm run images:backfill
 *   npm run images:backfill -- --limit=50
 *   npm run images:backfill -- --dry-run
 */
import { promises as fs } from "fs";
import path from "path";
import {
  generateListingVariantBuffers,
  siblingKeysForOriginal,
} from "../lib/listing-image-pipeline";
const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");
const BATCH_SIZE = Number(process.env.IMAGES_BACKFILL_BATCH ?? 8);
const DELAY_MS = Number(process.env.IMAGES_BACKFILL_DELAY_MS ?? 200);
const STATE_FILE = path.join(process.cwd(), ".images-backfill-state.json");

type State = { processed: string[] };

async function loadState(): Promise<State> {
  try {
    const raw = await fs.readFile(STATE_FILE, "utf8");
    return JSON.parse(raw) as State;
  } catch {
    return { processed: [] };
  }
}

async function saveState(state: State): Promise<void> {
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
}

async function walkListingsOriginals(): Promise<string[]> {
  const keys: string[] = [];
  const listingsDir = path.join(UPLOAD_ROOT, "listings");
  let listingIds: string[];
  try {
    listingIds = await fs.readdir(listingsDir);
  } catch {
    return keys;
  }
  for (const lid of listingIds) {
    const originalDir = path.join(listingsDir, lid, "original");
    let files: string[];
    try {
      files = await fs.readdir(originalDir);
    } catch {
      continue;
    }
    for (const file of files) {
      if (!/\.(jpe?g|png|webp)$/i.test(file)) continue;
      keys.push(`listings/${lid}/original/${file}`);
    }
  }
  return keys;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : Infinity;

  const state = await loadState();
  const processedSet = new Set(state.processed);
  const allKeys = await walkListingsOriginals();
  const pending = allKeys.filter((k) => !processedSet.has(k)).slice(0, limit);

  console.log(
    JSON.stringify(
      {
        dryRun,
        totalOriginals: allKeys.length,
        pending: pending.length,
        batchSize: BATCH_SIZE,
      },
      null,
      2
    )
  );

  let done = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE);
    for (const originalKey of batch) {
      const { medium, thumb } = siblingKeysForOriginal(originalKey);
      const originalPath = path.join(UPLOAD_ROOT, originalKey);
      const mediumPath = path.join(UPLOAD_ROOT, medium);
      const thumbPath = path.join(UPLOAD_ROOT, thumb);

      try {
        const [mediumExists, thumbExists] = await Promise.all([
          fs
            .access(mediumPath)
            .then(() => true)
            .catch(() => false),
          fs
            .access(thumbPath)
            .then(() => true)
            .catch(() => false),
        ]);
        if (mediumExists && thumbExists) {
          skipped += 1;
          processedSet.add(originalKey);
          continue;
        }

        if (dryRun) {
          console.log(`[dry-run] would process ${originalKey}`);
          processedSet.add(originalKey);
          done += 1;
          continue;
        }

        const buf = await fs.readFile(originalPath);
        const variants = await generateListingVariantBuffers(buf);
        await fs.mkdir(path.dirname(mediumPath), { recursive: true });
        await fs.mkdir(path.dirname(thumbPath), { recursive: true });
        if (!mediumExists) await fs.writeFile(mediumPath, variants.medium);
        if (!thumbExists) await fs.writeFile(thumbPath, variants.thumb);
        processedSet.add(originalKey);
        done += 1;
        console.log(`[ok] ${originalKey}`);
      } catch (e) {
        errors += 1;
        console.error(`[error] ${originalKey}`, e);
      }
    }
    state.processed = [...processedSet];
    await saveState(state);
    if (i + BATCH_SIZE < pending.length) await sleep(DELAY_MS);
  }

  console.log(
    JSON.stringify({ done, skipped, errors, remaining: allKeys.length - processedSet.size }, null, 2)
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

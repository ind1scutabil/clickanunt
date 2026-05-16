#!/usr/bin/env npx ts-node
/**
 * Optional backfill: generate thumb + medium next to existing originals on disk.
 * Does NOT delete or overwrite originals. Skips keys that already have variants.
 *
 *   npm run images:backfill
 *   npm run images:backfill -- --limit=50
 *   npm run images:backfill -- --max-listings=5
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

function parsePositiveIntArg(flag: string): number | undefined {
  const arg = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (!arg) return undefined;
  const n = Number(arg.split("=")[1]);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Cap work to the first N distinct listing IDs (stable walk order). */
function filterByMaxListings(keys: string[], maxListings: number): string[] {
  const allowedListingIds = new Set<string>();
  const out: string[] = [];
  for (const key of keys) {
    const lid = key.match(/^listings\/([^/]+)\//)?.[1];
    if (!lid) continue;
    if (!allowedListingIds.has(lid)) {
      if (allowedListingIds.size >= maxListings) continue;
      allowedListingIds.add(lid);
    }
    out.push(key);
  }
  return out;
}

async function variantExistsOnDisk(
  originalKey: string
): Promise<{ mediumExists: boolean; thumbExists: boolean }> {
  const { medium, thumb } = siblingKeysForOriginal(originalKey);
  const mediumPath = path.join(UPLOAD_ROOT, medium);
  const thumbPath = path.join(UPLOAD_ROOT, thumb);
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
  return { mediumExists, thumbExists };
}

async function runDryRun(allKeys: string[]): Promise<void> {
  let variantsComplete = 0;
  let variantsMissing = 0;
  let originalsBytes = 0;
  const failed: string[] = [];

  for (const originalKey of allKeys) {
    const originalPath = path.join(UPLOAD_ROOT, originalKey);
    try {
      const stat = await fs.stat(originalPath);
      originalsBytes += stat.size;
      const { mediumExists, thumbExists } = await variantExistsOnDisk(originalKey);
      if (mediumExists && thumbExists) {
        variantsComplete += 1;
        continue;
      }
      variantsMissing += 1;
      console.log(`[dry-run] would process ${originalKey}`);
    } catch {
      failed.push(originalKey);
    }
  }

  const estVariantBytes = Math.round(originalsBytes * 0.45);
  const estSeconds = Math.max(30, Math.ceil((variantsMissing / BATCH_SIZE) * 2));

  console.log(
    JSON.stringify(
      {
        dryRun: true,
        originalsFound: allKeys.length,
        variantsAlreadyExisting: variantsComplete,
        variantsMissing,
        failedFiles: failed.length,
        failedKeys: failed.slice(0, 20),
        originalsBytesTotal: originalsBytes,
        estimatedVariantDiskGrowthBytes: estVariantBytes,
        estimatedRuntimeSeconds: estSeconds,
        batchSize: BATCH_SIZE,
      },
      null,
      2
    )
  );
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const limit = parsePositiveIntArg("--limit") ?? Infinity;
  const maxListings = parsePositiveIntArg("--max-listings");

  const state = await loadState();
  const processedSet = new Set(state.processed);
  const allKeys = await walkListingsOriginals();

  if (dryRun) {
    await runDryRun(allKeys);
    return;
  }

  let pending = allKeys.filter((k) => !processedSet.has(k));
  if (maxListings) pending = filterByMaxListings(pending, maxListings);
  pending = pending.slice(0, limit);

  console.log(
    JSON.stringify(
      {
        dryRun: false,
        totalOriginals: allKeys.length,
        pending: pending.length,
        maxListings: maxListings ?? null,
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
        const { mediumExists, thumbExists } = await variantExistsOnDisk(originalKey);
        if (mediumExists && thumbExists) {
          skipped += 1;
          processedSet.add(originalKey);
          continue;
        }

        const beforeStat = await fs.stat(originalPath);
        const buf = await fs.readFile(originalPath);
        const variants = await generateListingVariantBuffers(buf);
        await fs.mkdir(path.dirname(mediumPath), { recursive: true });
        await fs.mkdir(path.dirname(thumbPath), { recursive: true });
        if (!mediumExists) await fs.writeFile(mediumPath, variants.medium);
        if (!thumbExists) await fs.writeFile(thumbPath, variants.thumb);
        const afterStat = await fs.stat(originalPath);
        if (afterStat.size !== beforeStat.size || afterStat.mtimeMs !== beforeStat.mtimeMs) {
          throw new Error("original file was modified (abort)");
        }
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

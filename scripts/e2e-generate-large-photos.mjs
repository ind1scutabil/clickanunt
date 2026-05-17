#!/usr/bin/env node
/**
 * Generates large mobile-style JPEG fixtures for listing photo E2E tests.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../tests/fixtures/listing-photos");

async function writeJpeg(name, width, height) {
  const buf = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 90, g: 120, b: 180 },
    },
  })
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();
  const filePath = path.join(outDir, name);
  fs.writeFileSync(filePath, buf);
  const meta = await sharp(buf).metadata();
  console.log(`Wrote ${name}: ${meta.width}x${meta.height} (${buf.length} bytes)`);
  return filePath;
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  await writeJpeg("iphone-large-portrait.jpg", 4032, 3024);
  await writeJpeg("android-large-landscape.jpg", 6000, 4000);
  await writeJpeg("portrait-medium.jpg", 3024, 4032);
  await writeJpeg("landscape-small.jpg", 2560, 1440);

  try {
    const heicPath = path.join(outDir, "iphone-sample.heic");
    await sharp({
      create: {
        width: 2000,
        height: 1500,
        channels: 3,
        background: { r: 200, g: 100, b: 50 },
      },
    })
      .heif({ quality: 85 })
      .toFile(heicPath);
    console.log(`Wrote iphone-sample.heic (HEIC supported)`);
  } catch (e) {
    console.log(`HEIC fixture skipped: ${e.message}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

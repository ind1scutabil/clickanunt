/**
 * Safe image pipeline v2 — thumb (~120px) + medium (~900px) + untouched original.
 * Does not modify or delete originals.
 */

import sharp from "sharp";
import { generateImageKey, uploadImage } from "@/lib/storage";
import { siblingVariantStorageKey } from "@/lib/listing-image-variants";

export const LISTING_VARIANT_MAX = {
  thumb: 120,
  medium: 900,
} as const;

export type ListingVariantBuffer = {
  thumb: Buffer;
  medium: Buffer;
};

/**
 * Generate thumb + medium from source buffer (EXIF orientation applied).
 */
export async function generateListingVariantBuffers(
  source: Buffer
): Promise<ListingVariantBuffer> {
  const base = sharp(source).rotate();

  const [thumb, medium] = await Promise.all([
    base
      .clone()
      .resize(LISTING_VARIANT_MAX.thumb, LISTING_VARIANT_MAX.thumb, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 82, progressive: true, mozjpeg: true })
      .toBuffer(),
    base
      .clone()
      .resize(LISTING_VARIANT_MAX.medium, LISTING_VARIANT_MAX.medium, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85, progressive: true, mozjpeg: true })
      .toBuffer(),
  ]);

  return { thumb, medium };
}

export function siblingKeysForOriginal(originalKey: string): {
  medium: string;
  thumb: string;
} {
  return {
    medium: siblingVariantStorageKey(originalKey, "medium"),
    thumb: siblingVariantStorageKey(originalKey, "thumb"),
  };
}

/**
 * Upload original (caller buffer) plus derived variants. Returns original public URL.
 */
export async function uploadListingImageWithVariants(
  originalBuffer: Buffer,
  listingId: string,
  filename: string
): Promise<{ url: string; key: string }> {
  const originalKey = generateImageKey(listingId, "original", filename);
  const { medium, thumb } = siblingKeysForOriginal(originalKey);
  const variants = await generateListingVariantBuffers(originalBuffer);

  const url = await uploadImage(originalBuffer, originalKey, "image/jpeg");
  await Promise.all([
    uploadImage(variants.medium, medium, "image/jpeg"),
    uploadImage(variants.thumb, thumb, "image/jpeg"),
  ]);

  return { url, key: originalKey };
}

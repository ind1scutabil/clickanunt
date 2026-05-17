/**
 * Image Processing and Optimization Utilities
 * Handles compression, resizing, and format conversion
 */

import sharp from 'sharp';
import {
  LISTING_IMAGE_PROCESS_ERROR,
  LISTING_IMAGE_UPLOAD,
} from '@/lib/listing-image-upload-config';

// Image size presets for responsive images
export const IMAGE_SIZES = {
  thumb: { width: 400, height: 300, quality: 80 },
  medium: { width: 800, height: 600, quality: 85 },
  large: { width: 1600, height: 1200, quality: 90 },
  original: { width: 2400, height: 1800, quality: 95 },
};

export type ImageSize = keyof typeof IMAGE_SIZES;

/**
 * Optimize and resize image buffer
 */
export async function processImage(
  buffer: Buffer,
  size: ImageSize
): Promise<Buffer> {
  const config = IMAGE_SIZES[size];

  try {
    return await sharp(buffer)
      .resize(config.width, config.height, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({
        quality: config.quality,
        progressive: true,
        mozjpeg: true,
      })
      .toBuffer();
  } catch (error) {
    console.error(`Error processing image for ${size}:`, error);
    throw new Error(`Failed to process image for ${size}`);
  }
}

/**
 * Process single image into multiple sizes
 * Returns map of size -> processed buffer
 */
export async function processImageMultipleSizes(
  buffer: Buffer,
  sizes: ImageSize[] = ['thumb', 'medium', 'large', 'original']
): Promise<Map<ImageSize, Buffer>> {
  const results = new Map<ImageSize, Buffer>();

  await Promise.all(
    sizes.map(async (size) => {
      const processed = await processImage(buffer, size);
      results.set(size, processed);
    })
  );

  return results;
}

/**
 * Get image metadata (dimensions, format, size)
 */
export async function getImageMetadata(buffer: Buffer) {
  try {
    const metadata = await sharp(buffer).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: metadata.size,
      hasAlpha: metadata.hasAlpha,
    };
  } catch (error) {
    console.error('Error getting image metadata:', error);
    throw new Error('Failed to get image metadata');
  }
}

/**
 * Validate image file
 */
export async function validateImage(buffer: Buffer): Promise<{
  valid: boolean;
  error?: string;
  metadata?: any;
}> {
  try {
    const metadata = await getImageMetadata(buffer);

    // Check format
    const allowedFormats = ['jpeg', 'jpg', 'png', 'webp'];
    if (!metadata.format || !allowedFormats.includes(metadata.format)) {
      return {
        valid: false,
        error: `Invalid format. Allowed: ${allowedFormats.join(', ')}`,
      };
    }

    // Check file size (from buffer length)
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB
    if (buffer.length > maxSizeBytes) {
      return {
        valid: false,
        error: 'Image file size exceeds 10MB',
      };
    }

    return {
      valid: true,
      metadata,
    };
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid image file',
    };
  }
}

/**
 * Convert image to WebP format (better compression)
 */
export async function convertToWebP(buffer: Buffer, quality: number = 85): Promise<Buffer> {
  try {
    return await sharp(buffer)
      .webp({
        quality,
        effort: 6, // 0-6, higher = better compression but slower
      })
      .toBuffer();
  } catch (error) {
    console.error('Error converting to WebP:', error);
    throw new Error('Failed to convert to WebP');
  }
}

/**
 * Generate blur placeholder for progressive image loading
 */
export async function generateBlurPlaceholder(buffer: Buffer): Promise<string> {
  try {
    const placeholder = await sharp(buffer)
      .resize(20, 20, { fit: 'inside' })
      .blur(10)
      .jpeg({ quality: 50 })
      .toBuffer();

    return `data:image/jpeg;base64,${placeholder.toString('base64')}`;
  } catch (error) {
    console.error('Error generating blur placeholder:', error);
    return '';
  }
}

/**
 * Calculate optimal quality based on image characteristics
 */
export function calculateOptimalQuality(metadata: any): number {
  // Start with base quality
  let quality = 85;

  // Reduce quality for very large images
  if (metadata.width > 2000 || metadata.height > 2000) {
    quality -= 5;
  }

  // Increase quality for small images
  if (metadata.width < 800 && metadata.height < 800) {
    quality += 5;
  }

  // Ensure quality is within bounds
  return Math.max(60, Math.min(95, quality));
}

/**
 * Batch process multiple images
 */
export async function batchProcessImages(
  images: Array<{ buffer: Buffer; filename: string }>,
  size: ImageSize
): Promise<Array<{ buffer: Buffer; filename: string }>> {
  return await Promise.all(
    images.map(async (img) => ({
      buffer: await processImage(img.buffer, size),
      filename: img.filename,
    }))
  );
}

export type PrepareListingImageResult =
  | { success: true; buffer: Buffer }
  | { success: false; error: string };

/**
 * Normalize listing upload: EXIF orientation, resize if oversized, JPEG output.
 * Replaces hard dimension rejection — mobile photos are resized instead of blocked.
 */
export async function prepareListingImageForUpload(
  buffer: Buffer
): Promise<PrepareListingImageResult> {
  const {
    maxDecodeBytes,
    maxInputFileBytes,
    maxOutputLongestSide,
    jpegQuality,
    jpegQualityFallback,
    acceptedSharpFormats,
  } = LISTING_IMAGE_UPLOAD;

  if (buffer.length > maxDecodeBytes) {
    return {
      success: false,
      error: "Fișierul este prea mare. Încearcă o poză mai mică.",
    };
  }

  try {
    const meta = await sharp(buffer, { failOn: "none" }).rotate().metadata();
    const format = meta.format?.toLowerCase();

    if (!format || !acceptedSharpFormats.has(format)) {
      return {
        success: false,
        error: "Format neacceptat. Folosește JPEG, PNG sau WebP.",
      };
    }

    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    if (width < 1 || height < 1) {
      return { success: false, error: LISTING_IMAGE_PROCESS_ERROR };
    }

    let pipeline = sharp(buffer, { failOn: "none" }).rotate();
    const longest = Math.max(width, height);
    if (longest > maxOutputLongestSide) {
      pipeline = pipeline.resize(maxOutputLongestSide, maxOutputLongestSide, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    let out = await pipeline
      .jpeg({ quality: jpegQuality, progressive: true, mozjpeg: true })
      .toBuffer();
    if (out.length > maxInputFileBytes) {
      out = await sharp(out)
        .jpeg({
          quality: jpegQualityFallback,
          progressive: true,
          mozjpeg: true,
        })
        .toBuffer();
    }
    if (out.length > maxInputFileBytes) {
      return { success: false, error: LISTING_IMAGE_PROCESS_ERROR };
    }

    return { success: true, buffer: out };
  } catch {
    return { success: false, error: LISTING_IMAGE_PROCESS_ERROR };
  }
}

/**
 * Strip EXIF data for privacy
 */
export async function stripExifData(buffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(buffer)
      .rotate() // Auto-rotate based on EXIF
      .withMetadata({
        // Remove all EXIF data
        exif: {},
      })
      .toBuffer();
  } catch (error) {
    console.error('Error stripping EXIF data:', error);
    return buffer; // Return original if fails
  }
}

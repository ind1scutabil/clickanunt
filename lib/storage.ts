/**
 * Cloud Storage Configuration for S3-compatible services
 * Supports: AWS S3, Cloudflare R2, DigitalOcean Spaces, Backblaze B2
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Storage configuration from environment variables
const STORAGE_CONFIG = {
  endpoint: process.env.S3_ENDPOINT || 'https://s3.amazonaws.com',
  region: process.env.S3_REGION || 'eu-central-1',
  bucket: process.env.S3_BUCKET || 'clickanunt-images',
  accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  cdnUrl: process.env.CDN_URL || '', // CloudFlare CDN or custom CDN
};

// Initialize S3 client
const s3Client = new S3Client({
  endpoint: STORAGE_CONFIG.endpoint,
  region: STORAGE_CONFIG.region,
  credentials: {
    accessKeyId: STORAGE_CONFIG.accessKeyId,
    secretAccessKey: STORAGE_CONFIG.secretAccessKey,
  },
  forcePathStyle: true, // Required for some S3-compatible services
});

/**
 * Generate optimized image key with organized folder structure
 * Format: listings/{listingId}/{size}/{timestamp}-{random}.{ext}
 */
export function generateImageKey(listingId: string, size: 'thumb' | 'medium' | 'large' | 'original', filename: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const ext = filename.split('.').pop() || 'jpg';
  return `listings/${listingId}/${size}/${timestamp}-${random}.${ext}`;
}

/**
 * Upload image to S3-compatible storage
 * Returns the public URL or CDN URL
 */
export async function uploadImage(
  file: Buffer,
  key: string,
  contentType: string = 'image/jpeg'
): Promise<string> {
  try {
    const command = new PutObjectCommand({
      Bucket: STORAGE_CONFIG.bucket,
      Key: key,
      Body: file,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable', // 1 year cache
      Metadata: {
        uploadedAt: new Date().toISOString(),
      },
    });

    await s3Client.send(command);

    // Return CDN URL if configured, otherwise S3 URL
    if (STORAGE_CONFIG.cdnUrl) {
      return `${STORAGE_CONFIG.cdnUrl}/${key}`;
    }

    // Construct public URL based on storage provider
    const baseUrl = STORAGE_CONFIG.endpoint.replace('https://', '');
    return `https://${STORAGE_CONFIG.bucket}.${baseUrl}/${key}`;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw new Error('Failed to upload image');
  }
}

/**
 * Delete image from storage
 */
export async function deleteImage(key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: STORAGE_CONFIG.bucket,
      Key: key,
    });

    await s3Client.send(command);
  } catch (error) {
    console.error('Error deleting image:', error);
    throw new Error('Failed to delete image');
  }
}

/**
 * Delete multiple images (batch delete)
 */
export async function deleteImages(keys: string[]): Promise<void> {
  try {
    await Promise.all(keys.map(key => deleteImage(key)));
  } catch (error) {
    console.error('Error deleting images:', error);
    throw new Error('Failed to delete images');
  }
}

/**
 * Generate presigned URL for temporary access
 * Useful for protected images or temporary download links
 */
export async function getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: STORAGE_CONFIG.bucket,
      Key: key,
    });

    return await getSignedUrl(s3Client, command, { expiresIn });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw new Error('Failed to generate presigned URL');
  }
}

/**
 * Extract storage key from URL
 */
export function extractKeyFromUrl(url: string): string | null {
  try {
    // Handle CDN URLs
    if (STORAGE_CONFIG.cdnUrl && url.startsWith(STORAGE_CONFIG.cdnUrl)) {
      return url.replace(`${STORAGE_CONFIG.cdnUrl}/`, '');
    }

    // Handle S3 URLs
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    
    // Remove bucket name if present in path
    if (pathParts[0] === STORAGE_CONFIG.bucket) {
      pathParts.shift();
    }
    
    return pathParts.join('/');
  } catch {
    return null;
  }
}

/**
 * Get all image URLs for a listing (all sizes)
 */
export function getListingImageUrls(listingId: string, baseFilename: string): {
  thumb: string;
  medium: string;
  large: string;
  original: string;
} {
  const baseUrl = STORAGE_CONFIG.cdnUrl || `https://${STORAGE_CONFIG.bucket}.${STORAGE_CONFIG.endpoint.replace('https://', '')}`;
  
  return {
    thumb: `${baseUrl}/listings/${listingId}/thumb/${baseFilename}`,
    medium: `${baseUrl}/listings/${listingId}/medium/${baseFilename}`,
    large: `${baseUrl}/listings/${listingId}/large/${baseFilename}`,
    original: `${baseUrl}/listings/${listingId}/original/${baseFilename}`,
  };
}

/**
 * Validate storage configuration
 */
export function isStorageConfigured(): boolean {
  return !!(
    STORAGE_CONFIG.accessKeyId &&
    STORAGE_CONFIG.secretAccessKey &&
    STORAGE_CONFIG.bucket
  );
}

export { s3Client, STORAGE_CONFIG };

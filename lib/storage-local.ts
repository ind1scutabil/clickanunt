/**
 * Local File Storage Fallback
 * When S3/CDN not configured, store images in public/uploads
 * This is a FALLBACK solution - should be replaced with proper cloud storage
 */

import { promises as fs } from 'fs';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

// Ensure upload directory exists
export async function ensureUploadDir(): Promise<void> {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating upload directory:', error);
    throw error;
  }
}

/**
 * Upload image to local public folder
 * Returns absolute URL (http://domain.com/uploads/...)
 */
export async function uploadImageLocal(
  file: Buffer,
  key: string
): Promise<string> {
  try {
    // Ensure directory exists
    await ensureUploadDir();

    // Create subdirectories based on key structure
    const keyPath = key.split('/').slice(0, -1).join('/');
    const fullDir = path.join(UPLOAD_DIR, keyPath);
    await fs.mkdir(fullDir, { recursive: true });

    // Write file
    const fullPath = path.join(UPLOAD_DIR, key);
    await fs.writeFile(fullPath, file);

    // Return absolute URL using public domain
    // This ensures URLs pass Zod's .url() validation
    const publicUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://clickanunt.ro';
    const cleanPublicUrl = publicUrl.endsWith('/') ? publicUrl.slice(0, -1) : publicUrl;
    // Always use HTTPS for consistency
    const secureUrl = cleanPublicUrl.replace(/^http:/, 'https:');
    return `${secureUrl}/uploads/${key}`;
  } catch (error) {
    console.error('Error uploading image locally:', error);
    throw new Error('Failed to upload image locally');
  }
}

/**
 * Delete image from local storage
 */
export async function deleteImageLocal(key: string): Promise<void> {
  try {
    const fullPath = path.join(UPLOAD_DIR, key);
    await fs.unlink(fullPath);
  } catch (error) {
    console.error('Error deleting local image:', error);
    // Don't throw - file might not exist
  }
}

/**
 * Check if S3 is configured
 */
export function isS3Configured(): boolean {
  return !!(
    process.env.S3_ENDPOINT &&
    process.env.S3_BUCKET &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY
  );
}

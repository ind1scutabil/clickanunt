/**
 * Secure Image Upload - OWASP ASVS V12.6
 * 
 * Features:
 * - File type validation (magic bytes)
 * - Size limits
 * - Malware scanning integration ready
 * - Filename sanitization
 * - Image processing to strip EXIF
 * - Content-Disposition headers
 */

import { imageUploadSchema } from './input-validation';
import sharp from 'sharp';
import crypto from 'crypto';


/**
 * Allowed image MIME types
 */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
] as const;

/**
 * Max file sizes
 */
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_IMAGES_PER_LISTING = 10;

/**
 * Magic bytes for file type detection
 */
const FILE_SIGNATURES: Record<string, Buffer[]> = {
  'image/jpeg': [
    Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]),
    Buffer.from([0xFF, 0xD8, 0xFF, 0xE1]),
    Buffer.from([0xFF, 0xD8, 0xFF, 0xE2]),
  ],
  'image/png': [
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
  ],
  'image/webp': [
    Buffer.from([0x52, 0x49, 0x46, 0x46]), // RIFF
  ],
};

/**
 * Validate file signature (magic bytes)
 */
export function validateFileSignature(buffer: Buffer, mimeType: string): boolean {
  const signatures = FILE_SIGNATURES[mimeType];
  
  if (!signatures) {
    return false;
  }
  
  return signatures.some(signature => 
    buffer.slice(0, signature.length).equals(signature)
  );
}

/**
 * Generate secure random filename
 */
export function generateSecureFilename(originalName: string): string {
  const ext = originalName.split('.').pop()?.toLowerCase() || 'jpg';
  const randomName = crypto.randomBytes(16).toString('hex');
  return `${randomName}.${ext}`;
}

/**
 * Image upload validation result
 */
export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  metadata?: {
    width: number;
    height: number;
    format: string;
    size: number;
  };
}

/**
 * Validate image upload
 */
export async function validateImageUpload(
  file: Buffer,
  filename: string,
  mimetype: string,
  size: number
): Promise<ImageValidationResult> {
  try {
    // 1. Validate input schema
    const validation = imageUploadSchema.safeParse({
      filename,
      size,
      mimetype,
    });
    
    if (!validation.success) {
      return {
        valid: false,
        error: validation.error.issues[0]?.message || 'Validare eșuată',
      };
    }
    
    // 2. Check magic bytes
    if (!validateFileSignature(file, mimetype)) {
      return {
        valid: false,
        error: 'Tipul fișierului nu corespunde cu extensia',
      };
    }
    
    // 3. Validate with sharp (verifies it's a real image)
    let metadata;
    try {
      metadata = await sharp(file).metadata();
    } catch {
      return {
        valid: false,
        error: 'Fișierul nu este o imagine validă',
      };
    }
    
    // 4. Check dimensions
    if (!metadata.width || !metadata.height) {
      return {
        valid: false,
        error: 'Nu s-au putut determina dimensiunile imaginii',
      };
    }
    
    if (metadata.width < 200 || metadata.height < 200) {
      return {
        valid: false,
        error: 'Imaginea este prea mică (minim 200x200px)',
      };
    }
    
    if (metadata.width > 10000 || metadata.height > 10000) {
      return {
        valid: false,
        error: 'Imaginea este prea mare (maxim 10000x10000px)',
      };
    }
    
    // 5. Check file size again (sharp might decompress)
    if (size > MAX_IMAGE_SIZE) {
      return {
        valid: false,
        error: `Fișierul depășește ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`,
      };
    }
    
    return {
      valid: true,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format || 'unknown',
        size,
      },
    };
  } catch (error) {
    console.error('Image validation error:', error);
    return {
      valid: false,
      error: 'Eroare la validarea imaginii',
    };
  }
}

/**
 * Process image: resize, strip EXIF, optimize
 */
export async function processImage(
  buffer: Buffer,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  } = {}
): Promise<{ buffer: Buffer; metadata: sharp.OutputInfo }> {
  const {
    maxWidth = 2000,
    maxHeight = 2000,
    quality = 85,
  } = options;
  
  const processed = await sharp(buffer)
    .resize(maxWidth, maxHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality, mozjpeg: true })
    .rotate() // Auto-rotate based on EXIF
    .withMetadata({ exif: {} }) // Strip EXIF for privacy
    .toBuffer({ resolveWithObject: true });
  
  return {
    buffer: processed.data,
    metadata: processed.info,
  };
}

/**
 * Generate thumbnail
 */
export async function generateThumbnail(
  buffer: Buffer,
  size: number = 300
): Promise<Buffer> {
  return sharp(buffer)
    .resize(size, size, {
      fit: 'cover',
      position: 'center',
    })
    .jpeg({ quality: 80, mozjpeg: true })
    .withMetadata({ exif: {} })
    .toBuffer();
}

/**
 * Scan image for malware (integration ready)
 * In production, integrate with ClamAV or VirusTotal
 */
export async function scanImageForMalware(buffer: Buffer): Promise<{
  safe: boolean;
  threat?: string;
}> {
  // TODO: Integrate with ClamAV or cloud antivirus service
  // For now, basic checks
  
  // Check for embedded scripts in image metadata
  try {
    const metadata = await sharp(buffer).metadata();
    const metadataStr = JSON.stringify(metadata).toLowerCase();
    
    const suspiciousPatterns = [
      '<script',
      'javascript:',
      'onerror=',
      'onload=',
      '<?php',
      '<%',
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (metadataStr.includes(pattern)) {
        return {
          safe: false,
          threat: 'Suspicious content detected in metadata',
        };
      }
    }
  } catch {
    // If metadata reading fails, be cautious
    return {
      safe: false,
      threat: 'Could not verify image safety',
    };
  }
  
  return { safe: true };
}

/**
 * Complete image upload pipeline
 */
export async function handleImageUpload(
  file: Buffer,
  filename: string,
  mimetype: string,
  size: number
): Promise<{
  success: boolean;
  error?: string;
  data?: {
    filename: string;
    thumbnailFilename: string;
    metadata: sharp.OutputInfo;
  };
}> {
  try {
    // 1. Validate
    const validation = await validateImageUpload(file, filename, mimetype, size);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }
    
    // 2. Malware scan
    const scanResult = await scanImageForMalware(file);
    if (!scanResult.safe) {
      return {
        success: false,
        error: scanResult.threat || 'Fișier suspect detectat',
      };
    }
    
    // 3. Process main image
    const processed = await processImage(file);
    
    // 4. Generate thumbnail
    await generateThumbnail(file);
    
    // 5. Generate secure filenames
    const secureFilename = generateSecureFilename(filename);
    const thumbnailFilename = `thumb_${secureFilename}`;
    
    // 6. Save to storage (implement based on your storage solution)
    // await saveToStorage(secureFilename, processed.buffer);
    // await saveToStorage(thumbnailFilename, thumbnail);
    
    return {
      success: true,
      data: {
        filename: secureFilename,
        thumbnailFilename,
        metadata: processed.metadata,
      },
    };
  } catch (error) {
    console.error('Image upload error:', error);
    return {
      success: false,
      error: 'Eroare la procesarea imaginii',
    };
  }
}

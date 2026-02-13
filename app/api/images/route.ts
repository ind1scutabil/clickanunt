/**
 * Advanced API Route for Image Upload with Cloud Storage
 * Handles multi-image upload, processing, and CDN distribution
 * ✅ Includes OpenAI image moderation
 */

export const runtime = "nodejs";
export const maxDuration = 60; // Extended timeout for image processing

import { NextRequest, NextResponse } from "next/server";
import { processImageMultipleSizes, validateImage, stripExifData } from "@/lib/imageProcessing";
import { uploadImage, generateImageKey } from "@/lib/storage";
import { moderateImage } from "@/lib/moderation";
import { validateCSRFToken, CSRFValidationError } from "@/lib/security/csrf";
import { rateLimitPresets, getClientIp } from "@/lib/rateLimit";
import { imageDeleteSchema } from "@/lib/security/validation-schemas";

const MAX_FILES = 20; // Max images per listing
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file

export async function POST(request: NextRequest) {
  try {
    await validateCSRFToken(request);
    const ip = getClientIp(request);
    const rateLimit = rateLimitPresets.upload(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Too many uploads. Try again in ${rateLimit.retryAfter} seconds.` },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const listingId = formData.get("listingId") as string;

    // Validation
    if (!listingId) {
      return NextResponse.json({ error: "Listing ID required" }, { status: 400 });
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES} files allowed` },
        { status: 400 }
      );
    }

    // Process each uploaded image
    const uploadResults = await Promise.all(
      files.map(async (file, index) => {
        try {
          // Convert File to Buffer
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          // Validate file size
          if (buffer.length > MAX_FILE_SIZE) {
            return {
              success: false,
              filename: file.name,
              error: "File size exceeds 10MB",
            };
          }

          // Validate image
          const validation = await validateImage(buffer);
          if (!validation.valid) {
            return {
              success: false,
              filename: file.name,
              error: validation.error,
            };
          }

          // Strip EXIF data for privacy
          const cleanBuffer = await stripExifData(buffer);

          // Process image into multiple sizes
          const processedImages = await processImageMultipleSizes(cleanBuffer, [
            "thumb",
            "medium",
            "large",
            "original",
          ]);

          // Upload each size to cloud storage
          const urls: { [key: string]: string } = {};
          
          for (const [size, imageBuffer] of processedImages.entries()) {
            const key = generateImageKey(listingId, size, file.name);
            const url = await uploadImage(imageBuffer, key, "image/jpeg");
            urls[size] = url;
          }

          // ✅ MODERARE IMAGINE cu OpenAI (doar pe size medium pentru cost mai mic)
          console.log('🔍 Moderare imagine:', file.name);
          const moderationResult = await moderateImage(urls.medium || urls.large || urls.original);
          
          if (moderationResult.flagged) {
            console.log('❌ Imagine respinsă:', moderationResult.reason);
            
            // Șterge imaginea uploaded din cloud
            const { deleteImages } = await import("@/lib/storage");
            const keysToDelete = Array.from(processedImages.keys()).map(size => 
              generateImageKey(listingId, size as "thumb" | "medium" | "large" | "original", file.name)
            );
            await deleteImages(keysToDelete);

            return {
              success: false,
              filename: file.name,
              error: moderationResult.reason || 'Imagine respinsă de sistemul de moderare',
              moderationDetails: {
                issues: moderationResult.issues,
                confidence: moderationResult.confidence,
              }
            };
          }

          console.log('✅ Imagine aprobată:', file.name);

          return {
            success: true,
            filename: file.name,
            urls,
            index,
            moderation: {
              approved: true,
              confidence: moderationResult.confidence,
            }
          };
        } catch (error: any) {
          console.error(`Error processing ${file.name}:`, error);
          return {
            success: false,
            filename: file.name,
            error: error.message || "Processing failed",
          };
        }
      })
    );

    // Separate successful and failed uploads
    const successful = uploadResults.filter((r) => r.success);
    const failed = uploadResults.filter((r) => !r.success);

    return NextResponse.json({
      success: true,
      uploaded: successful.length,
      failed: failed.length,
      results: uploadResults,
      message: `Successfully uploaded ${successful.length}/${files.length} images`,
    });
  } catch (error: any) {
    if (error instanceof CSRFValidationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload images", details: error.message },
      { status: 500 }
    );
  }
}

// Delete images endpoint
export async function DELETE(request: NextRequest) {
  try {
    await validateCSRFToken(request);
    const ip = getClientIp(request);
    const rateLimit = rateLimitPresets.upload(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Too many delete requests. Try again in ${rateLimit.retryAfter} seconds.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = imageDeleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { urls } = parsed.data;

    // Extract keys and delete from storage
    const { extractKeyFromUrl, deleteImages } = await import("@/lib/storage");
    
    const keys = urls
      .map((url) => extractKeyFromUrl(url))
      .filter((key): key is string => key !== null);

    await deleteImages(keys);

    return NextResponse.json({
      success: true,
      deleted: keys.length,
      message: `Successfully deleted ${keys.length} images`,
    });
  } catch (error: any) {
    if (error instanceof CSRFValidationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete images", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Shared limits for listing photo uploads (API + processing).
 */

import { LISTING_MAX_PHOTOS, UPLOAD_MAX_IMAGE_BYTES } from "@/lib/infra/production-limits";

export const LISTING_IMAGE_UPLOAD = {
  maxPhotos: LISTING_MAX_PHOTOS,
  maxInputFileBytes: UPLOAD_MAX_IMAGE_BYTES,
  /** Hard cap before decode (defense against abuse). */
  maxDecodeBytes: 25 * 1024 * 1024,
  /** Stored "original" longest edge after normalize. */
  maxOutputLongestSide: 2560,
  jpegQuality: 85,
  jpegQualityFallback: 78,
  acceptedSharpFormats: new Set([
    "jpeg",
    "jpg",
    "png",
    "webp",
    "heif",
    "heic",
  ]),
} as const;

export const LISTING_IMAGE_PROCESS_ERROR =
  "Imaginea nu a putut fi procesată. Încearcă o altă poză sau fă screenshot/resize.";

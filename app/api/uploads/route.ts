export const runtime = "nodejs";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { uploadImage, generateImageKey } from "@/lib/storage";
import { validateImage, stripExifData } from "@/lib/imageProcessing";
import { v4 as uuidv4 } from "uuid";

/**
 * POST /api/uploads
 * Legacy endpoint that accepts base64 encoded images
 * Converts to FormData and delegates to cloud storage
 * 
 * Body: { filename: string, data: string (base64), listingId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filename, data, listingId } = body;

    // Validate input
    if (!data) {
      return NextResponse.json({ error: "no data provided" }, { status: 400 });
    }

    if (typeof data !== "string") {
      return NextResponse.json({ error: "data must be base64 string" }, { status: 400 });
    }

    // Convert base64 to buffer
    const buf = Buffer.from(data, "base64");

    // Validate file size
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (buf.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB" },
        { status: 400 }
      );
    }

    // Validate image
    const validation = await validateImage(buf);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Strip EXIF data for privacy
    const cleanBuffer = await stripExifData(buf);

    // Generate storage key
    // If listingId provided, use cloud storage with proper folder structure
    // Otherwise, generate a temporary key for orphaned images
    const id = listingId || `temp-${uuidv4()}`;
    const ext = filename ? filename.split(".").pop() : "jpg";
    const tempFilename = `${uuidv4()}.${ext}`;
    const key = generateImageKey(id, "original", tempFilename);

    // Upload to cloud storage
    const url = await uploadImage(cleanBuffer, key, "image/jpeg");

    return NextResponse.json({ 
      url,
      key,
      listingId: id
    });
  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}

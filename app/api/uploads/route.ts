export const runtime = "nodejs";
export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { uploadImage, generateImageKey } from "@/lib/storage";
import { validateImage, stripExifData } from "@/lib/imageProcessing";
import { v4 as uuidv4 } from "uuid";
import { validateSecureRequest } from "@/lib/security/middleware";
import { uploadBase64Schema } from "@/lib/security/validation-schemas";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

function getPublicBaseUrl(request: NextRequest): string {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (host) {
    return `${proto}://${host}`;
  }
  return 'https://www.clickanunt.ro';
}

function normalizePublicUrl(url: string, request: NextRequest): string {
  const baseUrl = getPublicBaseUrl(request);
  try {
    const parsed = new URL(url);
    const localhostHosts = new Set([
      'localhost:3000',
      '127.0.0.1:3000',
      '0.0.0.0:3000',
      '46.225.69.155:3000',
    ]);
    if (localhostHosts.has(parsed.host)) {
      return `${baseUrl}${parsed.pathname}`;
    }
  } catch {
    // Ignore URL parsing errors
  }
  return url;
}

/**
 * POST /api/uploads
 * Image/Video upload endpoint
 * Accepts base64 encoded files, validates, and stores to cloud storage
 * 
 * Body: { data: string (base64), filename?: string, listingId?: string, type?: "image" | "video" }
 * Note: filename is optional and not used - server generates safe filename automatically
 */
export async function POST(request: NextRequest) {
  try {
    const logUploadDebug = (message: string, meta: Record<string, unknown> = {}) => {
      try {
        const line = JSON.stringify({ ts: new Date().toISOString(), message, meta });
        fs.appendFileSync("/tmp/uploads-debug.log", line + "\n");
      } catch {
        // no-op
      }
    };

    const security = await validateSecureRequest(request, {
      requireCSRF: true,
      rateLimit: 'upload',
    });

    if (!security.success) {
      const status = security.rateLimitError
        ? 429
        : security.csrfError
        ? 403
        : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    logUploadDebug("request_received", {
      method: request.method,
      hasBody: !!body,
      bodyKeys: body && typeof body === 'object' ? Object.keys(body as Record<string, unknown>) : [],
    });

    let parsed = uploadBase64Schema.safeParse(body);
    if (!parsed.success) {
      const onlyFilenameIssues = parsed.error.issues.every(issue => issue.path.join('.') === 'filename');
      if (onlyFilenameIssues && body && typeof body === 'object') {
        const { filename: _ignored, ...rest } = body as Record<string, unknown>;
        parsed = uploadBase64Schema.safeParse(rest);
      }
    }

    if (!parsed.success) {
      const issues = parsed.error.issues;
      const bodyKeys = body && typeof body === 'object' ? Object.keys(body as Record<string, unknown>) : [];
      console.error('Upload validation failed', { issues, bodyKeys });
      logUploadDebug("validation_failed", {
        issues: issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        bodyKeys,
      });
      const errors = issues
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join('; ');
      return NextResponse.json({ error: errors || 'Invalid input' }, { status: 400 });
    }

    const { filename, data, listingId, type } = parsed.data as {
      filename?: string;
      data: string;
      listingId?: string;
      type?: "image" | "video";
    };

    // Validate input
    console.log('[UPLOAD] Request received', { 
      hasData: !!data, 
      dataType: typeof data,
      dataLength: data?.length || 0,
      type: type || 'not specified',
      hasListingId: !!listingId
    });

    if (!data) {
      console.error('[UPLOAD] Failed: no data provided');
      return NextResponse.json({ error: "no data provided" }, { status: 400 });
    }

    if (typeof data !== "string") {
      console.error('[UPLOAD] Failed: data not string', { actualType: typeof data });
      return NextResponse.json({ error: "data must be base64 string" }, { status: 400 });
    }

    // Convert base64 to buffer
    let buf: Buffer;
    try {
      buf = Buffer.from(data, "base64");
      console.log('[UPLOAD] Base64 decoded', { bufferSize: buf.length });
    } catch (error) {
      console.error('[UPLOAD] Base64 decode failed', { error });
      return NextResponse.json({ error: "Invalid base64 data" }, { status: 400 });
    }

    // Detect file type from magic bytes if not provided
    let fileType = type || "image";
    
    // Check if it's a video by magic bytes
    if (buf.length >= 4) {
      const magic = buf.toString("hex", 0, 4);
      if (magic.startsWith("ftyp")) { // MP4
        fileType = "video";
      }
    }

    // Validate file size based on type
    const maxSize = fileType === "video" ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    if (buf.length > maxSize) {
      return NextResponse.json(
        { error: `File size exceeds ${fileType === "video" ? "50MB" : "10MB"}` },
        { status: 400 }
      );
    }

    // For images: validate and process
    if (fileType === "image") {
      console.log('[UPLOAD] Processing image');
      
      // Validate image
      const validation = await validateImage(buf);
      if (!validation.valid) {
        console.error('[UPLOAD] Image validation failed', { error: validation.error });
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }

      console.log('[UPLOAD] Image validated');

      // Strip EXIF data for privacy
      const cleanBuffer = await stripExifData(buf);
      console.log('[UPLOAD] EXIF stripped');

      // Generate storage key with SAFE filename (ignore original filename completely)
      const id = listingId || `temp-${uuidv4()}`;
      const safeExt = 'jpg'; // Default safe extension
      const tempFilename = `${uuidv4()}.${safeExt}`;
      const key = generateImageKey(id, "original", tempFilename);

      console.log('[UPLOAD] Generated storage key', { id, key, tempFilename });

      // Upload to cloud storage
      let url = await uploadImage(cleanBuffer, key, "image/jpeg");
      console.log('[UPLOAD] Uploaded to storage', { rawUrl: url });
      
      url = normalizePublicUrl(url, request);
      console.log('[UPLOAD] Image upload complete', { finalUrl: url });

      return NextResponse.json({ 
        url,
        key,
        listingId: id,
        type: "image"
      });
    }

    // For videos: direct upload to storage
    if (fileType === "video") {
      const id = listingId || `temp-${uuidv4()}`;
      const safeExt = 'mp4'; // Default safe extension
      const tempFilename = `${uuidv4()}.${safeExt}`;
      const key = `listings/${id}/videos/${tempFilename}`;

      // Upload video to cloud storage
      let url = await uploadImage(buf, key, "video/mp4");
      url = normalizePublicUrl(url, request);

      return NextResponse.json({
        url,
        key,
        listingId: id,
        type: "video"
      });
    }

    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}

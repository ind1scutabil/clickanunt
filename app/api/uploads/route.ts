export const runtime = "nodejs";
export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";
import { prepareListingImageForUpload } from "@/lib/imageProcessing";
import { v4 as uuidv4 } from "uuid";
import { validateSecureRequest } from "@/lib/security/middleware";
import { uploadBase64Schema } from "@/lib/security/validation-schemas";
import { logUploadEvent } from "@/lib/observability/domain-events";
import { UPLOAD_MAX_IMAGE_BYTES } from "@/lib/infra/production-limits";
import { uploadListingImageWithVariants } from "@/lib/listing-image-pipeline";

const MAX_IMAGE_SIZE = UPLOAD_MAX_IMAGE_BYTES;

function getPublicBaseUrl(request: NextRequest): string {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');

  // Local/dev HTTP hosts. Android emulator loopback (10.0.2.2) is accepted only
  // outside production so a spoofed Host cannot force http:// URLs in prod.
  const hostTrimmed = host?.trim() ?? '';
  const isClassicLocal = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|46\.225\.69\.155)(:\d+)?$/i.test(
    hostTrimmed
  );
  const isEmulatorLoopback =
    process.env.NODE_ENV !== 'production' &&
    /^(10\.0\.2\.2)(:\d+)?$/i.test(hostTrimmed);
  const protoFromHost = host && (isClassicLocal || isEmulatorLoopback) ? 'http' : 'https';

  const proto = forwardedProto?.split(',')[0]?.trim() || protoFromHost;
  if (host) return `${proto}://${host}`;

  return 'https://www.clickanunt.ro';
}

/**
 * Dev: localhost → URL publică corectă. HTTPS: upgrade.
 * Domeniul nostru: aliniere www vs apex.
 * NU înlocui hostul S3/R2/CDN cu hostname-ul site-ului — altfel toate URL-urile ar indica același origin
 * și pozele multiple pot părea identice sau se încarcă greșit.
 */
function normalizePublicUrl(url: string, request: NextRequest): string {
  const baseUrl = getPublicBaseUrl(request);
  const base = new URL(baseUrl);
  try {
    const parsed = new URL(url);

    const isLocalHost = (h: string) =>
      h === 'localhost' ||
      h === '127.0.0.1' ||
      h === '0.0.0.0' ||
      h === '::1' ||
      h === '46.225.69.155' ||
      (process.env.NODE_ENV !== 'production' && h === '10.0.2.2');

    const parsedHostname = parsed.hostname.toLowerCase();
    const baseHostname = base.hostname.toLowerCase();
    const baseIsLocal = isLocalHost(baseHostname);
    const parsedIsLocal = isLocalHost(parsedHostname);

    if (parsed.protocol !== 'https:') {
      parsed.protocol = 'https:';
    }

    const parsedHost = parsed.hostname.toLowerCase();
    const isOurSite = parsedHost === 'clickanunt.ro' || parsedHost === 'www.clickanunt.ro';

    if (isOurSite && parsedHostname !== baseHostname) {
      parsed.hostname = base.hostname;
      // Dacă suntem pe local, refacem tot origin-ul (inclusiv protocolul) la baseUrl (de ex. http://localhost:3000)
      if (baseIsLocal) {
        return `${baseUrl}${parsed.pathname}${parsed.search}`;
      }
      return parsed.toString();
    }

    // Dacă baseUrl e local, orice URL care ajunge (direct sau prin rescriere) la local trebuie să folosească HTTP.
    if (baseIsLocal && (parsedIsLocal || isOurSite)) {
      return `${baseUrl}${parsed.pathname}${parsed.search}`;
    }

    return parsed.toString();
  } catch {
    // Ignore URL parsing errors
  }
  return url;
}

/**
 * POST /api/uploads
 * Image upload endpoint (video rejected — Listing has no video column).
 * Accepts base64 encoded files, validates, and stores to cloud storage
 *
 * Body: { data: string (base64), filename?: string, listingId?: string, type?: "image" }
 * Note: filename is optional and not used - server generates safe filename automatically
 */
export async function POST(request: NextRequest) {
  try {
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

    logUploadEvent("request_received", {
      method: request.method,
      hasBody: !!body,
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
      logUploadEvent(
        "validation_failed",
        { issueCount: issues.length, bodyKeyCount: bodyKeys.length },
        "warn"
      );
      const errors = issues
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join('; ');
      return NextResponse.json({ error: errors || 'Invalid input' }, { status: 400 });
    }

    const { data, listingId } = parsed.data as {
      filename?: string;
      data: string;
      listingId?: string;
      type?: "image";
    };

    // Validate input
    if (!data) {
      return NextResponse.json({ error: "no data provided" }, { status: 400 });
    }

    if (typeof data !== "string") {
      return NextResponse.json({ error: "data must be base64 string" }, { status: 400 });
    }

    // Convert base64 to buffer
    let buf: Buffer;
    try {
      buf = Buffer.from(data, "base64");
    } catch (error) {
      return NextResponse.json({ error: "Invalid base64 data" }, { status: 400 });
    }

    // Reject video by MP4/ftyp magic bytes (schema already rejects type: "video").
    if (buf.length >= 4) {
      const magic = buf.toString("hex", 0, 4);
      if (magic.startsWith("ftyp")) {
        return NextResponse.json(
          { error: "VIDEO_NOT_SUPPORTED" },
          { status: 400 }
        );
      }
    }

    if (buf.length > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB" },
        { status: 400 }
      );
    }

    const prepared = await prepareListingImageForUpload(buf);
    if (!prepared.success) {
      return NextResponse.json({ error: prepared.error }, { status: 400 });
    }

    const cleanBuffer = prepared.buffer;
    const id = listingId || uuidv4();
    const tempFilename = `${uuidv4()}.jpg`;

    const { url, key } = await uploadListingImageWithVariants(
      cleanBuffer,
      id,
      tempFilename
    );
    const publicUrl = normalizePublicUrl(url, request);

    return NextResponse.json({
      url: publicUrl,
      key,
      listingId: id,
      type: "image",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}

import sharp from "sharp";
import {
  prepareListingImageForUpload,
  validateImage,
} from "@/lib/imageProcessing";
import {
  LISTING_IMAGE_PROCESS_ERROR,
  LISTING_IMAGE_UPLOAD,
} from "@/lib/listing-image-upload-config";
import { LISTING_MAX_PHOTOS } from "@/lib/infra/production-limits";

describe("prepareListingImageForUpload", () => {
  it("resizes images larger than 5000px instead of rejecting", async () => {
    const large = await sharp({
      create: {
        width: 6000,
        height: 4000,
        channels: 3,
        background: { r: 120, g: 80, b: 40 },
      },
    })
      .jpeg({ quality: 90 })
      .toBuffer();

    const result = await prepareListingImageForUpload(large);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const meta = await sharp(result.buffer).metadata();
    expect(meta.width).toBeLessThanOrEqual(
      LISTING_IMAGE_UPLOAD.maxOutputLongestSide
    );
    expect(meta.height).toBeLessThanOrEqual(
      LISTING_IMAGE_UPLOAD.maxOutputLongestSide
    );
    expect(meta.format).toBe("jpeg");
  });

  it("validateImage no longer rejects on dimensions alone", async () => {
    const large = await sharp({
      create: {
        width: 5500,
        height: 3500,
        channels: 3,
        background: { r: 10, g: 10, b: 10 },
      },
    })
      .jpeg()
      .toBuffer();

    const validation = await validateImage(large);
    expect(validation.valid).toBe(true);
  });

  it("rejects unsupported file types", async () => {
    const gif = Buffer.from(
      "GIF89a\u0001\u0000\u0001\u0000\u0000\u0000\u0000!\u00f9\u0004\u0000\u0000\u0000\u0000\u0000,\u0000\u0000\u0000\u0000\u0001\u0000\u0001\u0000\u0000\u0002\u0002D\u0001\u0000;",
      "binary"
    );
    const result = await prepareListingImageForUpload(gif);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatch(/Format neacceptat/i);
  });

  it("handles corrupt image gracefully", async () => {
    const corrupt = Buffer.from("not-an-image-at-all", "utf8");
    const result = await prepareListingImageForUpload(corrupt);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe(LISTING_IMAGE_PROCESS_ERROR);
  });

  it("keeps listing max photos constant at 20", () => {
    expect(LISTING_IMAGE_UPLOAD.maxPhotos).toBe(LISTING_MAX_PHOTOS);
    expect(LISTING_MAX_PHOTOS).toBe(20);
  });
});

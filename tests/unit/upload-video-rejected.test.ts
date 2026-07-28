/** @jest-environment node */
import { uploadBase64Schema } from "@/lib/security/validation-schemas";
import { readFileSync } from "fs";
import path from "path";

describe("upload video rejection", () => {
  it("rejects type video in uploadBase64Schema", () => {
    const parsed = uploadBase64Schema.safeParse({
      data: "aaaa",
      type: "video",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts type image", () => {
    const parsed = uploadBase64Schema.safeParse({
      data: "aaaa",
      type: "image",
    });
    expect(parsed.success).toBe(true);
  });

  it("uploads route rejects video persistence path", () => {
    const src = readFileSync(
      path.join(process.cwd(), "app/api/uploads/route.ts"),
      "utf8"
    );
    expect(src).toMatch(/VIDEO_NOT_SUPPORTED/);
    expect(src).not.toMatch(/listings\/\$\{id\}\/videos/);
    expect(src).not.toMatch(/uploadImage\(buf,\s*key,\s*"video\/mp4"\)/);
  });
});

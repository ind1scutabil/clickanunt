/** @jest-environment node */
import {
  filterIndexNowUrls,
  getIndexNowKey,
  submitIndexNow,
} from "@/lib/seo/indexnow-client";

describe("IndexNow client", () => {
  const prev = { ...process.env };

  afterEach(() => {
    process.env = { ...prev };
  });

  it("returns not_configured without INDEXNOW_KEY", async () => {
    delete process.env.INDEXNOW_KEY;
    const res = await submitIndexNow(["https://www.clickanunt.ro/listings/abc"]);
    expect(res.status).toBe("not_configured");
    expect(getIndexNowKey()).toBeNull();
  });

  it("filters non-canonical and private URLs", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.clickanunt.ro";
    process.env.INDEXNOW_KEY = "test-key-12345678";
    const filtered = filterIndexNowUrls([
      "https://www.clickanunt.ro/listings/abc",
      "https://www.clickanunt.ro/listings/abc?q=1",
      "http://www.clickanunt.ro/listings/abc",
      "https://evil.example/listings/abc",
      "https://www.clickanunt.ro/admin/dashboard",
      "https://www.clickanunt.ro/dashboard",
      "https://www.clickanunt.ro/api/listings",
      "https://www.clickanunt.ro/listings/abc/edit",
      "https://www.clickanunt.ro/listings/abc",
    ]);
    expect(filtered).toEqual(["https://www.clickanunt.ro/listings/abc"]);
  });
});

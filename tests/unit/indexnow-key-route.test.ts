/** @jest-environment node */
import { GET } from "@/app/indexnow-key.txt/route";

describe("GET /indexnow-key.txt", () => {
  const prev = { ...process.env };

  afterEach(() => {
    process.env = { ...prev };
  });

  it("returns 404 when INDEXNOW_KEY is unset (fail-safe)", async () => {
    delete process.env.INDEXNOW_KEY;
    const res = await GET();
    expect(res.status).toBe(404);
  });

  it("returns plain-text key publicly when configured", async () => {
    process.env.INDEXNOW_KEY = "public-verify-key-xyz";
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/plain");
    await expect(res.text()).resolves.toBe("public-verify-key-xyz");
  });
});

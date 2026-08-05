/** @jest-environment node */
import {
  enqueueIndexNowSafe,
  filterIndexNowUrls,
  getIndexNowKey,
  indexNowOutboundAllowed,
  submitIndexNow,
} from "@/lib/seo/indexnow-client";

describe("IndexNow client", () => {
  const prev = { ...process.env };
  const originalFetch = global.fetch;

  afterEach(() => {
    process.env = { ...prev };
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("returns not_configured without INDEXNOW_KEY and does not call fetch", async () => {
    delete process.env.INDEXNOW_KEY;
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
    const res = await submitIndexNow(["https://www.clickanunt.ro/listings/abc"]);
    expect(res.status).toBe("not_configured");
    expect(getIndexNowKey()).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("skips outbound calls in non-production even when key is set", async () => {
    process.env.INDEXNOW_KEY = "test-key-12345678";
    process.env.NODE_ENV = "test";
    delete process.env.INDEXNOW_ALLOW_NON_PRODUCTION;
    delete process.env.CLICKANUNT_E2E_SERVER;
    expect(indexNowOutboundAllowed()).toBe(false);
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
    const res = await submitIndexNow(["https://www.clickanunt.ro/listings/abc"]);
    expect(res.status).toBe("skipped_non_production");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("skips outbound calls when CLICKANUNT_E2E_SERVER=1", async () => {
    process.env.INDEXNOW_KEY = "test-key-12345678";
    process.env.NODE_ENV = "production";
    process.env.CLICKANUNT_E2E_SERVER = "1";
    delete process.env.INDEXNOW_ALLOW_NON_PRODUCTION;
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
    const res = await submitIndexNow(["https://www.clickanunt.ro/listings/abc"]);
    expect(res.status).toBe("skipped_non_production");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("filters non-canonical, private, draft-like and duplicate URLs; keeps canonical www host only", () => {
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
      "https://www.clickanunt.ro/auth/login",
      "https://www.clickanunt.ro/messages",
      "https://www.clickanunt.ro/favorites",
      "https://www.clickanunt.ro/listings/abc/edit",
      "https://www.clickanunt.ro/listings/abc/promote",
      "https://www.clickanunt.ro/listings/new",
      "https://clickanunt.ro/listings/abc",
      "https://www.clickanunt.ro/listings/abc",
    ]);
    expect(filtered).toEqual(["https://www.clickanunt.ro/listings/abc"]);
  });

  it("accepts 202 as accepted-for-processing (not proof of Bing indexing)", async () => {
    process.env.INDEXNOW_KEY = "test-key-12345678";
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.clickanunt.ro";
    process.env.INDEXNOW_ALLOW_NON_PRODUCTION = "1";
    global.fetch = jest.fn().mockResolvedValue({ status: 202 }) as unknown as typeof fetch;
    const res = await submitIndexNow(["https://www.clickanunt.ro/listings/abc"]);
    expect(res.status).toBe("accepted");
    expect(res.httpStatus).toBe(202);
    expect(res.urlCount).toBe(1);
  });

  it("maps 4xx (non-429) and 5xx to failed without throwing", async () => {
    process.env.INDEXNOW_KEY = "test-key-12345678";
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.clickanunt.ro";
    process.env.INDEXNOW_ALLOW_NON_PRODUCTION = "1";

    global.fetch = jest.fn().mockResolvedValue({ status: 400 }) as unknown as typeof fetch;
    await expect(submitIndexNow(["https://www.clickanunt.ro/listings/abc"])).resolves.toMatchObject({
      status: "failed",
      httpStatus: 400,
    });

    global.fetch = jest.fn().mockResolvedValue({ status: 503 }) as unknown as typeof fetch;
    await expect(submitIndexNow(["https://www.clickanunt.ro/listings/abc"])).resolves.toMatchObject({
      status: "failed",
      httpStatus: 503,
    });
  });

  it("maps 429 to rate_limited", async () => {
    process.env.INDEXNOW_KEY = "test-key-12345678";
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.clickanunt.ro";
    process.env.INDEXNOW_ALLOW_NON_PRODUCTION = "1";
    global.fetch = jest.fn().mockResolvedValue({ status: 429 }) as unknown as typeof fetch;
    await expect(submitIndexNow(["https://www.clickanunt.ro/listings/abc"])).resolves.toMatchObject({
      status: "rate_limited",
      httpStatus: 429,
    });
  });

  it("treats abort/timeout as failed and does not throw", async () => {
    process.env.INDEXNOW_KEY = "test-key-12345678";
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.clickanunt.ro";
    process.env.INDEXNOW_ALLOW_NON_PRODUCTION = "1";
    global.fetch = jest.fn().mockImplementation(() => {
      const err = new Error("aborted");
      err.name = "AbortError";
      return Promise.reject(err);
    }) as unknown as typeof fetch;
    await expect(submitIndexNow(["https://www.clickanunt.ro/listings/abc"])).resolves.toMatchObject({
      status: "failed",
      detail: "AbortError",
    });
  });

  it("enqueueIndexNowSafe never throws when submit rejects", () => {
    process.env.INDEXNOW_KEY = "test-key-12345678";
    process.env.NODE_ENV = "production";
    process.env.INDEXNOW_ALLOW_NON_PRODUCTION = "1";
    global.fetch = jest.fn().mockRejectedValue(new Error("boom")) as unknown as typeof fetch;
    expect(() => enqueueIndexNowSafe(["https://www.clickanunt.ro/listings/abc"])).not.toThrow();
  });

  it("posts canonical host + keyLocation and dedupes urlList", async () => {
    process.env.INDEXNOW_KEY = "test-key-12345678";
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.clickanunt.ro";
    process.env.INDEXNOW_ALLOW_NON_PRODUCTION = "1";
    const fetchSpy = jest.fn().mockResolvedValue({ status: 200 });
    global.fetch = fetchSpy as unknown as typeof fetch;
    await submitIndexNow([
      "https://www.clickanunt.ro/listings/abc",
      "https://www.clickanunt.ro/listings/abc",
    ]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, init] = fetchSpy.mock.calls[0];
    const body = JSON.parse(String(init.body));
    expect(body.host).toBe("www.clickanunt.ro");
    expect(body.keyLocation).toBe("https://www.clickanunt.ro/indexnow-key.txt");
    expect(body.urlList).toEqual(["https://www.clickanunt.ro/listings/abc"]);
    expect(body.key).toBe("test-key-12345678");
  });
});

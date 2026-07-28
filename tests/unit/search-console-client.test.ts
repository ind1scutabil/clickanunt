/** @jest-environment node */
import {
  emptySearchConsoleDashboardPayload,
  fetchSearchConsoleReport,
  isBrandedQuery,
} from "@/lib/seo/search-console-client";

describe("Search Console client", () => {
  const prev = { ...process.env };

  afterEach(() => {
    process.env = { ...prev };
  });

  it("returns not_configured when credentials missing", async () => {
    delete process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL;
    delete process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY;
    delete process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL;
    const res = await fetchSearchConsoleReport({ rangeDays: 28, dimension: "query" });
    expect(res.status).toBe("not_configured");
    expect(emptySearchConsoleDashboardPayload().status).toBe("not_configured");
  });

  it("classifies branded queries", () => {
    expect(isBrandedQuery("clickanunt auto")).toBe(true);
    expect(isBrandedQuery("peugeot 508 second hand")).toBe(false);
  });
});

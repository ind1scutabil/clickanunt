/**
 * @jest-environment node
 *
 * /listings?q=… used to return an empty SSR seed: the server bailed out on any query of
 * two characters or more, so the HTML showed zero results while the browser showed the
 * real ones after hydration. SSR must now run the same FTS path as GET /api/listings.
 */

const ftsSearchListingIds = jest.fn();
const browseListingIdsOrdered = jest.fn();
const findMany = jest.fn();
const count = jest.fn();

jest.mock("@/lib/listing-fts-query", () => ({
  buildRomanianTsQuery: jest.requireActual("@/lib/listing-fts-query").buildRomanianTsQuery,
  ftsSearchListingIds: (...args: unknown[]) => ftsSearchListingIds(...args),
}));

jest.mock("@/lib/listings/catalog-listing-ids", () => ({
  browseListingIdsOrdered: (...args: unknown[]) => browseListingIdsOrdered(...args),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    listing: {
      findMany: (...args: unknown[]) => findMany(...args),
      count: (...args: unknown[]) => count(...args),
    },
  },
}));

jest.mock("@/lib/site-url", () => ({
  siteOrigin: () => "https://www.clickanunt.ro",
}));

import {
  getPublicBrowseListingsPage,
  parsePublicBrowseFiltersFromSearchParams,
} from "@/lib/listings/public-browse-server";

function listingRow(id: string, title: string) {
  return { id, title, photos: [], owner: { id: "u1" } };
}

describe("SSR browse search parity", () => {
  beforeEach(() => {
    ftsSearchListingIds.mockReset();
    browseListingIdsOrdered.mockReset();
    findMany.mockReset();
    count.mockReset();
    delete process.env.USE_IN_MEMORY_DB;
  });

  it("reads the query from both ?q= and ?search=", () => {
    expect(parsePublicBrowseFiltersFromSearchParams({ q: "Skoda" }).q).toBe("Skoda");
    expect(parsePublicBrowseFiltersFromSearchParams({ search: "Skoda" }).q).toBe("Skoda");
  });

  it.each(["Skoda", "Octavia", "Peugeot"] as const)(
    "returns FTS results for %s instead of an empty seed",
    async (term) => {
      ftsSearchListingIds.mockResolvedValue({ ids: ["a", "b"], ranks: [1, 0.5], total: 7 });
      findMany.mockResolvedValue([listingRow("b", `${term} B`), listingRow("a", `${term} A`)]);

      const res = await getPublicBrowseListingsPage({
        page: 1,
        limit: 12,
        filters: { q: term },
      });

      expect(ftsSearchListingIds).toHaveBeenCalledTimes(1);
      expect(res.total).toBe(7);
      expect(res.listings).toHaveLength(2);
      // Ranking order from FTS must survive the id → row hydration.
      expect(res.listings.map((l) => l.id)).toEqual(["a", "b"]);
    },
  );

  it("returns zero results for a no-hit search term without leaking drafts", async () => {
    ftsSearchListingIds.mockResolvedValue({ ids: [], ranks: [], total: 0 });

    const res = await getPublicBrowseListingsPage({
      page: 1,
      limit: 12,
      filters: { q: "zzzznonexistentbrand999" },
    });

    expect(ftsSearchListingIds).toHaveBeenCalledTimes(1);
    const [, , filters] = ftsSearchListingIds.mock.calls[0] as [
      unknown,
      string,
      Record<string, unknown>,
    ];
    expect(filters.activeOnly).toBe(true);
    expect(filters.publicCatalogOnly).toBe(true);
    expect(res).toEqual({ listings: [], total: 0, page: 1 });
  });

  it("restricts SSR search to the public, active, approved catalog", async () => {
    ftsSearchListingIds.mockResolvedValue({ ids: [], ranks: [], total: 0 });

    await getPublicBrowseListingsPage({ page: 1, limit: 12, filters: { q: "Skoda" } });

    const [, tsQuery, filters] = ftsSearchListingIds.mock.calls[0] as [
      unknown,
      string,
      Record<string, unknown>,
    ];
    expect(tsQuery).toBe("skoda:*");
    expect(filters.activeOnly).toBe(true);
    expect(filters.publicCatalogOnly).toBe(true);
  });

  it("forwards catalog filters to FTS exactly as the API does", async () => {
    ftsSearchListingIds.mockResolvedValue({ ids: [], ranks: [], total: 0 });

    await getPublicBrowseListingsPage({
      page: 2,
      limit: 12,
      filters: {
        q: "Octavia",
        category: "Auto, moto și ambarcațiuni",
        subcategory: "Autoturisme",
        county: "Gorj",
        city: "Târgu Jiu",
        make: "Skoda",
        model: "Octavia",
        fuel: "diesel",
        transmission: "manual",
      },
    });

    const [, , filters, limit, offset] = ftsSearchListingIds.mock.calls[0] as [
      unknown,
      string,
      Record<string, unknown>,
      number,
      number,
    ];
    expect(filters).toMatchObject({
      category: "Auto, moto și ambarcațiuni",
      subcategory: "Autoturisme",
      county: "Gorj",
      city: "Târgu Jiu",
      make: "Skoda",
      model: "Octavia",
      fuel: "diesel",
      transmission: "manual",
    });
    expect(limit).toBe(12);
    expect(offset).toBe(12);
  });

  it("does not use FTS for a single-character query", async () => {
    count.mockResolvedValue(0);
    findMany.mockResolvedValue([]);

    await getPublicBrowseListingsPage({ page: 1, limit: 12, filters: { q: "S" } });

    expect(ftsSearchListingIds).not.toHaveBeenCalled();
    expect(findMany).toHaveBeenCalled();
  });

  it("returns an empty seed when the query has no searchable tokens", async () => {
    const res = await getPublicBrowseListingsPage({
      page: 1,
      limit: 12,
      filters: { q: "!!!" },
    });

    expect(ftsSearchListingIds).not.toHaveBeenCalled();
    expect(res).toEqual({ listings: [], total: 0, page: 1 });
  });

  it("keeps the plain browse path untouched when no query is given", async () => {
    count.mockResolvedValue(39);
    findMany.mockResolvedValue([listingRow("a", "A")]);

    const res = await getPublicBrowseListingsPage({ page: 1, limit: 12, filters: {} });

    expect(ftsSearchListingIds).not.toHaveBeenCalled();
    expect(res.total).toBe(39);
    expect(res.listings).toHaveLength(1);
  });
});

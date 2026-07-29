/** @jest-environment node */
import { seoIndexableListingWhere } from "@/lib/seo/indexable-listing-where";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    listing: {
      count: jest.fn(),
      groupBy: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { getHomePageInitialStats } from "@/lib/home-page-stats";

describe("getHomePageInitialStats (FAZA 22 — homepage catalog count)", () => {
  beforeEach(() => {
    jest.mocked(prisma.listing.count).mockReset();
    jest.mocked(prisma.listing.groupBy).mockReset();
  });

  it("is not hardcoded — reflects whatever prisma.listing.count() resolves to", async () => {
    jest.mocked(prisma.listing.count).mockResolvedValueOnce(22);
    jest.mocked(prisma.listing.groupBy).mockResolvedValueOnce([]);
    const stats = await getHomePageInitialStats();
    expect(stats.activeListings).toBe(22);

    jest.mocked(prisma.listing.count).mockResolvedValueOnce(9999);
    jest.mocked(prisma.listing.groupBy).mockResolvedValueOnce([]);
    const stats2 = await getHomePageInitialStats();
    expect(stats2.activeListings).toBe(9999);
  });

  it("uses a single prisma.listing.count() call (no items.length, no pagination) with the canonical public where clause", async () => {
    jest.mocked(prisma.listing.count).mockResolvedValueOnce(22);
    jest.mocked(prisma.listing.groupBy).mockResolvedValueOnce([]);
    await getHomePageInitialStats();

    expect(prisma.listing.count).toHaveBeenCalledTimes(1);
    const callArgs = jest.mocked(prisma.listing.count).mock.calls[0][0] as { where: unknown };
    const canonical = seoIndexableListingWhere();
    // Same shape as the canonical helper used by /api/stats, /api/listings, sitemaps.
    expect(callArgs.where).toMatchObject({
      status: canonical.status,
      deletedAt: canonical.deletedAt,
      moderationStatus: canonical.moderationStatus,
    });
    expect(callArgs).not.toHaveProperty("take");
    expect(callArgs).not.toHaveProperty("skip");
  });

  it("category counts come from a single groupBy on the same canonical where clause (no divergent per-category rule)", async () => {
    jest.mocked(prisma.listing.count).mockResolvedValueOnce(3);
    jest.mocked(prisma.listing.groupBy).mockResolvedValueOnce([
      { category: "Auto, moto și ambarcațiuni", _count: { _all: 2 } },
      { category: "Imobiliare", _count: { _all: 1 } },
    ] as unknown as never);

    const stats = await getHomePageInitialStats();
    expect(stats.categoryCounts).toEqual({
      "Auto, moto și ambarcațiuni": 2,
      Imobiliare: 1,
    });
    expect(prisma.listing.groupBy).toHaveBeenCalledTimes(1);
    const groupByArgs = jest.mocked(prisma.listing.groupBy).mock.calls[0][0] as { where: unknown };
    const canonical = seoIndexableListingWhere();
    expect(groupByArgs.where).toMatchObject({
      status: canonical.status,
      deletedAt: canonical.deletedAt,
      moderationStatus: canonical.moderationStatus,
    });
  });
});

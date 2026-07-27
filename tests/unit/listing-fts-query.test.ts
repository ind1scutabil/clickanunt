/** @jest-environment node */
import { ftsSearchListingIds } from "@/lib/listing-fts-query";

describe("ftsSearchListingIds public catalog filter", () => {
  const queryRaw = jest.fn();
  const prisma = { $queryRaw: queryRaw } as unknown as Parameters<typeof ftsSearchListingIds>[0];

  beforeEach(() => {
    queryRaw.mockReset();
    queryRaw
      .mockResolvedValueOnce([{ id: "a", rank: 1 }])
      .mockResolvedValueOnce([{ count: BigInt(1) }]);
  });

  it("includes moderationStatus=approved guard when publicCatalogOnly is true", async () => {
    await ftsSearchListingIds(prisma, "test:*", { publicCatalogOnly: true }, 10, 0);

    const selectSql = String(queryRaw.mock.calls[0][0]?.strings?.join(" ") ?? queryRaw.mock.calls[0][0]);
    const values = queryRaw.mock.calls[0].slice(1);
    expect(selectSql).toContain('"moderationStatus"');
    expect(selectSql).toContain("approved");
    expect(values).toContain(true);
  });

  it("skips moderation guard when publicCatalogOnly is false (owner/admin scope)", async () => {
    await ftsSearchListingIds(
      prisma,
      "test:*",
      { publicCatalogOnly: false, ownerUserId: "owner-1", activeOnly: false },
      10,
      0,
    );

    const call = queryRaw.mock.calls[0];
    const values = call.slice(1);
    expect(values).toContain(false);
    expect(values).toContain("owner-1");
  });

  it("includes condition, priceCurrency, attributes containment and id tie-break", async () => {
    await ftsSearchListingIds(
      prisma,
      "telefon:*",
      {
        publicCatalogOnly: true,
        condition: "used",
        priceCurrency: "RON",
        minPrice: 100,
        attributesContainmentJson: JSON.stringify({ brand: "Samsung" }),
      },
      10,
      0,
    );

    const selectSql = String(queryRaw.mock.calls[0][0]?.strings?.join(" ") ?? queryRaw.mock.calls[0][0]);
    const values = queryRaw.mock.calls[0].slice(1);
    expect(selectSql).toContain("condition");
    expect(selectSql).toContain("priceCurrency");
    expect(selectSql).toContain("@>");
    expect(selectSql).toContain("id DESC");
    expect(values).toContain("used");
    expect(values).toContain("RON");
    expect(values).toContain(JSON.stringify({ brand: "Samsung" }));
  });
});

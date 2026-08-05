/** @jest-environment node */
import { browseListingIdsOrdered } from "@/lib/listings/catalog-listing-ids";

function deepValues(call: unknown[]): unknown[] {
  const out: unknown[] = [];
  const walk = (v: unknown) => {
    if (Array.isArray(v)) {
      for (const x of v) walk(x);
      return;
    }
    if (v && typeof v === "object" && "values" in (v as object) && "strings" in (v as object)) {
      for (const x of (v as { values: unknown[] }).values) walk(x);
      return;
    }
    out.push(v);
  };
  for (const x of call.slice(1)) walk(x);
  return out;
}

function deepSqlText(call: unknown[]): string {
  const head = call[0] as { strings?: readonly string[]; raw?: readonly string[] } | string[];
  const strings = Array.isArray(head) ? head : (head?.strings ?? head?.raw ?? []);
  const values = call.slice(1);
  let out = "";
  for (let i = 0; i < strings.length; i++) {
    out += strings[i];
    if (i < values.length) {
      const v = values[i];
      if (v && typeof v === "object" && "strings" in (v as object)) {
        out += deepSqlText([
          (v as { strings: string[] }).strings,
          ...(v as { values: unknown[] }).values,
        ]);
      } else {
        out += "?";
      }
    }
  }
  return out;
}

describe("browseListingIdsOrdered currency-aware price sort", () => {
  const queryRaw = jest.fn();
  const prisma = { $queryRaw: queryRaw } as unknown as Parameters<typeof browseListingIdsOrdered>[0];

  beforeEach(() => {
    queryRaw.mockReset();
    queryRaw
      .mockResolvedValueOnce([{ id: "a" }, { id: "b" }])
      .mockResolvedValueOnce([{ count: BigInt(2) }]);
  });

  it("embeds sortCurrency in priceAsc ORDER BY CASE", async () => {
    await browseListingIdsOrdered(
      prisma,
      {
        publicCatalogOnly: true,
        sort: "priceAsc",
        sortCurrency: "EUR",
      },
      10,
      0
    );
    const sql = deepSqlText(queryRaw.mock.calls[0]);
    const values = deepValues(queryRaw.mock.calls[0]);
    expect(sql.toUpperCase()).toContain("ORDER BY");
    expect(sql).toContain("priceCurrency");
    expect(values).toContain("EUR");
    expect(sql).not.toContain("search_vector");
  });

  it("does not require FTS match for catalog browse", async () => {
    await browseListingIdsOrdered(
      prisma,
      { publicCatalogOnly: true, sort: "priceDesc", sortCurrency: "RON" },
      5,
      5
    );
    const sql = deepSqlText(queryRaw.mock.calls[0]);
    expect(sql).not.toContain("@@");
    expect(sql.toUpperCase()).toContain("LIMIT");
  });
});

/** @jest-environment node */
import { ftsSearchListingIds } from "@/lib/listing-fts-query";

function deepValues(v: unknown, out: unknown[] = []): unknown[] {
  if (Array.isArray(v)) {
    for (const x of v) deepValues(x, out);
    return out;
  }
  if (v && typeof v === "object" && "values" in (v as object) && "strings" in (v as object)) {
    for (const x of (v as { values: unknown[] }).values) deepValues(x, out);
    return out;
  }
  out.push(v);
  return out;
}

function deepSqlTextFromCall(call: unknown[]): string {
  const head = call[0] as { strings?: readonly string[]; raw?: readonly string[] } | string[];
  const strings = Array.isArray(head)
    ? head
    : (head?.strings ?? head?.raw ?? []);
  const values = call.slice(1);
  let out = "";
  for (let i = 0; i < strings.length; i++) {
    out += strings[i];
    if (i < values.length) {
      const v = values[i];
      if (v && typeof v === "object" && "strings" in (v as object)) {
        out += deepSqlTextFromCall([
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

    const selectSql = deepSqlTextFromCall(queryRaw.mock.calls[0]);
    const values = deepValues(queryRaw.mock.calls[0].slice(1));
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

    const values = deepValues(queryRaw.mock.calls[0].slice(1));
    expect(values).toContain(false);
    expect(values).toContain("owner-1");
  });

  it("includes condition, priceCurrency, attributes containment and honors sort allowlist", async () => {
    await ftsSearchListingIds(
      prisma,
      "telefon:*",
      {
        publicCatalogOnly: true,
        condition: "used",
        priceCurrency: "RON",
        minPrice: 100,
        attributesContainmentJson: JSON.stringify({ brand: "Samsung" }),
        sort: "newest",
      },
      10,
      0,
    );

    const selectSql = deepSqlTextFromCall(queryRaw.mock.calls[0]);
    const values = deepValues(queryRaw.mock.calls[0].slice(1));
    expect(selectSql).toContain("condition");
    expect(selectSql).toContain("priceCurrency");
    expect(selectSql).toContain("@>");
    expect(selectSql.toUpperCase()).toContain("ORDER BY");
    expect(values).toContain("used");
    expect(values).toContain("RON");
    expect(values).toContain(JSON.stringify({ brand: "Samsung" }));
  });

  it("passes sortCurrency into priceAsc order branch", async () => {
    await ftsSearchListingIds(
      prisma,
      "telefon:*",
      {
        publicCatalogOnly: true,
        sort: "priceAsc",
        sortCurrency: "EUR",
      },
      10,
      0,
    );
    const values = deepValues(queryRaw.mock.calls[0].slice(1));
    expect(values).toContain("EUR");
    const sql = deepSqlTextFromCall(queryRaw.mock.calls[0]);
    expect(sql.toUpperCase()).toContain("ORDER BY");
  });
});

/** @jest-environment node */
import { resolveCityLabelForHub, loadDbCitySlugMapForTest } from "@/lib/seo/hub-queries";
import { classifyAutoFirstSegmentAsync } from "@/lib/seo/auto-hub-resolve";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    listing: {
      groupBy: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

describe("hub city DB fallback (Task 2 — real DB city outside static allowlist)", () => {
  beforeEach(() => {
    jest.mocked(prisma.listing.groupBy).mockReset();
  });

  it("resolveCityLabelForHub: static allowlist hit never touches the DB", async () => {
    const city = await resolveCityLabelForHub("cluj-napoca", loadDbCitySlugMapForTest);
    expect(city).toBe("Cluj-Napoca");
    expect(prisma.listing.groupBy).not.toHaveBeenCalled();
  });

  it("resolveCityLabelForHub: real DB city outside the static allowlist resolves via fallback", async () => {
    jest.mocked(prisma.listing.groupBy).mockResolvedValueOnce([
      { city: "Satu Nou de Sus" },
    ] as never);
    const city = await resolveCityLabelForHub("satu-nou-de-sus", loadDbCitySlugMapForTest);
    expect(city).toBe("Satu Nou de Sus");
  });

  it("resolveCityLabelForHub: unresolvable slug (no static match, no DB rows) returns null", async () => {
    jest.mocked(prisma.listing.groupBy).mockResolvedValueOnce([]);
    const city = await resolveCityLabelForHub("nonexistent-slug-xyz", loadDbCitySlugMapForTest);
    expect(city).toBeNull();
  });

  it("loadDbCitySlugMapForTest: maps slugified DB city values (no PII, fail-soft on error)", async () => {
    jest.mocked(prisma.listing.groupBy).mockResolvedValueOnce([
      { city: "Satu Nou de Sus" },
      { city: null },
      { city: "  " },
    ] as never);
    const map = await loadDbCitySlugMapForTest();
    expect(map["satu-nou-de-sus"]).toBe("Satu Nou de Sus");
    expect(Object.keys(map).length).toBe(1);
  });

  it("loadDbCitySlugMapForTest: DB error → empty map, does not throw", async () => {
    jest.mocked(prisma.listing.groupBy).mockRejectedValueOnce(new Error("db down"));
    await expect(loadDbCitySlugMapForTest()).resolves.toEqual({});
  });

  const resolveDbCityForTest = (slug: string) => resolveCityLabelForHub(slug, loadDbCitySlugMapForTest);

  it("classifyAutoFirstSegmentAsync: static city still wins over make", async () => {
    expect(await classifyAutoFirstSegmentAsync("bucuresti", resolveDbCityForTest)).toBe("city");
  });

  it("classifyAutoFirstSegmentAsync: known make with no DB city match classifies as make", async () => {
    jest.mocked(prisma.listing.groupBy).mockResolvedValueOnce([]);
    expect(await classifyAutoFirstSegmentAsync("bmw", resolveDbCityForTest)).toBe("make");
  });

  it("classifyAutoFirstSegmentAsync: unknown slug matching a real (non-allowlisted) DB city classifies as city", async () => {
    jest.mocked(prisma.listing.groupBy).mockResolvedValueOnce([
      { city: "Satu Nou de Sus" },
    ] as never);
    expect(await classifyAutoFirstSegmentAsync("satu-nou-de-sus", resolveDbCityForTest)).toBe("city");
  });

  it("classifyAutoFirstSegmentAsync: truly unknown slug stays unknown", async () => {
    jest.mocked(prisma.listing.groupBy).mockResolvedValueOnce([]);
    expect(await classifyAutoFirstSegmentAsync("xyz-inexistent", resolveDbCityForTest)).toBe("unknown");
  });
});

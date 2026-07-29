/** @jest-environment node */

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

import { revalidatePath } from "next/cache";
import { revalidatePublicMarketplaceSurfaces } from "@/lib/cache/revalidate-marketplace";

describe("revalidatePublicMarketplaceSurfaces (FAZA 22 — on-demand cache invalidation)", () => {
  beforeEach(() => {
    jest.mocked(revalidatePath).mockReset();
  });

  it("always revalidates the homepage", () => {
    revalidatePublicMarketplaceSurfaces({ reason: "approve" });
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("does not blanket-invalidate the whole site — only '/' when no category/city given", () => {
    revalidatePublicMarketplaceSurfaces({ reason: "reject" });
    expect(revalidatePath).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("also revalidates the category hub when category is known", () => {
    revalidatePublicMarketplaceSurfaces({ reason: "approve", category: "Imobiliare" });
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(revalidatePath).toHaveBeenCalledWith("/imobiliare");
  });

  it("also revalidates the category×city hub when both are known", () => {
    revalidatePublicMarketplaceSurfaces({
      reason: "soft_delete",
      category: "Auto, moto și ambarcațiuni",
      city: "Cluj-Napoca",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(revalidatePath).toHaveBeenCalledWith("/auto");
    expect(revalidatePath).toHaveBeenCalledWith("/auto/cluj-napoca");
  });

  it("silently skips hub revalidation for an unknown category label (never throws)", () => {
    expect(() =>
      revalidatePublicMarketplaceSurfaces({ reason: "moderation", category: "Not A Real Category" }),
    ).not.toThrow();
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(revalidatePath).not.toHaveBeenCalledWith(expect.stringContaining("not-a-real-category"));
  });

  it("does not revalidate a city hub without a category (city alone is not a routable hub)", () => {
    revalidatePublicMarketplaceSurfaces({ reason: "create", city: "București" });
    expect(revalidatePath).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });
});

/** @jest-environment node */
import {
  isCategoryCityHubSeoIndexable,
  categoryCityHubShouldNoindex,
  MIN_INDEXABLE_HUB_LISTINGS,
} from "@/lib/seo/hub-index-policy";

describe("hub index policy", () => {
  it("requires MIN_INDEXABLE_HUB_LISTINGS for city hub index", () => {
    expect(MIN_INDEXABLE_HUB_LISTINGS).toBe(3);
    expect(isCategoryCityHubSeoIndexable(0)).toBe(false);
    expect(isCategoryCityHubSeoIndexable(2)).toBe(false);
    expect(isCategoryCityHubSeoIndexable(3)).toBe(true);
    expect(categoryCityHubShouldNoindex(2)).toBe(true);
    expect(categoryCityHubShouldNoindex(3)).toBe(false);
  });
});

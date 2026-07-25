/** Minimum indexable public listings for category×city hub pages (metadata, sitemap, internal links). */
export const MIN_INDEXABLE_HUB_LISTINGS = 3;

/** Category×city hub is indexable when it has enough public listings (not national pillar pages). */
export function isCategoryCityHubSeoIndexable(listingCount: number): boolean {
  return listingCount >= MIN_INDEXABLE_HUB_LISTINGS;
}

export function categoryCityHubShouldNoindex(listingCount: number): boolean {
  return !isCategoryCityHubSeoIndexable(listingCount);
}

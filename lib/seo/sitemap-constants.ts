/** Max URLs per listing shard (Google allows up to 50k; stay under). */
export const LISTING_SITEMAP_CHUNK_SIZE = 45_000;

/** Minimum active listings for auto programmatic hubs (sitemap + index). */
export const AUTO_HUB_INDEX_THRESHOLDS = {
  make: 5,
  model: 3,
  modelCity: 3,
} as const;

export type AutoHubLevel = keyof typeof AUTO_HUB_INDEX_THRESHOLDS;

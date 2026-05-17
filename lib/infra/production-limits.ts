/**
 * Single-server production caps (current infra: 2 vCPU, ~3.7GB RAM, 1× PM2 fork).
 * Used for defensive guards only — does not change product behavior within normal use.
 */

/** Public listing/search pagination (see lib/pagination.ts MAX_LIMIT). */
export const PAGINATION_MAX_LIMIT = 100;

/** Search API default page size ceiling (app/api/search/route.ts). */
export const SEARCH_MAX_LIMIT = 100;

/** Max offset-style page for APIs that expose `page` (defensive). */
export const MAX_API_PAGE = 500;

/** Message thread page size (app/api/messages/[userId]/route.ts). */
export const MESSAGES_THREAD_MIN = 10;
export const MESSAGES_THREAD_MAX = 150;

/** GET /api/messages/conversations — see lib/messaging/conversations-limit.ts */
export const MESSAGING_CONVERSATIONS_DEFAULT = 250;
export const MESSAGING_CONVERSATIONS_HARD_MAX = 500;

/** GET /api/favorites — ordered by createdAt desc */
export const FAVORITES_LIST_MAX = 500;

/** Admin/moderator report listings */
export const ADMIN_REPORTS_MAX = 100;

/** Upload route (app/api/uploads/route.ts) */
export const UPLOAD_MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const UPLOAD_MAX_VIDEO_BYTES = 50 * 1024 * 1024;

/** Listing form validation (lib/security/validation-schemas.ts) */
export const LISTING_MAX_PHOTOS = 20;

/**
 * POST /api/uploads — per authenticated user per hour.
 * Must exceed LISTING_MAX_PHOTOS × typical sessions (create + edit + retries).
 */
export const UPLOAD_RATE_LIMIT_AUTH_PER_HOUR = 100;

/** POST /api/uploads — per IP when no user token (fallback). */
export const UPLOAD_RATE_LIMIT_IP_PER_HOUR = 80;

/** JSON body guard for large API payloads (middleware / manual checks) */
export const MAX_JSON_BODY_BYTES = 2 * 1024 * 1024;

/** External dependency calls (Stripe, S3, etc.) */
export const EXTERNAL_FETCH_TIMEOUT_MS = 15_000;

/** Health warnings (process heap, MB) */
export const HEALTH_HEAP_WARN_MB = 420;
export const HEALTH_RSS_WARN_MB = 700;

/** Disk free warning threshold (bytes) on root or uploads volume */
export const HEALTH_DISK_FREE_WARN_BYTES = 2 * 1024 * 1024 * 1024;

/** Uploads directory total size warning (bytes) */
export const HEALTH_UPLOADS_DIR_WARN_BYTES = 8 * 1024 * 1024 * 1024;

/**
 * Database Optimization Recommendations
 * 
 * This file documents recommended indexes and optimization strategies
 * Execute these in a database migration
 */

export const DATABASE_INDEXES = `
-- Listing queries optimization
CREATE INDEX idx_listings_status_created ON listings(status, createdAt DESC);
CREATE INDEX idx_listings_user_id ON listings(userId, createdAt DESC);
CREATE INDEX idx_listings_category ON listings(category, status);
CREATE INDEX idx_listings_search ON listings USING gin(to_tsvector('english', title || ' ' || description));

-- User queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_verification_level ON users(verificationLevel);
CREATE INDEX idx_users_banned_until ON users(bannedUntil);

-- Message queries
CREATE INDEX idx_messages_sender_receiver ON messages(senderId, receiverId, createdAt DESC);
CREATE INDEX idx_messages_conversation ON messages(conversationId, createdAt DESC);
CREATE INDEX idx_messages_read ON messages(isRead, recipientId);

-- Transaction queries
CREATE INDEX idx_transactions_user_id ON transactions(userId, createdAt DESC);
CREATE INDEX idx_transactions_status ON transactions(status, createdAt DESC);
CREATE INDEX idx_transactions_stripe_id ON transactions(stripeTransactionId);

-- Moderation queries
CREATE INDEX idx_moderation_status ON moderation(status, createdAt DESC);
CREATE INDEX idx_moderation_moderator ON moderation(moderatorId, createdAt DESC);

-- Report queries
CREATE INDEX idx_reports_status ON reports(status, createdAt DESC);
CREATE INDEX idx_reports_reported_user ON reports(reportedUserId);

-- Composite indexes for common filters
CREATE INDEX idx_listings_category_price ON listings(category, price) WHERE status = 'PUBLISHED';
CREATE INDEX idx_listings_location_type ON listings(location, type) WHERE status = 'PUBLISHED';

-- Text search index (for search features)
CREATE INDEX idx_listings_full_text ON listings USING GIN (
  to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, ''))
);

-- Partial indexes for common queries
CREATE INDEX idx_messages_unread ON messages(recipientId) WHERE isRead = false;
CREATE INDEX idx_reports_pending ON reports(createdAt DESC) WHERE status = 'PENDING';
CREATE INDEX idx_moderation_pending ON moderation(createdAt DESC) WHERE status = 'PENDING';
`;

/**
 * N+1 Query Analysis
 * 
 * Common N+1 patterns to avoid:
 */
export const N_PLUS_1_PATTERNS = {
  // ❌ WRONG - fetches all listings, then makes N queries for user
  WRONG_LISTINGS: `
    const listings = await prisma.listing.findMany();
    const withUsers = listings.map(l => ({
      ...l,
      user: await prisma.user.findUnique({ where: { id: l.userId } })
    }));
  `,

  // ✅ RIGHT - single query with eager loading
  RIGHT_LISTINGS: `
    const listings = await prisma.listing.findMany({
      include: { user: true }
    });
  `,

  // ✅ Alternative - separate query with proper batching
  RIGHT_LISTINGS_BATCH: `
    const listings = await prisma.listing.findMany();
    const userIds = [...new Set(listings.map(l => l.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } }
    });
    const userMap = new Map(users.map(u => [u.id, u]));
    const withUsers = listings.map(l => ({ ...l, user: userMap.get(l.userId) }));
  `,
};

/**
 * Keyset Pagination (faster than offset)
 * 
 * Use for scrolling through large datasets
 */
export const KEYSET_PAGINATION_EXAMPLE = `
// First page
const listings = await prisma.listing.findMany({
  take: 20,
  orderBy: { createdAt: 'desc' },
});

// Next page - use last item's cursor
const lastItem = listings[listings.length - 1];
const nextPage = await prisma.listing.findMany({
  skip: 1, // Skip the cursor item itself
  take: 20,
  cursor: { id: lastItem.id },
  orderBy: { createdAt: 'desc' },
});

// Even better - use composite key
const nextPage = await prisma.listing.findMany({
  take: 20,
  skip: 1,
  cursor: {
    createdAt_id: {
      createdAt: lastItem.createdAt,
      id: lastItem.id,
    }
  },
  orderBy: [
    { createdAt: 'desc' },
    { id: 'desc' }
  ],
});
`;

/**
 * Query Performance Queries
 * Run these on production to identify slow queries
 */
export const PERFORMANCE_MONITORING_QUERIES = `
-- Find slow queries (PostgreSQL)
SELECT
  mean_exec_time,
  calls,
  query
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Find missing indexes
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname NOT IN ('pg_catalog', 'information_schema');

-- Table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
`;

/**
 * Pagination Limit
 * Always use reasonable limits
 */
export const PAGINATION_LIMITS = {
  MIN: 1,
  DEFAULT: 20,
  MAX: 100,
  MAX_SEARCH: 50,
};

/**
 * Query timeout (in ms) - add to API routes
 */
export const QUERY_TIMEOUT = 30000; // 30 seconds

/**
 * Connection pool settings for Prisma
 * Add to .env:
 * 
 * DATABASE_URL="postgresql://user:password@host/db?connection_limit=20&pool_timeout=30"
 */
export const PRISMA_CONNECTION_CONFIG = {
  connection_limit: 20,
  pool_timeout: 30,
  idle_in_transaction_session_timeout: 30000,
};

/**
 * Example optimization: Batch operations
 */
export async function optimizedBatchUpdate(
  userIds: string[],
  updateData: Record<string, unknown>
) {
  // Split into batches of 100
  const BATCH_SIZE = 100;
  const batches = [];

  for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
    const batch = userIds.slice(i, i + BATCH_SIZE);
    void batch;
    batches.push(
      // Using native query for better performance
      `UPDATE users SET ${Object.keys(updateData)
        .map((k, i) => `${k} = $${i + 1}`)
        .join(', ')}
       WHERE id = ANY($${Object.keys(updateData).length + 1}::uuid[])`
    );
  }

  // Execute all batches in parallel
  return Promise.all(batches);
}

/**
 * Example: Smart caching with TTL
 */
export const CACHE_TTL = {
  LISTING: 300, // 5 minutes
  USER_PROFILE: 600, // 10 minutes
  SEARCH_RESULTS: 60, // 1 minute
  USER_STATS: 3600, // 1 hour
};

-- Database Optimization for 2M+ Users
-- Advanced indexes for high-traffic queries

-- ==================== LISTINGS TABLE OPTIMIZATION ====================

-- Composite index for featured/promoted listings (most common query)
CREATE INDEX IF NOT EXISTS idx_listings_featured_promoted_status 
ON listings(is_featured DESC, is_promoted DESC, status, created_at DESC)
WHERE status = 'active';

-- Composite index for category + location search
CREATE INDEX IF NOT EXISTS idx_listings_category_location 
ON listings(category, county, city, status, created_at DESC)
WHERE status = 'active';

-- Composite index for price range queries
CREATE INDEX IF NOT EXISTS idx_listings_price_range 
ON listings(category, price_amount, status, created_at DESC)
WHERE status = 'active';

-- Composite index for auto search (make + model + year)
CREATE INDEX IF NOT EXISTS idx_listings_auto_search 
ON listings(make, model, year, status, created_at DESC)
WHERE status = 'active' AND category = 'auto';

-- Composite index for user dashboard (user's listings)
CREATE INDEX IF NOT EXISTS idx_listings_user_dashboard 
ON listings(owner_user_id, status, created_at DESC);

-- GIN index for full-text search on title + description
CREATE INDEX IF NOT EXISTS idx_listings_fulltext 
ON listings USING gin(to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '')));

-- Index for moderation queue
CREATE INDEX IF NOT EXISTS idx_listings_moderation 
ON listings(moderation_status, created_at DESC)
WHERE moderation_status = 'pending';

-- Index for scam detection
CREATE INDEX IF NOT EXISTS idx_listings_scam 
ON listings(scam_score DESC, is_scam_suspected, status)
WHERE is_scam_suspected = true;

-- Partial index for promoted listings expiry
CREATE INDEX IF NOT EXISTS idx_listings_promotion_expiry 
ON listings(promotion_expires_at)
WHERE is_promoted = true AND promotion_expires_at IS NOT NULL;

-- Index for duplicate detection
CREATE INDEX IF NOT EXISTS idx_listings_duplicate 
ON listings(is_duplicate, duplicate_of_id)
WHERE is_duplicate = true;


-- ==================== USERS TABLE OPTIMIZATION ====================

-- Composite index for user authentication
CREATE INDEX IF NOT EXISTS idx_users_auth 
ON users(email, role, is_banned, email_verified);

-- Index for trust score queries
CREATE INDEX IF NOT EXISTS idx_users_trust_score 
ON users(trust_score DESC, role, is_banned)
WHERE is_banned = false;

-- Index for business accounts
CREATE INDEX IF NOT EXISTS idx_users_business 
ON users(account_type, verification_level, business_name)
WHERE account_type = 'business';

-- Index for subscription tier queries
CREATE INDEX IF NOT EXISTS idx_users_subscription 
ON users(subscription_tier, role)
WHERE role IN ('dealer', 'user');


-- ==================== REPORTS TABLE OPTIMIZATION ====================

-- Composite index for report management
CREATE INDEX IF NOT EXISTS idx_reports_management 
ON reports(status, created_at DESC);

-- Index for user reports history
CREATE INDEX IF NOT EXISTS idx_reports_reporter 
ON reports(reporter_id, created_at DESC);

-- Index for listing reports
CREATE INDEX IF NOT EXISTS idx_reports_listing 
ON reports(listing_id, status, created_at DESC);


-- ==================== SESSIONS TABLE OPTIMIZATION ====================

-- Index for session lookup
CREATE INDEX IF NOT EXISTS idx_sessions_token 
ON sessions(access_token) 
WHERE revoked = false;

-- Index for session cleanup (expired sessions)
CREATE INDEX IF NOT EXISTS idx_sessions_cleanup 
ON sessions(expires_at)
WHERE revoked = false AND expires_at < NOW();


-- ==================== AUDIT LOGS TABLE OPTIMIZATION ====================

-- Composite index for audit queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action 
ON audit_logs(user_id, action, created_at DESC);

-- Index for security audits
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip 
ON audit_logs(ip, action, created_at DESC);


-- ==================== NOTIFICATIONS TABLE OPTIMIZATION ====================

-- Index for user notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON notifications(user_id, read, created_at DESC)
WHERE read = false;


-- ==================== PARTIAL INDEX STATS ====================

-- View to monitor index usage
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;


-- ==================== QUERY PERFORMANCE ====================

-- Update table statistics for better query planning
ANALYZE listings;
ANALYZE users;
ANALYZE reports;
ANALYZE sessions;
ANALYZE audit_logs;

-- Vacuum to reclaim space
VACUUM ANALYZE listings;
VACUUM ANALYZE users;

-- Production Database Indexes and Optimizations
-- Run with: psql -U autoplat -d autoplat -f prisma/migrations/YYYYMMDDHHMMSS_production_indexes/migration.sql
-- Or via Prisma: npx prisma migrate deploy

-- ====================
-- 1. SEARCH PERFORMANCE
-- ====================

-- Full-text search index (GIN index for tsvector)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_search_vector 
ON listings USING GIN (search_vector);

-- ====================
-- 2. COMMON FILTERS
-- ====================

-- Status + created date (for homepage, latest listings)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_status_created 
ON listings (status, "createdAt" DESC) 
WHERE status IN ('active', 'promoted');

-- Category + status (for category pages)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_category_status 
ON listings (category, status, "createdAt" DESC) 
WHERE status = 'active';

-- Owner + status (for user dashboard)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_owner_status 
ON listings ("ownerUserId", status, "createdAt" DESC);

-- Location filters (county + city)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_location 
ON listings (county, city, status) 
WHERE status = 'active';

-- ====================
-- 3. AUTO-SPECIFIC FILTERS
-- ====================

-- Make + model (for auto category)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_auto_make_model 
ON listings (make, model, status) 
WHERE category = 'Auto';

-- Price range queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_price 
ON listings ("priceAmount", status) 
WHERE status = 'active' AND "priceAmount" IS NOT NULL;

-- ====================
-- 4. USER LOOKUPS
-- ====================

-- Email lookup (case-insensitive)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_lower 
ON users (LOWER(email));

-- Phone lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_phone 
ON users (phone) 
WHERE phone IS NOT NULL;

-- Role-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role 
ON users (role, "createdAt" DESC);

-- ====================
-- 5. AUTHENTICATION
-- ====================

-- Session lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_token 
ON sessions (token) 
WHERE "expiresAt" > NOW();

-- Refresh token lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_refresh_tokens_token 
ON refresh_tokens (token) 
WHERE "expiresAt" > NOW();

-- ====================
-- 6. MODERATION
-- ====================

-- Pending moderation queue
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_moderation 
ON listings (status, "createdAt") 
WHERE status = 'pending';

-- ====================
-- 7. ANALYTICS
-- ====================

-- Created date for time-series queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_created 
ON listings ("createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created 
ON users ("createdAt" DESC);

-- ====================
-- 8. CLEANUP QUERIES
-- ====================

-- Expired listings cleanup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_expires 
ON listings ("expiresAt") 
WHERE "expiresAt" IS NOT NULL;

-- Old sessions cleanup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_expires 
ON sessions ("expiresAt");

-- ====================
-- QUERY TIMEOUTS
-- ====================

-- Set statement timeout (prevent runaway queries)
ALTER DATABASE autoplat SET statement_timeout = '30s';

-- Set idle in transaction timeout (prevent blocking)
ALTER DATABASE autoplat SET idle_in_transaction_session_timeout = '60s';

-- ====================
-- CONNECTION POOLING
-- ====================

-- Adjust max connections if needed (default: 100)
-- ALTER SYSTEM SET max_connections = 200;
-- SELECT pg_reload_conf();

-- ====================
-- VACUUM SETTINGS
-- ====================

-- Enable autovacuum for better performance
ALTER TABLE listings SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE users SET (autovacuum_vacuum_scale_factor = 0.05);

-- ====================
-- VERIFICATION
-- ====================

-- Check index creation progress
-- SELECT * FROM pg_stat_progress_create_index;

-- Check index usage
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- ORDER BY idx_scan DESC;

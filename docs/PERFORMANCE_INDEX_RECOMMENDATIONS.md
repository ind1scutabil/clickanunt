# Performance index recommendations (review only — not applied)

From `prisma/schema.prisma` audit (Phase 3E). Run `EXPLAIN ANALYZE` on staging before any migration.

## Listing feed / search

Existing: `[status, feedBoost, createdAt, id]`, `[status, createdAt]`, FTS `search_vector` (verify GIN in DB).

Optional (if slow filters):

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS listings_county_status_active_idx
  ON listings (county, status, "createdAt" DESC)
  WHERE "deletedAt" IS NULL AND status = 'active';
```

## Messaging

Existing: `[lastMessageAt]`, `[participant1Id]`, `[participant2Id]`.

Conversations query uses `ORDER BY lastMessageAt DESC` + participant OR — composite may help at scale:

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS conversations_p1_lastmsg_idx
  ON conversations ("participant1Id", "lastMessageAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS conversations_p2_lastmsg_idx
  ON conversations ("participant2Id", "lastMessageAt" DESC);
```

## Payments

Existing: `stripePaymentIntentId` index.

---

Do not apply on production without staging validation.

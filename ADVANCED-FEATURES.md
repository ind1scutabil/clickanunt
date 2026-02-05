# 🚀 Advanced Features Documentation

## 🎛️ Feature Flags

### Overview
Feature flags allow runtime control of features without code deployment.

### Usage

**Server-side check:**
```typescript
import { isFeatureEnabled, FeatureFlags } from '@/lib/featureFlags';

if (await isFeatureEnabled(FeatureFlags.AUTO_MODERATION)) {
  // Run auto moderation
}
```

**Multiple flags:**
```typescript
const features = await areFeaturesEnabled([
  FeatureFlags.STRIPE_PAYMENTS,
  FeatureFlags.BULK_ACTIONS
]);
```

### Admin API

**List all flags:**
```bash
GET /api/admin/feature-flags
Authorization: Bearer <owner_token>
```

**Set flag:**
```bash
POST /api/admin/feature-flags
{
  "key": "auto_moderation",
  "enabled": true,
  "description": "OpenAI automatic moderation"
}
```

**Clear cache:**
```bash
DELETE /api/admin/feature-flags?key=auto_moderation
```

### Available Flags

| Key | Description |
|-----|-------------|
| `auto_moderation` | OpenAI automatic content moderation |
| `manual_review_required` | Force manual review for all listings |
| `strict_moderation` | Stricter moderation thresholds |
| `advanced_search` | Advanced search features |
| `stripe_payments` | Enable Stripe payment processing |
| `bulk_actions` | Enable bulk operations in admin |
| `audit_log_export` | Allow CSV export of audit logs |

---

## 🏥 Health Checks

### Endpoints

**Full health check:**
```bash
GET /api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-02-04T12:00:00Z",
  "uptime": 3600,
  "checks": {
    "database": {
      "status": "up",
      "latency": 5
    },
    "storage": {
      "status": "up",
      "details": {
        "endpoint": "https://...",
        "bucket": "auto-platform"
      }
    }
  }
}
```

**Liveness probe (K8s):**
```bash
GET /api/health?type=live
```

**Readiness probe (K8s):**
```bash
GET /api/health?type=ready
```

### Load Balancer Configuration

**Nginx:**
```nginx
location /health {
  proxy_pass http://app:3000/api/health?type=live;
  access_log off;
}
```

**Docker Compose:**
```yaml
services:
  app:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health?type=live"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

## 🎯 Dynamic Trust Score

### Overview
Trust score (0-100) influences automatic moderation decisions.

### Calculation Factors

| Factor | Weight | Notes |
|--------|--------|-------|
| Listings approved | +2 | Per approved listing |
| Listings rejected | -5 | Per rejected listing |
| Reports received | -3 | Per resolved report against user |
| Account age | +0.1 | Per day |
| 2FA enabled | +10 | One-time bonus |
| Ban history | -20 | Per ban |

### Thresholds

| Score | Behavior |
|-------|----------|
| ≥80 | Auto-approve listings |
| 60-79 | Normal flow (OpenAI check) |
| 30-59 | Manual review required |
| <30 | Restricted actions |

### API Usage

**Calculate score:**
```typescript
import { calculateTrustScore, updateTrustScore } from '@/lib/trustScore';

const score = await calculateTrustScore(userId);
await updateTrustScore(userId, actorToken);
```

**Check capabilities:**
```typescript
import { canAutoApprove, requiresManualReview, isRestricted } from '@/lib/trustScore';

if (await canAutoApprove(userId)) {
  // Skip moderation queue
}
```

**Batch recalculation (cron job):**
```bash
# Run nightly
0 2 * * * cd /app && node -e "require('./lib/trustScore').batchUpdateTrustScores(1000)"
```

---

## 📊 Observability

### Structured Logging

**Usage:**
```typescript
import { logger } from '@/lib/observability';

logger.setContext({ userId: '123', requestId: 'abc' });
logger.info('User logged in');
logger.error('Payment failed', error);
```

**Output (production):**
```json
{
  "timestamp": "2026-02-04T12:00:00Z",
  "level": "info",
  "message": "User logged in",
  "requestId": "abc",
  "userId": "123"
}
```

### Request Tracking

**Automatic:**
```typescript
import { withRequestTracking } from '@/lib/observability';

export async function handler(req: Request) {
  return withRequestTracking(async (requestId) => {
    // requestId is automatically logged
    // ...
  });
}
```

### Performance Monitoring

```typescript
import { PerformanceTracker } from '@/lib/observability';

const tracker = new PerformanceTracker('database_query');
await prisma.user.findMany();
tracker.end(); // Logs duration
```

### Error Tracking

```typescript
import { captureException } from '@/lib/observability';

try {
  // risky operation
} catch (error) {
  captureException(error, { userId, action: 'payment' });
}
```

---

## 💾 Disaster Recovery

### Backup

**Manual backup:**
```bash
./scripts/backup-db.sh custom_backup_name
```

**Automated (cron):**
```bash
# Daily at 2 AM
0 2 * * * cd /app && ./scripts/backup-db.sh >> /var/log/backup.log 2>&1
```

**Backup location:** `./backups/backup_YYYYMMDD_HHMMSS.sql.gz`

**Retention:** Last 30 backups (auto-cleanup)

### Restore

**Full restore:**
```bash
./scripts/restore-db.sh backups/backup_20260204_120000.sql.gz
```

**Steps:**
1. Stop application: `pm2 stop all`
2. Run restore script (prompts for confirmation)
3. Run migrations: `npx prisma migrate deploy`
4. Restart: `pm2 start all`

### Monthly Checklist

- [ ] Test backup: `./scripts/backup-db.sh test_backup`
- [ ] Verify backup size: `du -h backups/`
- [ ] Test restore in staging environment
- [ ] Check disk space: `df -h`
- [ ] Rotate old backups: auto (30 days)
- [ ] Document any issues

---

## 🔍 Bulk Actions

### API Endpoint

**POST /api/admin/bulk-actions**

Requires: OWNER/ADMIN role + `bulk_actions` feature flag enabled

### Supported Actions

**Ban multiple users:**
```bash
POST /api/admin/bulk-actions
{
  "action": "ban_users",
  "entityType": "user",
  "entityIds": ["user1", "user2", "user3"],
  "data": {
    "reason": "Spam accounts"
  }
}
```

**Approve multiple listings:**
```bash
POST /api/admin/bulk-actions
{
  "action": "approve_listings",
  "entityType": "listing",
  "entityIds": ["listing1", "listing2"]
}
```

**Reject multiple listings:**
```bash
POST /api/admin/bulk-actions
{
  "action": "reject_listings",
  "entityType": "listing",
  "entityIds": ["listing1", "listing2"],
  "data": {
    "reason": "Duplicate content"
  }
}
```

**Delete multiple listings:**
```bash
POST /api/admin/bulk-actions
{
  "action": "delete_listings",
  "entityType": "listing",
  "entityIds": ["listing1", "listing2"]
}
```

### Limits

- Maximum 100 items per request
- Requires `bulk_actions` feature flag
- All operations are audit logged
- Atomic per item (partial success possible)

---

## 🔍 SEO Features

### Dynamic Sitemap

**URL:** `https://yourdomain.com/sitemap.xml`

**Features:**
- Auto-generated from active listings
- Updates hourly (cache)
- Max 50,000 URLs
- Includes static pages + listings

**Submit to search engines:**
```bash
# Google Search Console
curl "https://www.google.com/ping?sitemap=https://yourdomain.com/sitemap.xml"

# Bing Webmaster Tools
curl "https://www.bing.com/ping?sitemap=https://yourdomain.com/sitemap.xml"
```

### Metadata (TODO)

Per-listing metadata:
```typescript
// app/listings/[id]/page.tsx
export async function generateMetadata({ params }) {
  const listing = await getListing(params.id);
  
  return {
    title: `${listing.title} - Auto Platform`,
    description: listing.description,
    openGraph: {
      images: listing.photos[0],
    },
  };
}
```

---

## 🔄 CI/CD (Future)

### GitHub Actions Template

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test
      - run: npx prisma migrate deploy --preview-feature

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: |
          ssh user@server 'cd /app && git pull && npm install && npm run build && pm2 restart all'
```

### Environments

- **Development:** Local with hot reload
- **Staging:** Pre-production testing
- **Production:** Live environment

---

## 📝 Notes

- Feature flags cache for 5 minutes
- Health checks run on every request (cached)
- Trust scores update on user actions
- Backups auto-cleanup after 30 days
- Bulk actions limited to 100 items
- All admin actions are audit logged

**Support:** See main README.md for troubleshooting

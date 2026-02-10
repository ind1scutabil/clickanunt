# 🚀 Quick Start Guide - Trust & Anti-Scam System

## For Developers

### 1. Check User Trust Score

```typescript
import { getRateLimit, canPerformAction } from "@/lib/trustScore";

const user = await prisma.user.findUnique({ 
  where: { id: userId },
  select: { trustScore: true }
});

// Check permissions
if (!canPerformAction(user.trustScore, "publish")) {
  return res.status(403).json({ error: "Trust score too low" });
}

// Get rate limits
const limits = getRateLimit(user.trustScore);
console.log(`User can publish ${limits.listingsPerDay} listings/day`);
```

### 2. Detect Scam in Listing

```typescript
import { detectScam } from "@/lib/scamDetection";

const scamResult = detectScam({
  title: listing.title,
  description: listing.description,
  priceAmount: listing.priceAmount,
  category: listing.category,
  photos: listing.photos
});

if (scamResult.isScam && scamResult.confidence >= 0.8) {
  // Auto-reject
  return res.status(400).json({
    error: "Listing rejected - potential scam detected",
    flags: scamResult.flags.map(f => f.description)
  });
}
```

### 3. Update Trust Score

```typescript
import { updateUserTrustScore, awardTrustPoints } from "@/lib/trustScore";

// Automatic recalculation
await updateUserTrustScore(userId, "listing_created_successfully");

// Manual adjustment
await awardTrustPoints(userId, 10, "Phone verification completed");
await deductTrustPoints(userId, 15, "Valid scam report received");
```

### 4. Display Trust Badge

```tsx
import TrustBadge from "@/app/components/TrustBadge";

<TrustBadge 
  trustScore={user.trustScore} 
  showScore={true}
  size="md"
/>
```

### 5. Add Report Button

```tsx
import ReportButton from "@/app/components/ReportButton";

<ReportButton
  reporterId={currentUser.id}
  reportedListingId={listing.id}
/>
```

## For Admins

### View Pending Reports

```bash
GET /api/reports?status=pending&limit=50
```

### Resolve Report

```bash
POST /api/reports/:id/resolve
{
  "action": "approve",  // or "dismiss"
  "moderatorId": "admin-uuid",
  "notes": "Confirmed scam - user banned"
}
```

### Monitor Trust Score Distribution

```sql
SELECT 
  CASE 
    WHEN "trustScore" >= 90 THEN 'VERIFIED'
    WHEN "trustScore" >= 70 THEN 'TRUSTED'
    WHEN "trustScore" >= 50 THEN 'NEUTRAL'
    WHEN "trustScore" >= 30 THEN 'SUSPICIOUS'
    ELSE 'BANNED'
  END as level,
  COUNT(*) as count,
  ROUND(AVG("trustScore"), 2) as avg_score
FROM users
GROUP BY level
ORDER BY avg_score DESC;
```

### Check Scam Detection Rate

```sql
SELECT 
  COUNT(*) FILTER (WHERE "scamScore" >= 50) as scam_detected,
  COUNT(*) FILTER (WHERE "scamScore" < 50) as clean,
  ROUND(AVG("scamScore"), 2) as avg_scam_score,
  ROUND(100.0 * COUNT(*) FILTER (WHERE "scamScore" >= 50) / COUNT(*), 2) as scam_percentage
FROM listings
WHERE "createdAt" > NOW() - INTERVAL '7 days';
```

## Configuration

### Trust Levels (lib/trustScore.ts)

```typescript
export const TRUST_LEVELS = {
  VERIFIED: 90,      // Instant publish, 50 listings/day
  TRUSTED: 70,       // Fast moderation, 20 listings/day
  NEUTRAL: 50,       // Normal moderation, 10 listings/day
  SUSPICIOUS: 30,    // Strict moderation, 3 listings/day
  BANNED: 0          // No actions allowed
};
```

### Scam Thresholds (lib/scamDetection.ts)

```typescript
// Severity weights
low: 5 points
medium: 15 points
high: 30 points
critical: 50 points

// Auto-reject threshold
score >= 50 → Automatic rejection
```

## Testing

### Run System Test

```bash
npx tsx scripts/test-trust-system.ts
```

### Test Rate Limiting

```bash
# Create multiple listings as a user with trust score 50 (limit: 10/day)
# 11th listing should return 429 Too Many Requests
```

### Test Scam Detection

```bash
# Create listing with:
# Title: "URGENT! BMW X5 doar 100 RON"
# Description: "Western Union only, must sell today!"
# Should be auto-rejected with scam confidence > 0.8
```

## Common Issues

### Issue: Trust score not updating
**Solution:** Run `updateUserTrustScore(userId, reason)` manually

### Issue: Rate limit not working
**Solution:** Check if listings count is being queried for current day (00:00 - 23:59)

### Issue: Scam detection too strict
**Solution:** Adjust severity weights in `scamDetection.ts` or increase auto-reject threshold

### Issue: Prisma client errors
**Solution:** Run `npx prisma generate` after schema changes

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/listings | Create listing (with trust & scam checks) |
| GET | /api/reports | Get all reports (admin) |
| POST | /api/reports | Create new report |
| POST | /api/reports/:id/resolve | Resolve report (admin) |

## Trust Score Factors

| Factor | Points | Notes |
|--------|--------|-------|
| Email verified | Mandatory | -30 if not verified |
| Phone verified | +15 | One-time bonus |
| Account age 1y+ | +10 | Scaled by age |
| Completed listings | +2 each | Max +15 |
| Successful transactions | +3 each | Max +15 |
| Positive reviews | +10 | Based on ratio |
| Received reports | -5 each | No limit |
| Suspicious activity | -10 each | No limit |
| Failed logins | -8 each | No limit |
| Negative reviews | -3 each | No limit |

## Scam Detection Patterns

### High Severity (30 points)
- Western Union, MoneyGram
- Bitcoin/crypto only
- Must sell today, urgent sale
- Price < 20% of market value

### Medium Severity (15 points)
- Gift card, wire transfer
- Limited time, act fast
- External URLs, WhatsApp only
- No photos provided

### Low Severity (5 points)
- Phone number in description
- Email in description
- 50% off, 90% off

## Support

For issues or questions:
- See [TRUST-SYSTEM.md](./TRUST-SYSTEM.md) for full documentation
- Check [TRUST-IMPLEMENTATION-SUMMARY.md](./TRUST-IMPLEMENTATION-SUMMARY.md) for implementation details
- Run test suite: `npx tsx scripts/test-trust-system.ts`

---

**Last Updated:** 2025-02-05  
**Version:** 1.0.0  
**Status:** ✅ Production Ready

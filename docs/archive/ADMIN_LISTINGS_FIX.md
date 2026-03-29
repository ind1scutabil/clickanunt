# ADMIN MODERATION FIX - USER LISTINGS VISIBILITY

## Problem
Admins could not see or moderate a user's **active listings** from the moderation dashboard. They could only see listings in the moderation queue (pending, approved, rejected).

**Issue**: When an admin clicked on a user in the moderation section, the expanded view showed only listings from the moderation queue, but not the user's actual active listings.

---

## Root Cause
The `fetchUserListings()` function was filtering listings **only** from the three moderation arrays:
- `pendingListings`
- `approvedListings`  
- `rejectedListings`

These arrays only contain listings that are **in the moderation queue**, not all the user's listings (active, archived, etc.).

---

## Solution

### 1. **New API Endpoint** - `/api/admin/users/[id]/listings`

Created a new route that fetches **ALL listings for a user** including:
- ✅ Active listings (directly from database)
- ✅ Listings pending moderation (from moderation queue)
- ✅ Approved listings (from moderation queue)
- ✅ Rejected listings (from moderation queue)

**Endpoint Details:**
```typescript
GET /api/admin/users/{userId}/listings
```

**Response:**
```json
{
  "success": true,
  "listings": [
    {
      "id": "listing_uuid",
      "title": "Used Toyota 2020",
      "category": "auto",
      "price": 150000,
      "status": "active",
      "queueId": null,           // null = not in queue
      "queueStatus": null,       // null = not pending review
      "moderator": null
    },
    {
      "id": "pending_listing_uuid",
      "title": "Used BMW",
      "category": "auto",  
      "price": 200000,
      "status": "pending",
      "queueId": "queue_uuid",   // has queue ID = in moderation
      "queueStatus": "pending",  // queue status
      "moderator": null
    }
  ],
  "count": 2
}
```

### 2. **Updated Admin Page Logic**

Modified `app/admin/moderation/page.tsx`:

**Old flow:**
```typescript
const fetchUserListings = (userId: number) => {
  // Only search in pendingListings, approvedListings, rejectedListings
  const userListings = allListings.filter(listing => 
    listing.owner === targetUser.email
  );
}
```

**New flow:**
```typescript
const fetchUserListings = async (userId: string) => {
  // Call new API endpoint
  const response = await fetch(`/api/admin/users/${userId}/listings`);
  // Get ALL listings for the user
  setUserListings(data.listings);
}
```

### 3. **Updated Moderation Actions**

Added logic to show moderation buttons **only** for listings in the queue:

**Before:**
```tsx
{listing.status !== 'approved' && (
  <button onClick={() => approveListing(listing.id)}>✓ Aprobă</button>
)}
```

**After:**
```tsx
{listing.queueId && (
  <>
    {listing.status !== 'approved' && (
      <button onClick={() => approveListing(listing.id)}>✓ Aprobă</button>
    )}
    {listing.status !== 'rejected' && (
      <button onClick={() => rejectListing(listing.id)}>✗ Respinge</button>
    )}
  </>
)}
{!listing.queueId && listing.status === 'active' && (
  <span>✅ Activ</span>
)}
```

---

## Files Changed

1. **`/app/api/admin/users/[id]/listings/route.ts`** ✨ NEW
   - Fetches all user listings (active + queued)
   - Combines data from Listing and ModerationQueue tables
   - Returns deduplicated results

2. **`/app/admin/moderation/page.tsx`** 🔧 MODIFIED
   - Updated `fetchUserListings()` to call new API endpoint
   - Changed user ID type from `number` to `string` (matches database)
   - Updated moderation buttons to only show for queued listings
   - Shows "✅ Activ" status badge for active listings

---

## How It Works Now

### Admin Workflow:
1. Admin opens moderation dashboard
2. Clicks on a user in the "Users" tab
3. Admin section expands and fetches the new endpoint
4. **All user listings appear** including:
   - Active sales
   - Pending review listings
   - Previously approved/rejected
5. Admin can moderate queued listings directly from user view

### Moderation Features:
- ✅ See ALL user listings (not just queued ones)
- ✅ Approve/Reject buttons only on pending items
- ✅ Visual indicator for active listings ("✅ Activ")
- ✅ Moderator attribution for queued items
- ✅ Delete any listing (for spam/violation cleanup)

---

## Security

- ✅ Requires admin/moderator role (`MODERATION_VIEW_QUEUE` permission)
- ✅ Validates authentication on every request
- ✅ CSRF protection included
- ✅ No sensitive user data leakage

---

## Schema Updates

No database schema changes required. Uses existing:
- `Listing` table (listings with status: active, pending, rejected, etc.)
- `ModerationQueue` table (listings pending human review)

---

## Testing

To test the fix:

1. **Admin logs in** and goes to `/admin/moderation`
2. **Scroll to "Users" section** and click on a user
3. **User expands** and shows all their listings (not just queue)
4. **Active listings show** "✅ Activ" status
5. **Pending listings show** "✓ Aprobă" and "✗ Respinge" buttons
6. **Admin can moderate** queued listings from this view

---

## Performance

- Single API call fetches all listings
- Combines results from 2 database queries (executed in parallel)
- Deduplicates results (prefers queue version if listing in both)
- Indexed queries on `ownerUserId` and `status` for fast filtering


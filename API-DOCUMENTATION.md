# 📡 API Documentation - Auto Platform

## Base URL
- **Development:** `http://localhost:3000/api`
- **Production:** `https://clickanunt.ro/api`

---

## Authentication

Most endpoints require authentication via header:
```
X-User-Id: user_uuid_here
```

**Note:** NextAuth will be configured later to handle sessions properly.

---

## 🏥 Health & Status

### GET /api/health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-05T22:46:45.543Z",
  "uptime": 15066.94,
  "checks": {
    "database": {
      "status": "up",
      "latency": 12
    },
    "storage": {
      "status": "up"
    }
  }
}
```

---

## 👤 Users

### POST /api/users
Create new user.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe",
  "role": "user"
}
```

### GET /api/users
List users (admin only).

**Query params:**
- `search` - Search by name/email
- `role` - Filter by role
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)

### GET /api/users/:id
Get user by ID.

### PATCH /api/users/:id
Update user.

**Body:**
```json
{
  "name": "New Name",
  "phone": "+40123456789",
  "avatar": "https://..."
}
```

### DELETE /api/users/:id
Delete user (admin only).

### GET /api/users/:id/profile
Get public business profile.

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "businessName": "Auto Dealer SRL",
    "businessDescription": "...",
    "businessLogo": "https://...",
    "trustScore": 85,
    "verificationLevel": "business",
    "accountType": "business"
  },
  "stats": {
    "totalListings": 45,
    "activeListings": 32,
    "soldListings": 13,
    "totalViews": 12350
  },
  "listings": [...]
}
```

---

## 🔐 Authentication

### POST /api/auth/login
Login user.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  },
  "token": "jwt_token_here"
}
```

### POST /api/auth/register
Register new user.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

### POST /api/auth/logout
Logout user.

---

## 📝 Listings

### GET /api/listings
Get all listings.

**Query params:**
- `category` - Filter by category (AUTO, IMOBILIARE, etc.)
- `status` - Filter by status (active, draft, sold, etc.)
- `userId` - Filter by user
- `search` - Search in title/description
- `minPrice`, `maxPrice` - Price range
- `location` - Filter by location
- `sort` - Sort by: date, price, views, title
- `order` - asc or desc
- `page` - Page number (default: 1)
- `limit` - Items per page (10, 25, 50, 100)

**Response:**
```json
{
  "listings": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "totalPages": 15,
    "hasMore": true
  }
}
```

### POST /api/listings
Create new listing.

**Body:**
```json
{
  "title": "BMW X5 2020",
  "description": "Excellent condition...",
  "category": "AUTO",
  "price": 35000,
  "currency": "RON",
  "location": "București",
  "photos": ["url1", "url2"],
  "condition": "used",
  "status": "draft",
  "details": {
    "make": "BMW",
    "model": "X5",
    "year": 2020,
    "mileage": 45000,
    "fuel": "diesel",
    "transmission": "automatic"
  },
  "isDealer": false
}
```

### GET /api/listings/:id
Get listing by ID.

### PATCH /api/listings/:id
Update listing.

### DELETE /api/listings/:id
Delete listing.

### POST /api/listings/draft
Save draft listing (autosave).

**Body:**
```json
{
  "title": "BMW X5",
  "category": "AUTO",
  "price": 35000,
  "...": "partial data"
}
```

### PUT /api/listings/draft
Update existing draft.

---

## ✅ Business Verification

### POST /api/users/me/verify-business
Request business verification.

**Headers:**
```
X-User-Id: user_uuid
```

**Body:**
```json
{
  "businessName": "Auto Dealer SRL",
  "businessCUI": "RO12345678",
  "businessRegCom": "J40/1234/2020",
  "businessDescription": "Vânzări auto...",
  "businessPhone": "+40123456789",
  "businessEmail": "contact@dealer.ro",
  "businessWebsite": "https://dealer.ro",
  "businessLocation": "București, Sector 1"
}
```

**Response:**
```json
{
  "message": "Business verification request submitted",
  "user": {
    "id": "uuid",
    "accountType": "business",
    "verificationLevel": "phone",
    "businessName": "Auto Dealer SRL"
  }
}
```

### GET /api/users/me/verify-business
Get verification request status.

**Response:**
```json
{
  "id": "uuid",
  "type": "business",
  "status": "pending",
  "createdAt": "2026-02-05T10:00:00Z",
  "data": {
    "businessName": "Auto Dealer SRL",
    "businessCUI": "RO12345678"
  }
}
```

---

## 💳 Subscriptions

### POST /api/subscriptions
Upgrade subscription.

**Headers:**
```
X-User-Id: user_uuid
```

**Body:**
```json
{
  "tier": "business"
}
```

**Response:**
```json
{
  "message": "Subscription upgraded successfully",
  "subscription": {
    "tier": "business",
    "expiresAt": "2026-03-05T10:00:00Z",
    "freeBoostsRemaining": 3
  }
}
```

### DELETE /api/subscriptions
Cancel subscription (at end of period).

**Response:**
```json
{
  "message": "Subscription will be canceled at end of period",
  "subscription": {
    "tier": "business",
    "expiresAt": "2026-03-05T10:00:00Z",
    "willRenew": false
  }
}
```

### GET /api/subscriptions
Get subscription status.

**Response:**
```json
{
  "tier": "business",
  "expiresAt": "2026-03-05T10:00:00Z",
  "willRenew": true,
  "renewsAt": "2026-03-05T10:00:00Z",
  "freeBoostsRemaining": 2,
  "plan": {
    "name": "BUSINESS",
    "price": 49.99,
    "features": [...],
    "limits": {
      "maxListings": 50,
      "maxPhotos": 10,
      "moderationPriority": "high"
    }
  }
}
```

---

## 💰 Payments

### POST /api/payments/netopia
Create Netopia payment (Romanian cards).

**Body:**
```json
{
  "userId": "user_uuid",
  "amount": 49.99,
  "currency": "RON",
  "promotionId": "listing_uuid"
}
```

**Response:**
```json
{
  "paymentId": "payment_uuid",
  "redirectUrl": "https://sandboxsecure.mobilpay.ro/pay",
  "data": "encrypted_data",
  "envKey": "encrypted_key"
}
```

**Usage:**
Submit a form with POST to `redirectUrl` with fields `data` and `env_key`.

### GET /api/payments/netopia?payment_id=xxx
Get payment status.

**Response:**
```json
{
  "id": "payment_uuid",
  "status": "succeeded",
  "amount": 49.99,
  "currency": "RON",
  "paidAt": "2026-02-05T10:30:00Z"
}
```

### POST /api/payments/netopia/ipn
Netopia IPN (Instant Payment Notification) - **Webhook only**.

Called by Netopia server to notify payment status.

---

## 🚀 Promotions

### POST /api/promotions
Create promotion for listing.

**Body:**
```json
{
  "listingId": "listing_uuid",
  "type": "boost_24h",
  "paymentMethod": "card"
}
```

**Types:**
- `boost_24h` - 19.99 RON
- `boost_72h` - 49.99 RON
- `boost_7days` - 89.99 RON
- `top_category` - 149.99 RON
- `urgent` - 29.99 RON
- `homepage_featured` - 299.99 RON

**Response:**
```json
{
  "promotion": {
    "id": "promo_uuid",
    "listingId": "listing_uuid",
    "type": "boost_24h",
    "price": 19.99,
    "status": "pending"
  },
  "payment": {
    "paymentId": "payment_uuid",
    "redirectUrl": "https://..."
  }
}
```

### GET /api/promotions
List user's promotions.

---

## 📊 Admin

### GET /api/admin/dashboard
Admin dashboard stats (admin only).

**Response:**
```json
{
  "users": {
    "total": 1520,
    "active24h": 245,
    "active7d": 680,
    "active30d": 1150
  },
  "listings": {
    "total": 3420,
    "active": 2150,
    "pending": 85,
    "sold": 1100
  },
  "revenue": {
    "today": 450.50,
    "week": 3200.00,
    "month": 12500.00
  }
}
```

---

## 🔨 Moderation

### GET /api/moderate/queue
Get moderation queue (moderator only).

**Query params:**
- `status` - Filter: pending, approved, rejected
- `category` - Filter by category
- `page`, `limit` - Pagination

### POST /api/moderate/approve
Approve listing.

**Body:**
```json
{
  "listingId": "listing_uuid",
  "note": "Approved - looks good"
}
```

### POST /api/moderate/reject
Reject listing.

**Body:**
```json
{
  "listingId": "listing_uuid",
  "reason": "Fake photos detected",
  "note": "User notified"
}
```

---

## 📢 Reports

### POST /api/reports
Report listing or user.

**Body:**
```json
{
  "reportedEntityType": "listing",
  "reportedEntityId": "listing_uuid",
  "reason": "scam",
  "description": "Fake seller, suspicious pricing"
}
```

**Reasons:**
- `spam`
- `scam`
- `inappropriate`
- `duplicate`
- `fake`
- `other`

### GET /api/reports
List reports (admin/moderator only).

---

## 📷 Images

### POST /api/images/upload
Upload image (requires auth).

**Body:** `multipart/form-data`
- `file` - Image file (max 10MB)
- `type` - `listing` or `avatar` or `business_logo`

**Response:**
```json
{
  "url": "https://cdn.clickanunt.ro/images/uuid.jpg",
  "thumbnail": "https://cdn.clickanunt.ro/images/uuid_thumb.jpg"
}
```

---

## 📧 Contact

### POST /api/contact
Send contact message.

**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "subject": "Întrebare",
  "message": "Mesajul meu..."
}
```

---

## 🔍 Search

### GET /api/search
Advanced search.

**Query params:**
- `q` - Search query
- `category` - Filter category
- `location` - Location
- `minPrice`, `maxPrice` - Price range
- All other listing filters

---

## 📈 Statistics

### GET /api/stats/user/:id
Get user statistics.

**Response:**
```json
{
  "totalListings": 45,
  "activeListings": 32,
  "soldListings": 13,
  "totalViews": 12350,
  "avgPrice": 25000,
  "trustScore": 85
}
```

---

## Rate Limiting

- **API endpoints:** 10 requests/second
- **General:** 30 requests/second
- **Login:** 5 attempts/15 minutes
- **Listing creation:** 10/hour

**Response on rate limit:**
```json
{
  "error": "Too many requests",
  "retryAfter": 60
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid input",
  "details": {
    "price": "Price must be positive"
  }
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "error": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "Something went wrong"
}
```

---

## Webhook Events

### Payment Success
When payment succeeds, listing is automatically promoted.

### Subscription Expired
When subscription expires, user is downgraded to FREE tier.

### Promotion Expired
When promotion expires, listing returns to normal status.

---

## Testing

### Development
```bash
curl http://localhost:3000/api/health
```

### Production
```bash
curl https://clickanunt.ro/api/health
```

---

## SDK Examples

### JavaScript/TypeScript
```typescript
const response = await fetch('https://clickanunt.ro/api/listings', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'X-User-Id': userId,
  },
});

const data = await response.json();
```

### cURL
```bash
curl -X POST https://clickanunt.ro/api/listings \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user_uuid" \
  -d '{"title":"BMW X5","category":"AUTO","price":35000}'
```

---

**API Version:** 1.0.0  
**Last Updated:** 5 February 2026

# 🔑 Environment Variables - Complete Reference

## Required Variables

### Database
```bash
# PostgreSQL connection string
DATABASE_URL="postgresql://username:password@host:5432/database_name"
```

### JWT Authentication
```bash
# Secret key for JWT signing (minimum 32 characters)
# Generate with: openssl rand -base64 32
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
```

### OWNER Account
```bash
# Primary owner account created by init-owner script
OWNER_EMAIL="owner@yourdomain.com"
OWNER_PASSWORD="SecurePassword123!"
```

### OpenAI Moderation
```bash
# OpenAI API key for automatic content moderation
OPENAI_API_KEY="sk-..."
```

### Stripe Payments
```bash
# Stripe secret key (get from https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY="sk_test_..." # Test mode
# STRIPE_SECRET_KEY="sk_live_..." # Production mode

# Stripe webhook secret (get from https://dashboard.stripe.com/webhooks)
STRIPE_WEBHOOK_SECRET="whsec_..."

# Optional: Stripe publishable key (for frontend)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..." # Test mode
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..." # Production mode
```

## Optional Variables

### S3-Compatible Storage (CloudFlare R2, AWS S3, MinIO, etc.)
```bash
S3_ENDPOINT="https://your-endpoint.r2.cloudflarestorage.com"
S3_ACCESS_KEY="your-access-key"
S3_SECRET_KEY="your-secret-key"
S3_BUCKET="auto-platform-uploads"
S3_REGION="auto"
```

### Redis (Recommended for Production)
```bash
# For distributed rate limiting across multiple servers
REDIS_URL="redis://localhost:6379"
# or with auth:
REDIS_URL="redis://:password@localhost:6379"
```

### Next.js (if using NextAuth)
```bash
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="another-random-secret-key"
```

### Email (for notifications - future feature)
```bash
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="noreply@yourdomain.com"
SMTP_PASSWORD="your-smtp-password"
SMTP_FROM="Auto Platform <noreply@yourdomain.com>"
```

### Monitoring & Analytics (optional)
```bash
SENTRY_DSN="https://..."
GOOGLE_ANALYTICS_ID="G-..."
```

## Security Notes

1. **NEVER commit .env files to git**
   - Add `.env*` to `.gitignore`
   - Use `.env.example` as template

2. **JWT_SECRET must be strong**
   - Minimum 32 characters
   - Random alphanumeric + symbols
   - Change it if compromised (will invalidate all tokens)

3. **OWNER_PASSWORD**
   - Use strong password (min 8 chars, letter + number)
   - Change after first login
   - Store securely (password manager)

4. **OpenAI API Key**
   - Keep secret, never expose client-side
   - Monitor usage on OpenAI dashboard
   - Set spending limits

5. **Database URL**
   - Use SSL connection in production: `?sslmode=require`
   - Never expose publicly
   - Firewall rules: allow only app server IPs

## Example .env.local (Development)

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/auto_platform_dev"

# JWT
JWT_SECRET="dev-secret-key-change-in-production-min-32-chars"

# OWNER
OWNER_EMAIL="owner@localhost.dev"
OWNER_PASSWORD="DevPassword123!"

# OpenAI
OPENAI_API_KEY="sk-proj-..."

# S3 (optional - can use local storage in dev)
# S3_ENDPOINT="http://localhost:9000"
# S3_ACCESS_KEY="minioadmin"
# S3_SECRET_KEY="minioadmin"
# S3_BUCKET="auto-platform-dev"

# Next.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="dev-nextauth-secret"
```

## Example .env (Production)

```bash
# Database (with SSL)
DATABASE_URL="postgresql://prod_user:strong_password@db.yourhost.com:5432/auto_platform?sslmode=require"

# JWT (STRONG SECRET)
JWT_SECRET="$(openssl rand -base64 32)"

# OWNER
OWNER_EMAIL="admin@yourdomain.com"
OWNER_PASSWORD="$(openssl rand -base64 16)"

# OpenAI
OPENAI_API_KEY="sk-proj-your-production-key"

# S3 CloudFlare R2
S3_ENDPOINT="https://your-account.r2.cloudflarestorage.com"
S3_ACCESS_KEY="your-r2-access-key"
S3_SECRET_KEY="your-r2-secret-key"
S3_BUCKET="auto-platform-prod"
S3_REGION="auto"

# Redis (for distributed rate limiting)
REDIS_URL="redis://:strong_redis_password@redis.yourhost.com:6379"

# Next.js
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"

# Monitoring
SENTRY_DSN="https://your-sentry-dsn"
```

## Initialization Commands

```bash
# 1. Copy example file
cp .env.example .env.local

# 2. Edit variables
nano .env.local

# 3. Generate JWT_SECRET
openssl rand -base64 32

# 4. Run database migrations
npx prisma migrate deploy

# 5. Initialize OWNER account
npm run init-owner
# or
tsx scripts/init-owner.ts

# 6. Verify setup
npx prisma studio
```

## Troubleshooting

### "JWT verification failed"
- Check JWT_SECRET is set correctly
- Must be same across all server instances
- Tokens expire after 7 days (access) / 30 days (refresh)

### "Database connection failed"
- Verify DATABASE_URL format
- Check PostgreSQL is running
- Test connection: `psql $DATABASE_URL`

### "OpenAI API error"
- Verify OPENAI_API_KEY is valid
- Check rate limits on OpenAI dashboard
- Ensure server-side only (not exposed to client)

### "OWNER account not found"
- Run `tsx scripts/init-owner.ts`
- Check OWNER_EMAIL and OWNER_PASSWORD are set
- Verify in DB: `SELECT * FROM users WHERE role = 'owner';`

---

✅ **Keep these variables secure and never expose them publicly!**

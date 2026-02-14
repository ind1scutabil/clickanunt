# 🚀 Production Deployment Guide - ClickAnunț

**Status:** Build Ready ✅  
**Date:** 2026-02-13  
**Target:** https://www.clickanunt.ro  
**Server:** 46.225.69.155 (Hetzner VPS)  

---

## Pre-Deployment Checklist

- [x] Build succeeds: `npm run build` ✅
- [x] TypeScript checks pass ✅
- [x] All tests pass ✅
- [x] Database consolidation complete (1 connection) ✅
- [x] Bot protection removed ✅
- [x] Local verification on port 3000 ✅
- [x] SSH connectivity verified ✅

---

## Quick Start (3 Commands)

### Option 1: Interactive Deployment (Recommended)

Run this from your local machine:

```bash
cd ~/projects/auto-platform

# Make sure you have SSH key passphrase ready
./scripts/deploy-interactive.sh
```

**When prompted:** Enter your SSH key passphrase

The script will:
1. Build locally
2. Sync files to `/var/www/clickanunt`
3. Install dependencies on server
4. Run database migrations
5. Build on server
6. Restart PM2 process
7. Verify health endpoint

---

### Option 2: Manual Step-by-Step Deployment

If the interactive script doesn't work, do this manually:

```bash
# 1. From local: Build
npm run build

# 2. From local: Sync files (you'll be prompted for SSH passphrase)
rsync -avz --delete \
  --exclude node_modules \
  --exclude .git \
  --exclude coverage \
  ./ root@46.225.69.155:/var/www/clickanunt/

# 3. SSH into server (you'll be prompted for SSH passphrase)
ssh root@46.225.69.155

# 4. On server, run these commands:
cd /var/www/clickanunt

# Install dependencies
npm ci

# Update .env if needed (check database connection)
cat .env | grep DATABASE_URL

# Run migrations
npx prisma migrate deploy

# Build on server
NODE_ENV=production npm run build

# Restart PM2
pm2 restart clickanunt --update-env

# Check status
pm2 status clickanunt

# View logs
pm2 logs clickanunt --lines 50
```

---

## Troubleshooting

### SSH Key Passphrase Issue
If you get SSH passphrase prompts repeatedly:

```bash
# Add SSH key to agent before running deployment
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/hetzner_ed25519

# Then run deployment
./scripts/deploy-interactive.sh
```

### Database Connection Error
The server `.env` may have incorrect `DATABASE_URL`. Check:

```bash
ssh root@46.225.69.155
cat /var/www/clickanunt/.env
```

Should show PostgreSQL connection to local or remote database.

### Application Won't Start
Check PM2 logs:

```bash
ssh root@46.225.69.155
pm2 logs clickanunt --lines 100
pm2 status
```

### Health Check Fails
Wait a few more seconds for startup:

```bash
ssh root@46.225.69.155
curl http://localhost:3000/api/health
```

---

## Verification After Deployment

### 1. Check PM2 Process
```bash
ssh root@46.225.69.155 "pm2 status clickanunt"
```

Expected: `online` status ✅

### 2. Test Local Server (on server)
```bash
ssh root@46.225.69.155 "curl http://localhost:3000/api/health"
```

Expected: JSON response with `"status":"ok"` ✅

### 3. Test Public URL
```bash
curl https://www.clickanunt.ro/api/health
```

Expected: Same health response ✅

### 4. Browser Test
Open: https://www.clickanunt.ro

Expected:
- Homepage loads ✅
- Categories visible ✅
- No "Bot protection verification failed" errors ✅
- Build timestamp in footer ✅

---

## Rollback (if needed)

```bash
ssh root@46.225.69.155

# See previous commits
cd /var/www/clickanunt
git log --oneline -5

# Checkout previous version
git checkout <commit-hash>

# Rebuild and restart
npm run build
pm2 restart clickanunt
```

---

## Database Migrations

All migrations are tracked in `prisma/migrations/`. They run automatically with:

```bash
npx prisma migrate deploy
```

To check migration status:

```bash
ssh root@46.225.69.155 "cd /var/www/clickanunt && npx prisma migrate status"
```

---

## Monitoring

### Real-time Logs
```bash
ssh root@46.225.69.155 "pm2 logs clickanunt"
```

### Process Metrics
```bash
ssh root@46.225.69.155 "pm2 monit"
```

### Service Status
```bash
ssh root@46.225.69.155 "pm2 status"
```

---

## Important Notes

⚠️ **Single Database Connection:**
- All routes use `lib/prisma.ts` singleton
- Zero duplicate Prisma clients
- Connection pooling optimized

⚠️ **Build Fingerprint:**
- `Date.now()` added to footer for cache busting
- Fresh builds always visible

⚠️ **Bot Protection Removed:**
- Turnstile completely removed
- Cloudflare BOT_DETECTION.enableChallenge disabled
- No UI messages for bot verification

⚠️ **Production Env:**
- DATABASE_URL must point to valid PostgreSQL
- NODE_ENV=production enables optimizations
- NEXT_PUBLIC_BUILD_ID used for cache control

---

## Next Steps

1. Run the deployment script or follow manual steps
2. Verify health endpoint responds
3. Test homepage loads correctly
4. Check PM2 logs for any errors
5. Monitor for 24 hours for stability

---

**Deployment created:** 2026-02-13  
**Ready for:** Immediate production deployment  
**Estimated downtime:** <2 minutes (PM2 restart)

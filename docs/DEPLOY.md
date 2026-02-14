# Production Deployment Guide

**Environment**: Hetzner VPS (46.225.69.155)  
**Stack**: Next.js 16 + PostgreSQL + PM2  
**Last Updated**: 2026-02-14

---

## 🚀 DEPLOYMENT PROCESS

### Prerequisites
- [x] Tests passing locally (`npm run predeploy`)
- [x] Database backup created
- [x] SSH access to server
- [x] Git tag created for release

---

## OPTION 1: Automated Deploy (Recommended)

```bash
# From local machine
cd /Users/ind1scutabil/projects/auto-platform

# Run pre-deploy checks
npm run predeploy

# Deploy to production
npm run deploy
```

The deploy script will:
1. ✅ Build locally
2. ✅ Run tests
3. ✅ Sync files to server
4. ✅ Install dependencies on server
5. ✅ Run database migrations
6. ✅ Build on server
7. ✅ Reload PM2 (zero-downtime)
8. ✅ Verify health check

---

## OPTION 2: Manual Deploy (Step-by-Step)

### Step 1: Local Checks
```bash
# Ensure all changes are committed
git status

# Run tests
npm run predeploy

# Build locally to verify
npm run build
```

### Step 2: Create Git Tag
```bash
# Tag the release
git tag -a v1.0.x -m "Release v1.0.x"
git push origin v1.0.x
```

### Step 3: Sync Code to Server
```bash
# Sync files (excludes node_modules, .git, .next)
rsync -avz --delete \
  --exclude node_modules \
  --exclude .git \
  --exclude .next \
  ./ root@46.225.69.155:/var/www/clickanunt/
```

### Step 4: Deploy on Server
```bash
# SSH into server
ssh root@46.225.69.155

# Navigate to app directory
cd /var/www/clickanunt

# Install dependencies
npm ci

# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Build application
NODE_ENV=production npm run build

# Reload PM2 (zero-downtime)
pm2 reload clickanunt

# Check status
pm2 status

# Check logs
pm2 logs clickanunt --lines 20
```

### Step 5: Verify Deployment
```bash
# From local machine

# Check health
curl https://www.clickanunt.ro/api/health

# Check database health
curl https://www.clickanunt.ro/api/health/db

# Check metrics
curl https://www.clickanunt.ro/api/metrics

# Test in browser
open https://www.clickanunt.ro
```

---

## 🔄 ROLLBACK PROCESS

### Option 1: Automated Rollback
```bash
# From local machine
npm run rollback
```

### Option 2: Manual Rollback

#### Step 1: Identify Last Good Version
```bash
# Check git tags
git tag -l

# Or check deployment history
ssh root@46.225.69.155 "pm2 logs clickanunt --lines 100 | grep 'Ready in'"
```

#### Step 2: Checkout Previous Version
```bash
# Locally, checkout last good tag
git checkout v1.0.x

# Sync to server
rsync -avz --delete \
  --exclude node_modules \
  --exclude .git \
  --exclude .next \
  ./ root@46.225.69.155:/var/www/clickanunt/
```

#### Step 3: Rebuild and Reload
```bash
# SSH into server
ssh root@46.225.69.155

cd /var/www/clickanunt

# Install dependencies
npm ci

# Generate Prisma Client
npx prisma generate

# Build
NODE_ENV=production npm run build

# Reload PM2
pm2 reload clickanunt

# Verify
curl http://localhost:3000/api/health
```

#### Step 4: Database Rollback (if needed)

⚠️ **CAUTION**: Only if migration broke something

```bash
# SSH into server
ssh root@46.225.69.155

cd /var/www/clickanunt

# Check migration status
npx prisma migrate status

# Option 1: Reset to specific migration (DESTRUCTIVE)
# npx prisma migrate reset

# Option 2: Restore from backup
psql -U autoplat -d autoplat < /var/backups/clickanunt_YYYYMMDD.sql
```

---

## 📦 ECOSYSTEM FILE

**Location**: `/var/www/clickanunt/ecosystem.config.js`

```javascript
module.exports = {
  apps: [{
    name: 'clickanunt',
    cwd: '/var/www/clickanunt',
    script: 'npm',
    args: 'start',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    error_file: '/root/.pm2/logs/clickanunt-error.log',
    out_file: '/root/.pm2/logs/clickanunt-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
  }]
};
```

**Usage**:
```bash
# Start with ecosystem file
pm2 start ecosystem.config.js

# Reload
pm2 reload ecosystem.config.js

# Delete and recreate
pm2 delete all
pm2 start ecosystem.config.js
pm2 save
```

---

## 🔍 PRE-DEPLOY CHECKLIST

- [ ] All tests passing (`npm run predeploy`)
- [ ] Build succeeds locally (`npm run build`)
- [ ] Database backup created
- [ ] Git changes committed and tagged
- [ ] Team notified of deployment
- [ ] Monitoring ready (check PM2, logs)
- [ ] Rollback plan reviewed

---

## 📊 POST-DEPLOY CHECKLIST

- [ ] Health check returns 200 OK
- [ ] Database health check passes
- [ ] PM2 process is online
- [ ] No errors in PM2 logs
- [ ] Test login/registration works
- [ ] Test listing creation works
- [ ] Test search works
- [ ] Cloudflare cache purged (if needed)
- [ ] Metrics endpoint accessible
- [ ] Response times acceptable

---

## 🚨 EMERGENCY PROCEDURES

### Immediate Rollback Needed

```bash
# Quick rollback (if deploy just happened)
ssh root@46.225.69.155 "cd /var/www/clickanunt && git checkout HEAD~1 && npm ci && npm run build && pm2 reload clickanunt"
```

### Site Completely Down

```bash
# Check PM2
ssh root@46.225.69.155 "pm2 status"

# Restart if needed
ssh root@46.225.69.155 "pm2 restart clickanunt"

# Check database
ssh root@46.225.69.155 "systemctl status postgresql"

# Check logs
ssh root@46.225.69.155 "pm2 logs clickanunt --lines 50"
```

### Database Migration Failed

```bash
# Check status
ssh root@46.225.69.155 "cd /var/www/clickanunt && npx prisma migrate status"

# If stuck, mark migration as applied (CAREFUL!)
ssh root@46.225.69.155 "cd /var/www/clickanunt && npx prisma migrate resolve --applied <migration_name>"

# Or reset (DESTRUCTIVE - restore from backup after)
ssh root@46.225.69.155 "cd /var/www/clickanunt && npx prisma migrate reset"
```

---

## 🔐 SECURITY NOTES

### Environment Variables

**Never commit these to git**:
```bash
DATABASE_URL="postgresql://autoplat:autoplat123@localhost:5432/autoplat"
NEXTAUTH_SECRET="<secret>"
JWT_SECRET="<secret>"
```

**Location on server**: `/var/www/clickanunt/.env`

### Database Credentials

**Change default password**:
```bash
ssh root@46.225.69.155
sudo -u postgres psql
ALTER USER autoplat WITH PASSWORD 'new_secure_password';
\q

# Update .env
nano /var/www/clickanunt/.env
# Change DATABASE_URL password

# Restart PM2
pm2 restart clickanunt
```

---

## 📈 SCALING

### Enable PM2 Cluster Mode (2-4 instances)

```bash
# Edit ecosystem.config.js
instances: 2,  # or 'max' for all CPU cores
exec_mode: 'cluster',

# Reload
pm2 reload ecosystem.config.js
```

⚠️ **Note**: Requires Redis for rate limiting if using >1 instance

---

## 📝 DEPLOYMENT LOG

Keep track of deployments:

| Date | Version | Changes | Deployed By | Rollback? |
|------|---------|---------|-------------|-----------|
| 2026-02-14 | v1.0.0 | Initial production | System | No |

---

**For deployment issues, check RUNBOOK.md for troubleshooting.**

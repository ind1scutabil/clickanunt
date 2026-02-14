# Production Deployment Verification Checklist

**Use this checklist before and after every production deployment**

---

## PRE-DEPLOYMENT

### Code Quality
- [ ] `npm run lint` passes with no errors
- [ ] `npm run type-check` passes with no errors  
- [ ] `npm run test` passes (all unit tests)
- [ ] `npm run build` completes successfully
- [ ] Git changes committed and pushed
- [ ] Git tag created for release (e.g., `v1.0.1`)

### Database
- [ ] Database backup created
- [ ] Migrations reviewed and tested locally
- [ ] No destructive migrations without explicit approval
- [ ] Indexes verified (check `prisma/migrations/production_indexes.sql`)

### Environment
- [ ] Environment variables verified on server
- [ ] No secrets in git commits
- [ ] `.env` file on server is up to date
- [ ] Database connection string correct

### Team Communication
- [ ] Team notified of deployment window
- [ ] On-call engineer identified
- [ ] Rollback plan reviewed

---

## DEPLOYMENT EXECUTION

### Automated Deploy
```bash
# Run from local machine
npm run predeploy  # Validates everything
npm run deploy     # Deploys to production
```

### Manual Steps (if automated fails)
1. [ ] SSH into server: `ssh root@46.225.69.155`
2. [ ] Navigate to app: `cd /var/www/clickanunt`
3. [ ] Pull latest code: `git pull`
4. [ ] Install dependencies: `npm ci`
5. [ ] Generate Prisma: `npx prisma generate`
6. [ ] Run migrations: `npx prisma migrate deploy`
7. [ ] Build: `NODE_ENV=production npm run build`
8. [ ] Reload PM2: `pm2 reload clickanunt`

---

## POST-DEPLOYMENT VERIFICATION

### Immediate Checks (< 1 minute)

#### 1. PM2 Status
```bash
ssh root@46.225.69.155 "pm2 status clickanunt"
```
- [ ] Process is `online`
- [ ] Uptime is recent (just restarted)
- [ ] Memory usage reasonable (< 200MB initially)
- [ ] No restart count spike

#### 2. Health Endpoints
```bash
# Basic health
curl -f https://www.clickanunt.ro/api/health
# Expected: {"status":"ok","version":"1.0.0",...}

# Database health
curl -f https://www.clickanunt.ro/api/health/db
# Expected: {"status":"ok","db":"connected",...}
```
- [ ] Health check returns 200 OK
- [ ] Database health returns "connected"
- [ ] Response time < 100ms

#### 3. Logs Check
```bash
ssh root@46.225.69.155 "pm2 logs clickanunt --lines 50 --nostream"
```
- [ ] No error messages in logs
- [ ] No database connection errors
- [ ] No crash/restart messages
- [ ] Application started successfully

### Functional Tests (< 5 minutes)

#### 4. Homepage
```bash
curl -I https://www.clickanunt.ro/
```
- [ ] Returns 200 OK
- [ ] Page loads in browser
- [ ] No console errors in browser
- [ ] Images load correctly
- [ ] CSS/styling applied

#### 5. Authentication
- [ ] Login page loads: https://www.clickanunt.ro/auth/login
- [ ] Can submit login form (test with test account)
- [ ] Registration page loads
- [ ] No errors in auth flow

#### 6. Listings
- [ ] Listings page loads: https://www.clickanunt.ro/listings
- [ ] Search works
- [ ] Listing detail pages load
- [ ] Can view listing details

#### 7. API Endpoints
```bash
# Search API
curl "https://www.clickanunt.ro/api/search?q=test"

# Listings API
curl "https://www.clickanunt.ro/api/listings?limit=10"
```
- [ ] API returns valid JSON
- [ ] No 500 errors
- [ ] Response times acceptable

### Performance Tests (< 2 minutes)

#### 8. Response Times
```bash
# Check metrics
curl https://www.clickanunt.ro/api/metrics | grep p95
```
- [ ] p95 latency < 500ms for all routes
- [ ] No routes with p95 > 1000ms

#### 9. Database Connections
```bash
ssh root@46.225.69.155 "psql -U autoplat -d autoplat -c \"SELECT COUNT(*) FROM pg_stat_activity WHERE datname='autoplat';\""
```
- [ ] Active connections < 15
- [ ] No connection pool exhaustion

#### 10. Memory Usage
```bash
ssh root@46.225.69.155 "pm2 status clickanunt"
```
- [ ] Memory usage < 200MB initially
- [ ] No immediate memory spike

### Security Checks (< 1 minute)

#### 11. Security Headers
```bash
curl -I https://www.clickanunt.ro/ | grep -E "(X-Content|X-Frame|Strict-Transport)"
```
- [ ] X-Content-Type-Options: nosniff
- [ ] X-Frame-Options: DENY
- [ ] Strict-Transport-Security present (HSTS)

#### 12. Rate Limiting
```bash
# Test auth endpoint (should get 429 after 5 requests)
for i in {1..6}; do curl -X POST https://www.clickanunt.ro/api/auth/login; done
```
- [ ] Rate limiting returns 429 on excessive requests
- [ ] Retry-After header present

### Monitoring Setup (< 2 minutes)

#### 13. Metrics Accessible
```bash
curl https://www.clickanunt.ro/api/metrics
```
- [ ] Metrics endpoint returns Prometheus format
- [ ] app_uptime_seconds present
- [ ] http_requests_total present
- [ ] db_connections_active present

#### 14. Logs Structured
```bash
ssh root@46.225.69.155 "pm2 logs clickanunt --lines 10 --nostream"
```
- [ ] Logs are JSON formatted (production)
- [ ] Request IDs present
- [ ] No sensitive data in logs

---

## CLOUDFLARE VERIFICATION

### 15. CDN Status
```bash
curl -I https://www.clickanunt.ro/ | grep -i server
```
- [ ] Server header shows "cloudflare"
- [ ] CF-Cache-Status header present
- [ ] CF-Ray header present

### 16. Cache Behavior
- [ ] Static assets cached (check /_next/static/*)
- [ ] API routes NOT cached
- [ ] Auth pages NOT cached

### 17. Purge Cache (if needed)
- [ ] Go to Cloudflare Dashboard → Caching
- [ ] Click "Purge Everything"
- [ ] Verify fresh content loads

---

## EXTENDED MONITORING (First Hour)

### 18. Watch Metrics
```bash
# Run every 5 minutes for first hour
watch -n 300 'curl -s https://www.clickanunt.ro/api/metrics | grep -E "(p95|error|memory)"'
```
- [ ] p95 latency stable
- [ ] Error rate < 1%
- [ ] Memory not growing

### 19. Monitor Logs
```bash
# Watch logs in real-time
ssh root@46.225.69.155 "pm2 logs clickanunt"
```
- [ ] No repeated errors
- [ ] No database timeouts
- [ ] No memory warnings

### 20. User Feedback
- [ ] Check support channels for issues
- [ ] Monitor error tracking (if integrated)
- [ ] No spike in user complaints

---

## ROLLBACK CRITERIA

**Immediate rollback if**:
- [ ] Health check fails (returns 5xx)
- [ ] Database connectivity lost
- [ ] Error rate > 5%
- [ ] Critical feature broken
- [ ] PM2 process crashes repeatedly

**Rollback procedure**:
```bash
# From local machine
npm run rollback

# Or manually
git checkout <previous_tag>
npm run deploy
```

---

## SIGN-OFF

**Deployment Details**:
- Date/Time: _________________
- Version: _________________
- Deployed by: _________________

**Verification**:
- [ ] All pre-deployment checks passed
- [ ] All post-deployment checks passed
- [ ] No critical issues detected
- [ ] Monitoring confirmed stable

**Approvals**:
- Tech Lead: _________________
- DevOps: _________________

---

## NOTES

_Use this space to document any issues, warnings, or observations during deployment_:

---

**Next Review**: 1 hour after deployment  
**Final Sign-off**: 24 hours after deployment (if stable)

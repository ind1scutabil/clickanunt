# Production Runbook - ClickAnunț

**Server**: 46.225.69.155 (Hetzner VPS)  
**Stack**: Next.js + PostgreSQL + PM2 + Cloudflare  
**Last Updated**: 2026-02-14

---

## 🔍 MONITORING

### Health Checks

```bash
# Basic health
curl https://www.clickanunt.ro/api/health

# Database health
curl https://www.clickanunt.ro/api/health/db

# Metrics (Prometheus format)
curl https://www.clickanunt.ro/api/metrics
```

### PM2 Monitoring

```bash
# SSH into server
ssh root@46.225.69.155

# Check status
pm2 status

# View logs (real-time)
pm2 logs clickanunt

# View logs (last 100 lines)
pm2 logs clickanunt --lines 100 --nostream

# Monitor CPU/Memory
pm2 monit

# Detailed process info
pm2 describe clickanunt
```

### Database Monitoring

```bash
# SSH into server
ssh root@46.225.69.155

# Check active connections
psql -U autoplat -d autoplat -c "SELECT COUNT(*) FROM pg_stat_activity WHERE datname='autoplat';"

# Check slow queries (if pg_stat_statements enabled)
psql -U autoplat -d autoplat -c "SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Check database size
psql -U autoplat -d autoplat -c "SELECT pg_size_pretty(pg_database_size('autoplat'));"

# Check index usage
psql -U autoplat -d autoplat -c "SELECT schemaname, tablename, indexname, idx_scan FROM pg_stat_user_indexes ORDER BY idx_scan DESC LIMIT 10;"
```

---

## 🚨 COMMON FAILURES & FIXES

### 1. Site Returns 502 Bad Gateway

**Symptoms**: Cloudflare shows 502 error  
**Causes**:
- PM2 process crashed
- Database connection failed
- Server out of memory

**Fix**:
```bash
# Check PM2 status
ssh root@46.225.69.155 "pm2 status"

# If crashed, restart
ssh root@46.225.69.155 "pm2 restart clickanunt"

# Check logs for errors
ssh root@46.225.69.155 "pm2 logs clickanunt --lines 50 --nostream"

# Check database
ssh root@46.225.69.155 "systemctl status postgresql"

# Check memory
ssh root@46.225.69.155 "free -h"
```

### 2. Site is Slow

**Symptoms**: Long response times  
**Causes**:
- Database queries slow
- Too many requests
- Cloudflare cache miss

**Fix**:
```bash
# Check metrics
curl https://www.clickanunt.ro/api/metrics | grep p95

# Check database connections
ssh root@46.225.69.155 "psql -U autoplat -d autoplat -c \"SELECT COUNT(*) FROM pg_stat_activity;\""

# Check PM2 memory
ssh root@46.225.69.155 "pm2 status"

# Restart if memory high (>500MB)
ssh root@46.225.69.155 "pm2 restart clickanunt"

# Purge Cloudflare cache
# Go to: https://dash.cloudflare.com -> Caching -> Purge Everything
```

### 3. Database Connection Errors

**Symptoms**: "Cannot reach database" errors  
**Causes**:
- PostgreSQL not running
- Connection pool exhausted
- Network issue

**Fix**:
```bash
# Check PostgreSQL status
ssh root@46.225.69.155 "systemctl status postgresql"

# Restart PostgreSQL (CAUTION)
ssh root@46.225.69.155 "systemctl restart postgresql"

# Check connection string
ssh root@46.225.69.155 "cat /var/www/clickanunt/.env | grep DATABASE_URL"

# Test connection
ssh root@46.225.69.155 "psql -U autoplat -d autoplat -c 'SELECT 1;'"
```

### 4. Rate Limit Errors (429)

**Symptoms**: Users getting "Too many requests"  
**Causes**:
- Legitimate high traffic
- Bot attack
- Bug causing loops

**Fix**:
```bash
# Check metrics
curl https://www.clickanunt.ro/api/metrics | grep http_requests

# Check logs for suspicious activity
ssh root@46.225.69.155 "pm2 logs clickanunt --lines 100 | grep 429"

# Temporarily disable rate limiting (emergency only)
# Edit lib/rate-limit.ts and redeploy

# Add Cloudflare rate limiting rules (permanent solution)
# See docs/CLOUDFLARE.md
```

### 5. Memory Leak

**Symptoms**: PM2 memory usage growing  
**Causes**:
- Event listeners not cleaned
- Large cache buildup
- Database connection leak

**Fix**:
```bash
# Check memory trend
ssh root@46.225.69.155 "pm2 monit"

# Restart process
ssh root@46.225.69.155 "pm2 restart clickanunt"

# If recurring, check logs for patterns
ssh root@46.225.69.155 "pm2 logs clickanunt | grep 'memory'"

# Check for connection leaks
ssh root@46.225.69.155 "psql -U autoplat -d autoplat -c \"SELECT COUNT(*) FROM pg_stat_activity WHERE state='idle in transaction';\""
```

---

## 📊 PERFORMANCE THRESHOLDS

### Response Times (95th percentile)
- ✅ Good: < 200ms
- ⚠️ Warning: 200-500ms
- 🔴 Critical: > 500ms

### Database Query Times
- ✅ Good: < 50ms
- ⚠️ Warning: 50-200ms
- 🔴 Critical: > 200ms

### Memory Usage (per PM2 instance)
- ✅ Good: < 200MB
- ⚠️ Warning: 200-400MB
- 🔴 Critical: > 400MB

### Database Connections
- ✅ Good: < 10
- ⚠️ Warning: 10-15
- 🔴 Critical: > 15

---

## 🔧 MAINTENANCE COMMANDS

### Clear Old Sessions
```bash
ssh root@46.225.69.155 "cd /var/www/clickanunt && psql -U autoplat -d autoplat -c \"DELETE FROM sessions WHERE \\\"expiresAt\\\" < NOW();\""
```

### Clear Old Refresh Tokens
```bash
ssh root@46.225.69.155 "cd /var/www/clickanunt && psql -U autoplat -d autoplat -c \"DELETE FROM refresh_tokens WHERE \\\"expiresAt\\\" < NOW();\""
```

### Vacuum Database
```bash
ssh root@46.225.69.155 "cd /var/www/clickanunt && psql -U autoplat -d autoplat -c \"VACUUM ANALYZE;\""
```

### Backup Database
```bash
ssh root@46.225.69.155 "cd /var/www/clickanunt && ./scripts/backup-db.sh"
```

---

## 📞 ESCALATION

### P0 (Critical - Site Down)
1. Check PM2 status and restart if needed
2. Check database connectivity
3. Check server resources (memory, disk)
4. Check Cloudflare status

### P1 (Major - Degraded Performance)
1. Check metrics endpoint
2. Check database query times
3. Purge Cloudflare cache
4. Consider scaling (more PM2 instances)

### P2 (Minor - Non-critical Issues)
1. Check logs for patterns
2. Monitor over time
3. Schedule maintenance window

---

## 📝 LOGS LOCATION

- **PM2 Logs**: `/root/.pm2/logs/clickanunt-*.log`
- **Error Logs**: `/root/.pm2/logs/clickanunt-error.log`
- **Output Logs**: `/root/.pm2/logs/clickanunt-out.log`
- **Application Logs**: Structured JSON to stdout (captured by PM2)

---

## 🔐 SECRETS MANAGEMENT

**Never log or expose**:
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `JWT_SECRET`
- `STRIPE_SECRET_KEY`
- Any API keys

**Rotation Schedule**:
- JWT secrets: Every 90 days
- Database password: Every 180 days
- API keys: As needed

---

## 📈 CAPACITY PLANNING

### Current Capacity
- Concurrent users: 50-100
- Requests/second: ~50
- Database records: 50K-500K

### Scale Triggers
- Memory usage > 3GB consistently
- CPU usage > 80% for > 5 minutes
- Response times > 500ms p95
- Database connections > 15 consistently

### Scaling Options
1. **Vertical**: Upgrade Hetzner VPS (8GB RAM + 4 CPU)
2. **Horizontal**: PM2 cluster mode (2-4 instances)
3. **Database**: Separate PostgreSQL server
4. **Cache**: Add Redis for rate limiting + caching

---

**For emergency support, check this runbook first, then escalate.**

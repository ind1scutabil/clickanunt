# ⚡ QUICK REFERENCE - Deployment & Verification

## 🚀 Deploy Now (3 commands)

```bash
# 1. Verify everything is ready
bash scripts/verify-deployment-ready.sh

# 2. Deploy with automatic verification
bash scripts/deploy-prod.sh

# 3. Test live deployment
curl https://www.clickanunt.ro/api/version
```

---

## 🔍 Verify Deployment Success

### Check Version Endpoint
```bash
curl https://www.clickanunt.ro/api/version | jq .

# Expected: gitCommit shows your commit hash (not null)
# Example: "gitCommit": "f290efe7b244d6f8718954e13db2efd2796feb15"
```

### Check Cache Headers
```bash
# Form page should NOT be cached
curl -I https://www.clickanunt.ro/listings/new | grep -i cache-control

# Expected: no-cache, no-store, must-revalidate
```

### Check PM2 Status
```bash
ssh root@46.225.69.155 "pm2 status clickanunt"

# Expected: status = online
```

---

## 📋 Before Deploying

```bash
# 1. Commit your changes
git add .
git commit -m "Description of changes"

# 2. Run predeploy checks
npm run predeploy

# 3. Run readiness verification
bash scripts/verify-deployment-ready.sh
```

---

## 🧪 Test After Deploying

### In Browser
1. Hard refresh: **Cmd+Shift+R** (Mac) or **Ctrl+Shift+R** (Windows)
2. Check form at `/listings/new` for changes
3. Test form reset button (🔄)
4. Try `?new` parameter link

### In Terminal
```bash
# Check version shows new commit
curl https://www.clickanunt.ro/api/version | jq .gitCommit

# Check logs for errors
ssh root@46.225.69.155 "pm2 logs clickanunt --lines 20"

# Check process is healthy
ssh root@46.225.69.155 "pm2 describe clickanunt"
```

---

## 🚨 If Changes Not Visible

### Step 1: Hard Refresh
```
Mac:     Cmd + Shift + R
Windows: Ctrl + Shift + R
Linux:   Ctrl + Shift + R
```

### Step 2: Verify Deployment
```bash
# Check version endpoint
curl https://www.clickanunt.ro/api/version

# Should show your git commit hash
# If null, deployment failed - rerun: bash scripts/deploy-prod.sh
```

### Step 3: Purge Cloudflare Cache
- Go to: cloudflare.com dashboard
- Click: Caching → Purge Everything
- Wait: 30 seconds
- Refresh: Browser (Cmd+Shift+R)

---

## 📊 What Each Fix Does

| Issue | Fix | Result |
|-------|-----|--------|
| Cloudflare caches form | Cache headers | ✅ Form never cached |
| Can't verify deployment | Version endpoint | ✅ Shows git commit |
| Deploy confusion | deploy-prod.sh | ✅ Automatic verify |
| No deployment history | deployment-info.json | ✅ Full audit trail |

---

## 🔑 Key Files

**Deployment**:
- `scripts/deploy-prod.sh` - Run this to deploy
- `scripts/verify-deployment-ready.sh` - Verification script

**Endpoints**:
- `app/api/version/route.ts` - Shows current deployment
- `app/listings/new` - Form page with cache fix

**Configuration**:
- `next.config.ts` - Cache rules
- `ecosystem.config.js` - PM2 config
- `.env` - Database config

**Documentation**:
- `DEPLOYMENT_INVESTIGATION_COMPLETE.md` - Full summary
- `docs/DEPLOYMENT_FIX_COMPLETE.md` - Detailed guide

---

## ✅ Deployment Checklist

- [ ] Changes committed to git
- [ ] `npm run predeploy` passes
- [ ] `bash scripts/verify-deployment-ready.sh` shows all ✅
- [ ] Run `bash scripts/deploy-prod.sh`
- [ ] See ✅ VERIFIED in deploy output
- [ ] Hard refresh browser (Cmd+Shift+R)
- [ ] Changes visible immediately
- [ ] `curl https://www.clickanunt.ro/api/version` shows new commit

---

## 🎯 Expected Outcome

After successful deployment:

✅ Form updates appear immediately (no cache delay)  
✅ `/api/version` shows correct git commit hash  
✅ Hard refresh browser shows changes instantly  
✅ Form reset button works  
✅ Deploy script shows "✅ VERIFIED" message  

---

## 📞 Support

**Deployment fails?**
```bash
# Check logs
ssh root@46.225.69.155 "pm2 logs clickanunt --err --lines 50"

# Restart app
ssh root@46.225.69.155 "pm2 restart clickanunt"
```

**Changes still not visible?**
- Step 1: Hard refresh (Cmd+Shift+R)
- Step 2: Verify version endpoint
- Step 3: Purge Cloudflare cache

**Need details?**
- See: `DEPLOYMENT_INVESTIGATION_COMPLETE.md`
- Or: `docs/DEPLOYMENT_FIX_COMPLETE.md`

---

**Quick Deploy**: `bash scripts/deploy-prod.sh` ⚡  
**Verify Live**: `curl https://www.clickanunt.ro/api/version` 🔍  
**All Ready**: ✅ 24/24 checks passed 🎉

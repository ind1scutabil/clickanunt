# DEPLOY TRUTH - LOCAL PROJECT

**Generated**: 2026-02-14 09:00 UTC  
**Audited by**: Automated investigation  
**Status**: ✅ SINGLE SOURCE OF TRUTH FOUND

---

## 1. PROJECT STRUCTURE

### Real Project Root
```
/Users/ind1scutabil/projects/auto-platform/
├── package.json (name: "clickanunt", v1.0.0)
├── next.config.ts (NextJS 16.1.6, App Router)
├── .git (git repo with 5+ commits)
├── tsconfig.json
├── prisma/schema.prisma (1 schema file)
└── ecosystem.config.js (PM2 config)
```

### Duplicate/Ghost Folder Found
```
/Users/ind1scutabil/projects/clickanunt/
├── package.json (minimal, v1.0.0)
├── .git (empty, 0 commits on main)
└── [UNUSED - no code, no history]
```

**RECOMMENDATION**: Delete `/Users/ind1scutabil/projects/clickanunt/` (it's orphaned)

---

## 2. GIT CONFIGURATION

### Remote
```bash
$ git remote -v
# OUTPUT: (empty - NO REMOTE CONFIGURED)
```

**⚠️ CRITICAL**: No GitHub/GitLab remote. Deployments work via rsync only.

### Current Branch & Commit
```bash
$ git branch
* main

$ git log --oneline -5
f290efe (HEAD -> main) Fix: Disable cache for /listings/new - prevent Cloudflare from caching form page
3e88844 Fix: Consolidate useEffect logic - single mount effect for localStorage and ?new parameter detection
1959445 Fix: Reset form state after submission & add manual reset button + detailed upload logging
6991b11 Production hardening: observability, rate-limiting, database safety, deployment automation
290688c docs: add comprehensive database consolidation final report
```

### Uncommitted Changes
```bash
$ git status --short
?? docs/DEPLOYMENT_COMPLETE.md
?? docs/FIX_FORM_RESET_UPLOAD.md
?? docs/USER_GUIDE_ADD_LISTING.md
```

All uncommitted files are docs (non-critical).

---

## 3. DEPLOYMENT SCRIPTS & TARGETS

### Multiple Deployment Scripts Found

| File | Size | Modified | Purpose | Status |
|------|------|----------|---------|--------|
| `scripts/deploy.sh` | 4.4K | 2026-02-14 08:13 | **MAIN** - Zero-downtime | ✅ Active |
| `scripts/deploy-now.sh` | 2.6K | 2026-02-13 12:31 | Quick deploy (no precheck) | ⚠️ Alternative |
| `scripts/deploy-production.sh` | 3.7K | 2026-02-13 08:36 | Legacy - uses different logic | ⚠️ Obsolete |
| `scripts/deploy-interactive.sh` | 5.4K | 2026-02-13 12:26 | Interactive - prompts user | ⚠️ Unused |

### Package.json Deploy Entry Points
```json
{
  "scripts": {
    "start": "next start",
    "predeploy": "npm run lint && npm run type-check && npm run test && npm run build",
    "deploy": "./scripts/deploy.sh"  
  }
}
```

**ACTIVE DEPLOY**: `npm run deploy` → `scripts/deploy.sh`

### Server Paths Referenced in Scripts
```bash
# All scripts target:
SERVER="root@46.225.69.155"
DEPLOY_DIR="/var/www/clickanunt"
```

---

## 4. BUILD & OUTPUT CONFIGURATION

### NextJS Config
- **File**: `next.config.ts`
- **Output**: `.next/` folder
- **Build Command**: `npm run build`
- **Start Command**: `next start`
- **Mode**: App Router (dynamic)

### Build Artifacts Location
```
/Users/ind1scutabil/projects/auto-platform/.next/
```

### Database Configuration
**Framework**: Prisma v5.22.0  
**Schema**: `prisma/schema.prisma` (1 file, no duplicates)  
**Migrations**: `prisma/migrations/` folder

---

## 5. ENVIRONMENT & SECRETS

### Local .env Files
```
./.env                            (ACTIVE - contains DATABASE_URL)
./.env.example                    (Template)
./.env.backup.20260213_075443     (Backup)
```

### Current Database URL (masked)
```
DATABASE_URL="postgresql://autoplat:***@localhost:5432/autoplat?schema=public"
```

- **Host**: localhost
- **Port**: 5432
- **Database**: autoplat
- **User**: autoplat
- **Schema**: public

---

## 6. ECOSYSTEM & PROCESS MANAGEMENT

### PM2 Configuration
- **File**: `ecosystem.config.js` (1 file, no duplicates)
- **App Name**: clickanunt
- **Mode**: fork (single instance)
- **Max Memory**: 500MB
- **Graceful Timeout**: 5s

### Server IP/Port
- **IP**: 46.225.69.155
- **Port**: 3000 (behind Cloudflare proxy)

---

## 7. WHAT DEPLOYS FROM HERE

### Deploy Flow
```
1. Local: npm run deploy
   ↓
2. Execute: scripts/deploy.sh
   ↓
3. Pre-flight: npm run predeploy (lint + typecheck + test + build)
   ↓
4. Build: Generates .next/ folder
   ↓
5. Rsync: Sends .next/, app/, lib/, etc. to server
   ↓
6. Server: npm ci + npm run build (rebuild on server)
   ↓
7. PM2: Reload clickanunt process
```

### What's Synced to Server
- Source code (app/, lib/, scripts/, etc.)
- Config files (next.config.ts, ecosystem.config.js, etc.)
- **NOT**: node_modules, .next (rebuilt on server)
- **NOT**: .env (already on server)

---

## 8. CRITICAL FILES FOR DEPLOYMENT

| File | Purpose | Criticality |
|------|---------|-------------|
| `package.json` | Dependencies & scripts | 🔴 CRITICAL |
| `next.config.ts` | NextJS build config | 🔴 CRITICAL |
| `ecosystem.config.js` | PM2 restart config | 🔴 CRITICAL |
| `scripts/deploy.sh` | Deployment logic | 🔴 CRITICAL |
| `.env` (on server only) | Runtime secrets | 🔴 CRITICAL |
| `prisma/schema.prisma` | DB schema | 🔴 CRITICAL |
| `.git/` | Commit history | 🟡 Important |

---

## 9. SUMMARY: LOCAL DEPLOY TRUTH

✅ **SINGLE SOURCE OF TRUTH**:
- **Project Root**: `/Users/ind1scutabil/projects/auto-platform/`
- **Framework**: Next.js 16.1.6 (App Router)
- **Deploy Entry**: `npm run deploy` → `scripts/deploy.sh`
- **Target**: `root@46.225.69.155:/var/www/clickanunt/`
- **Database**: PostgreSQL autoplat (localhost:5432)
- **Git**: Local history only (no remote)
- **Build Output**: `.next/` folder

❌ **ISSUES FOUND**:
1. Duplicate folder: `/Users/ind1scutabil/projects/clickanunt/` (ORPHANED)
2. Multiple deploy scripts (only deploy.sh is used via npm)
3. No git remote (deploy via rsync only)
4. No version tracking (added in PHASE 4)

⚠️ **ACTION NEEDED**:
- Delete orphaned `/clickanunt/` folder
- Consolidate deploy scripts (keep only deploy.sh, deploy-prod.sh)
- Create /api/version endpoint for verification (PHASE 4)
- Implement git commit hash tracking (PHASE 4)

---

**Next Phase**: Audit server state → DEPLOY_TRUTH_SERVER.md

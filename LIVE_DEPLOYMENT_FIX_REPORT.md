# LIVE_DEPLOYMENT_FIX_REPORT.md

**Incident:** Production served **obsolete SEO** (`localhost` `Sitemap:`, shard sitemap 404s, hub 404).  
**Date:** 2026-05-10 / 2026-05-11 (UTC-ish, server TZ)

---

## Root cause (deterministic)

| Issue | Explanation |
|--------|-------------|
| **Code never on server** | `messaging-stable` on VPS lagged **`9768c28e`** vs local uncommitted SEO work. No `git pull` of new routes/sitemaps ⇒ **production–repo mismatch.** |
| **Missing `NEXT_PUBLIC_SITE_URL`** | `.env` on VPS **had no `NEXT_PUBLIC_SITE_URL`**, weakening canonical consistency at previous builds. Line added: **`NEXT_PUBLIC_SITE_URL=https://www.clickanunt.ro`** |
| **`scripts/deploy-vps.sh`** | Defaults to **`git pull origin main`** if `DEPLOY_BRANCH` unset. Production runs **`messaging-stable`** — pulls from **main** can deploy the wrong lineage. Prefer: `DEPLOY_BRANCH=messaging-stable ./scripts/deploy-vps.sh`. |
| **`robots.txt` via CDN** | After deploying the **correct** app, **`https://www.clickanunt.ro/robots.txt`** may still serve **cached** stale body (`localhost` `Sitemap:`, cf-cache-status `HIT`, `Cache-Control max-age=14400`). **Origin bypass** shows **correct** `robots.txt`. |

---

## Production targets verified on VPS

| Item | Value |
|------|--------|
| **Folder** | `/var/www/clickanunt` |
| **PM2 name** | `clickanunt` |
| **`exec cwd`** | `/var/www/clickanunt` |
| **`script`** | `/usr/bin/npm` `start` |
| **Nginx** | Proxies **`/`** → `upstream nextjs` → **`localhost:3000`** |

---

## Git / deploy executed

| Field | Value |
|--------|--------|
| **Branch** | `messaging-stable` |
| **Previous HEAD (VPS)** | `9768c28e0d208f427e3cc7216f7cf055132f6981` |
| **Deployed HEAD** | **`28b7a125`** (`fix(seo-deploy): canonical www hub sitemaps robots; remove duplicate sitemap route`) |
| **Remote** | pushed to **`origin messaging-stable`** then **`git pull origin messaging-stable`** on VPS |

---

## Env confirmed

- **`NEXT_PUBLIC_SITE_URL=https://www.clickanunt.ro`** appended to `/var/www/clickanunt/.env` if absent (deployment script block).

*(Full `.env` not logged — contains secrets.)*

---

## Build / QA on VPS

Commands run (successful):

```
npm ci
npx prisma migrate deploy   # "No pending migrations"
NEXT_PUBLIC_SITE_URL=https://www.clickanunt.ro npm run type-check
npm run lint
NEXT_PUBLIC_SITE_URL=https://www.clickanunt.ro NODE_ENV=production npm run build
pm2 reload ecosystem.config.js --update-env
pm2 save
```

**Warning:** webpack `Critical dependency` in OpenTelemetry / Sentry (messaging trace) — **non-blocking.**

---

## PM2 restart

- **`pm2 reload ecosystem.config.js --update-env`** — OK  
- **`pm2 save`** — OK  

---

## Live URL status (verification)

### Through **HTTPS `https://www.clickanunt.ro`** (behind Cloudflare)

| Resource | Expected | Observed |
|----------|-----------|----------|
| `/sitemap.xml` | 200 + `www` | **OK** (`<loc>https://www.clickanunt.ro/`) |
| `/sitemap-categories.xml` | 200 + XML | **OK** |
| `/sitemap-cities.xml` | 200 + XML | **OK** |
| `/sitemap-listings.xml` | 200 + index | **OK** |
| `/auto` | 200 HTML | **OK** |
| `/electronice/cluj-napoca` | 200 HTML | **OK** |
| `/robots.txt` | WWW sitemap list | **`STALE on CDN`** (see below) |

### Bypass CDN (nginx origin, **`Host: www.clickanunt.ro`**)

```
curl http://46.225.69.155/robots.txt -H "Host: www.clickanunt.ro"
```

- **Ends with:**
  ```
  Host: www.clickanunt.ro
  Sitemap: https://www.clickanunt.ro/sitemap.xml
  Sitemap: https://www.clickanunt.ro/sitemap-categories.xml
  Sitemap: https://www.clickanunt.ro/sitemap-cities.xml
  Sitemap: https://www.clickanunt.ro/sitemap-listings.xml
  ```
  — **CORRECT.**

---

## Cloudflare — purge stale `robots.txt` (immediate)

Until purge or TTL expiry (up to **`max-age=14400`** on cached response), **`https://www.clickanunt.ro/robots.txt`** can still show **`Sitemap: http://localhost:3000/sitemap.xml`**.

**Exact purge (recommended):**

1. Cloudflare dashboard → **`clickanunt.ro`** zone.  
2. **Caching → Configuration → Purge Cache → Custom Purge**.  
3. Purge URLs (one per line):
   - `https://www.clickanunt.ro/robots.txt`  
   - Optional (if suspicious):  
     `https://www.clickanunt.ro/sitemap.xml`  
     `https://www.clickanunt.ro/sitemap-categories.xml`  
     `https://www.clickanunt.ro/sitemap-cities.xml`  
     `https://www.clickanunt.ro/sitemap-listings.xml`

**Avoid “Purge Everything”** unless you accept short global cold-cache window.

After purge: re-fetch `curl -sI https://www.clickanunt.ro/robots.txt` → expect **`cf-cache-status: MISS`** then **`EXPIRED`/`REVALIDATED`**, and body ending with **`Sitemap: https://www.clickanunt.ro/…`**.

---

## Remaining blockers

1. ~~Deploy old build~~ → **fixed** (`28b7a125`).  
2. ~~Missing env~~ → **`NEXT_PUBLIC_SITE_URL` set.**  
3. **CDN stale `robots.txt`** until **purge** or TTL — **documentation above** (operations, not Stripe/messaging).  

---

## Search Console — sitemap names (unchanged)

Submit:

1. `https://www.clickanunt.ro/sitemap.xml`  
2. `https://www.clickanunt.ro/sitemap-categories.xml`  
3. `https://www.clickanunt.ro/sitemap-cities.xml`  
4. `https://www.clickanunt.ro/sitemap-listings.xml`

---

## Production safety verdict — Google indexing readiness

**Application + origin behaviour:** **`SAFE FOR GOOGLE INDEXING`** (correct sitemaps/hubs/canonical WWW on fresh responses).  

**Public edge until robots purge:** **`NOT SAFE` / misleading** — crawlers obeying **`https://www.clickanunt.ro/robots.txt`** may temporarily read **`localhost` sitemap** from **CDN cache**.

**Operational requirement:** **`Purge Custom URL` for `robots.txt`** → then declare **fully SAFE** for crawler configuration.

---

## Recommended next priorities (after SEO foundation)

1. Cloudflare purge + recheck **`robots`** + **URL Inspection** (`live` vs **`Googlebot`**) in Search Console.  
2. Apex vs **www**: ensure **HTTPS 301 apex → www** at edge (infra), aligned with **`NEXT_PUBLIC_SITE_URL`**.  
3. Optional: shorten **`Cache-Control`** for **`/robots.txt`** via `next.config` header override (minor release) — not required once purge TTL understood.

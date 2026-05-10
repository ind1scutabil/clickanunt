# LIVE_DEPLOYMENT_STATUS — ClickAnunț (verification 2026-05-10)

Mission: deployment safety, live checks, indexing readiness — **no further SEO architecture changes** in codebase for this step.

---

## 1. Deployment status (repository / local CI)

| Step | Command | Result |
|------|-----------|--------|
| Clean install | `npm ci` | **PASS** |
| Database migrations | `npm run db:migrate` | **PASS** (local Postgres `localhost:5432`; migration `20260510194500_message_delivered_at` applied — **repeat `prisma migrate deploy` on VPS** against production DB) |
| Types | `NEXT_PUBLIC_SITE_URL=https://www.clickanunt.ro npm run type-check` | **PASS** |
| Lint | `npm run lint` | **PASS** |
| Production build | `NODE_ENV=production NEXT_PUBLIC_SITE_URL=https://www.clickanunt.ro npm run build` | **PASS** (non-blocking webpack warning: OpenTelemetry / Sentry import chain → messaging) |

**Note:** Repo build does **not** automatically deploy your VPS (no SSH/action from Cursor). Operational deploy + PM2/process restart stays with your **`scripts/deploy-*.sh`** workflow.

---

## 2. Production environment (manual verification — cannot read VPS `.env` from here)

Expect on **production**:

```bash
NEXT_PUBLIC_SITE_URL=https://www.clickanunt.ro
```

Checklist operator:

- No `NEXT_PUBLIC_SITE_URL=http://localhost:3000` (or strip it).
- Prefer **HTTPS** only; codebase normalizes apex `clickanunt.ro` → **`https://www.clickanunt.ro`** in `'production'` for `siteOrigin()`.
- **Build-time:** set the same env when running `NODE_ENV=production npm run build` (Docker `--build-arg` / CI env) so `robots`/static metadata bake with **www**.
- Dedupe duplicated keys in `.env` manually on server.

---

## 3. Live URL verification (`https://www.clickanunt.ro`)

Checks performed remotely with `curl -L`, **against current live site**:

| URL | HTTP | Observation |
|-----|------|--------------|
| `/` | **200** | OK — homepage reachable |
| `/api/health` | **200** | `{"status":"ok","database":"up",...}` |
| `/auth/login` | **200** | Auth page reachable (smoke — no credential test) |
| `/robots.txt` | **200** | ⚠️ **BLOCKER**: body ends with `Sitemap: http://localhost:3000/sitemap.xml` — crawlers pointed at localhost |
| `/sitemap.xml` | **200** | ⚠️ **INDEXING RISK**: `<loc>` use **`https://clickanunt.ro/...`** (apex, not **www**) and include **`/auth/login`**, **`/auth/signup`** — aligns with **pre-refactor app behavior**, **not** current repo `app/sitemap.ts` + shard system |
| `/sitemap-categories.xml` | **404** | **BLOCKER**: route not deployed (expected after deploy of current `next.config` rewrites + `sitemap-serve`) |
| `/sitemap-cities.xml` | **404** | **BLOCKER** (same as above) |
| `/sitemap-listings.xml` | **404** | **BLOCKER** (same as above) |
| `/auto`, `/imobiliare`, `/electronice`, `/auto/bucuresti`, `/electronice/cluj-napoca` | **404** | **BLOCKER** — SSR hub routes from repo **not** on live |

**Conclusion:** **Live deployment does not currently match repository SEO release.** Indexing/readiness fails until a **new artefact is deployed** built from this workspace with correct env.

*(Cloudflare preamble at top of `robots.txt` is CDN “content signals” policy — separate from the localhost sitemap line; the **localhost `Sitemap:` line remains a blocker**.)*

---

## 4. Core features — limited automated coverage

Automated smoke only (no Stripe charge, no admin impersonation):

- Homepage, login page, **`/api/health`** ⇒ **responded**.
- Messaging, Stripe promotion flows, authenticated admin — **manual UAT** post-deploy (`NOT TESTED REMOTELY`).

---

## 5. Google indexing readiness vs **current LIVE**

| Criterion | Current live |
|-----------|----------------|
| Sitemap index (shards) | **No** (`sitemap-listings.xml` **404**) |
| `robots` valid canonical sitemap refs | **No** (`localhost:3000` sitemap URL) |
| Canonical **www** in sitemap | **No** (apex in live XML) |
| Auth URLs omitted from crawl-oriented sitemap | **No** (present on live `/sitemap.xml`) |
| Server metadata on hub pillars | **N/A** (hubs **404**) |

After **successful** deploy using current repo:

- Prefer **only** canonical sitemap URLs in `robots` (four names below).
- Re-submit Search Console once live matches expectations.

---

## 6. Warnings retained (non-blocker for repo build)

- **Webpack:** `Critical dependency: the request of a dependency is an expression` (OpenTelemetry via Sentry, messaging imports).
- **npm audit:** 20 vulns reported by `npm ci` output (not auto-fixed).

---

## 7. Operational fix list (minimal — deploy + env — no Stripe/messaging edits)

1. Deploy build from current branch with **`NEXT_PUBLIC_SITE_URL=https://www.clickanunt.ro`** at **lint/build** stage.
2. On VPS/runtime: same **`NEXT_PUBLIC_SITE_URL`** / no localhost for public origin.
3. Run **`npx prisma migrate deploy`** against production PostgreSQL **before/at** rollout (same migrations as CI).
4. Restart app (PM2/systemd); watch logs for restart loops (**not observable from repo** — check `pm2 status` / systemd).
5. Re-run live curls: **`robots.txt`** must reference **`https://www.clickanunt.ro/sitemap.xml`** (and shard names), **`Sitemap:** must not contain `localhost`**.
6. If Cloudflare or nginx **substitutes/overrides `robots.txt`**, disable override or mirror app output so **single source of truth** is Next **`app/robots.ts`**.

---

## 8. Production safety verdict

| Aspect | Verdict |
|--------|---------|
| **Repo** (tests run in workspace) | **SAFE to ship** artefact (`type-check`, `lint`, prod `build` green with canonical env) |
| **Live https://www.clickanunt.ro (as verified)** | **NOT SAFE for Google indexing / SEO rollout** until redeploy aligns with §7 |

---

## 9. After SEO foundation stabilizes — recommended next priorities

1. Smoke + monitor **coverage** în Search Console după prima săptămână cu sitemap-uri shard.
2. **301** consistent **apex → www** la edge (dacă nu e deja) în paralel cu canonical **www**.
3. **Structured data** enrichment / performance (după KPI — ex. `next/image` pentru listing galleries) în sprint separat, fără a atinge Stripe/messaging.

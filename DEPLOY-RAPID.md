# 🚀 Deploy Rapid - clickanunturi.ro

## Opțiunea 1: Vercel (Cel mai rapid - 5 minute)

### Pașii:

1. **Creează cont Vercel**
   - Mergi la: https://vercel.com
   - Sign up cu GitHub/GitLab

2. **Push code pe GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/USERNAME/auto-platform.git
   git push -u origin main
   ```

3. **Import în Vercel**
   - Click "New Project"
   - Import repository-ul
   - Vercel detectează automat Next.js

4. **Configurare Environment Variables**
   ```
   DATABASE_URL=postgresql://...
   NEXT_PUBLIC_SITE_URL=https://clickanunturi.ro
   SMTP_HOST=smtp.gmail.com
   SMTP_USER=contact@clickanunturi.ro
   SMTP_PASS=...
   ```

5. **Deploy**
   - Click "Deploy"
   - Așteaptă 2-3 minute
   - Site live pe: https://auto-platform-xxx.vercel.app

6. **Adaugă domeniul custom**
   - Settings → Domains
   - Adaugă: clickanunturi.ro
   - Adaugă: www.clickanunturi.ro
   - Urmează instrucțiunile DNS

### ✅ Avantaje:
- ✅ SSL automat (HTTPS)
- ✅ CDN global
- ✅ Deploy automat la git push
- ✅ Zero downtime
- ✅ GRATUIT pentru proiecte mici

### ⚠️ Limitări:
- Serverless (nu poți rula cron jobs)
- Database trebuie extern (Supabase, PlanetScale)
- 100GB bandwidth/lună (gratuit)

---

## Opțiunea 2: Railway (Pentru PostgreSQL inclus)

### Pașii:

1. **Creează cont Railway**
   - https://railway.app
   - Sign up cu GitHub

2. **New Project → Deploy from GitHub**
   - Conectează repository-ul
   - Railway detectează Next.js

3. **Adaugă PostgreSQL**
   - Click "New"
   - PostgreSQL
   - Railway creează automat database

4. **Configurare Variables**
   - Railway setează automat DATABASE_URL
   - Adaugă restul variabilelor

5. **Deploy**
   - Push la GitHub
   - Deploy automat

6. **Adaugă domeniul**
   - Settings → Domains
   - Adaugă clickanunturi.ro
   - Configurare DNS

### ✅ Avantaje:
- ✅ PostgreSQL inclus
- ✅ 500 ore/lună GRATUIT
- ✅ Deploy automat
- ✅ SSL automat

---

## Opțiunea 3: VPS (Control complet - RECOMANDAT)

Dacă vrei control total și costuri mici:

### Cost: ~8 EUR/lună

1. **Hetzner VPS CX21**
   - 4GB RAM, 2 vCPU
   - https://www.hetzner.com/cloud

2. **Setup automat**
   ```bash
   # Upload script
   scp deploy/setup-vps.sh root@YOUR_IP:/tmp/
   
   # SSH și rulează
   ssh root@YOUR_IP
   bash /tmp/setup-vps.sh
   ```

3. **Deploy**
   ```bash
   bash deploy/deploy.sh production
   ```

4. **Cloudflare (GRATUIT)**
   - SSL, CDN, DDoS protection
   - Vezi: deploy/CLOUDFLARE-SETUP.md

### ✅ Avantaje:
- ✅ Control complet
- ✅ Cron jobs, backups
- ✅ Cost fix (8 EUR/lună)
- ✅ PostgreSQL local (rapid)
- ✅ Scalabil

---

## Comparație Rapidă

| Feature | Vercel | Railway | VPS Hetzner |
|---------|--------|---------|-------------|
| **Cost** | Gratis | Gratis | 8 EUR/lună |
| **SSL** | ✅ Auto | ✅ Auto | ✅ Let's Encrypt |
| **Database** | ❌ Extern | ✅ Inclus | ✅ Local |
| **Cron Jobs** | ❌ | ❌ | ✅ |
| **Backups** | ❌ Manual | ✅ Auto | ✅ Custom |
| **Setup Time** | 5 min | 10 min | 30 min |
| **Control** | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## Database Extern (Dacă folosești Vercel)

### Supabase (GRATUIT)

1. **Creează cont**: https://supabase.com
2. **New Project**: Alege password
3. **Copiază Database URL**:
   ```
   Settings → Database → Connection string
   ```
4. **Adaugă în Vercel**:
   ```
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres
   ```
5. **Run migrations**:
   ```bash
   DATABASE_URL="postgresql://..." npx prisma migrate deploy
   ```

### PlanetScale (MySQL)

Alternativă la PostgreSQL:
- https://planetscale.com
- 5GB storage gratuit
- Setup similar cu Supabase

---

## Recomandarea Mea

**Pentru început (testare rapidă):**
→ **Vercel + Supabase** (GRATUIT, 10 minute setup)

**Pentru producție (profesional):**
→ **VPS Hetzner + Cloudflare** (8 EUR/lună, control complet)

---

## Next Steps

Alege o variantă și urmează pașii! 

**Need help?** 
- Email: contact@clickanunturi.ro
- Documentație: deploy/PRODUCTION-DEPLOY.md

**Domeniul clickanunturi.ro:**
- Cumpără de la: Rotld.ro, Romarg.ro (~10 EUR/an)
- Sau folosește un subdomain gratuit pentru testare

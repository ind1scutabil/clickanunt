# 🚀 DEPLOY LIVE - Ghid Rapid Hetzner + Cloudflare

## ✅ Ce ai deja pregătit:
- ✅ Cod fără erori (0 erori TypeScript)
- ✅ Build success (44 pagini)
- ✅ Cont Hetzner
- ✅ Cont Cloudflare
- ✅ Cont Google Workshop

---

## 🎯 PAȘI DE URMAT (2-3 ore)

### PASUL 1: Creează Server pe Hetzner (15 min)

1. **Login Hetzner Cloud Console:**
   - Mergi la https://console.hetzner.cloud
   - Click **"New Project"** → Nume: `auto-platform-prod`

2. **Creează Server:**
   - Click **"Add Server"**
   - **Location:** Nuremberg, Germany (cel mai aproape de România)
   - **Image:** Ubuntu 22.04
   - **Type:** 
     - **Recomandat:** CPX21 (3 vCPU, 4GB RAM) - €8.21/lună
     - **Minim:** CPX11 (2 vCPU, 2GB RAM) - €4.51/lună
   - **Networking:** 
     - IPv4 & IPv6: ✅ (checked)
   - **SSH Keys:** 
     - Click "Add SSH Key"
     - Paste cheia ta SSH publică (sau generează una nouă)
   - **Name:** `auto-platform-prod-1`
   - Click **"Create & Buy Now"**

3. **Notează IP-ul:**
   - După 1-2 minute, serverul va fi gata
   - **IMPORTANT:** Notează IP-ul public (ex: `116.203.x.x`)

---

### PASUL 2: Configurează Domeniul pe Cloudflare (10 min)

1. **Adaugă Domeniul:**
   - Login Cloudflare: https://dash.cloudflare.com
   - Click **"Add a Site"**
   - Introdu domeniul tău (ex: `clickanunt.ro`)
   - Plan: **Free** (suficient)
   - Click "Add site"

2. **Schimbă Nameservers la Registrar:**
   - Cloudflare îți va arăta 2 nameservere (ex: `alice.ns.cloudflare.com`, `bob.ns.cloudflare.com`)
   - Mergi la registrar-ul tău de domenii (ex: RotLD, GoDaddy, etc.)
   - Schimbă nameservers-urile cu cele de la Cloudflare
   - **IMPORTANT:** Poate dura 2-24h să se propage

3. **Configurează DNS (fă asta IMEDIAT, nu aștepta):**
   
   În Cloudflare Dashboard → **DNS** → **Records**:
   
   **Record 1:**
   ```
   Type: A
   Name: @
   IPv4 address: [IP-UL-SERVERULUI-HETZNER]
   Proxy status: ✅ Proxied (cloud portocaliu)
   TTL: Auto
   ```
   
   **Record 2:**
   ```
   Type: A
   Name: www
   IPv4 address: [IP-UL-SERVERULUI-HETZNER]
   Proxy status: ✅ Proxied (cloud portocaliu)
   TTL: Auto
   ```

4. **SSL/TLS Settings:**
   - Mergi la **SSL/TLS** → **Overview**
   - Setează: **Full (strict)**
   - Activează **Always Use HTTPS**

---

### PASUL 3: Setează Variabile de Mediu (5 min)

**Pe calculatorul tău local**, creează fișierul `.env.production`:

```bash
# Database
DATABASE_URL="postgresql://autoplat:PAROLA_SIGURA_AICI@localhost:5432/autoplatform?schema=public"

# JWT Secret (generează una nouă!)
JWT_SECRET="GENEREAZA_UN_STRING_RANDOM_DE_32_CARACTERE"

# Stripe (dacă vrei plăți internaționale)
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Netopia Payments (pentru România)
NETOPIA_PUBLIC_KEY="cheie_publica_netopia"
NETOPIA_PRIVATE_KEY="cheie_privata_netopia"
NETOPIA_PUBLIC_KEY_LIVE="cheie_publica_live"
NETOPIA_PRIVATE_KEY_LIVE="cheie_privata_live"

# OpenAI (pentru moderare automată - opțional)
OPENAI_API_KEY="sk-..."

# Redis (pentru rate limiting - opțional)
REDIS_URL="redis://localhost:6379"

# S3/Storage (pentru imagini)
S3_BUCKET="auto-platform-images"
S3_REGION="eu-central-1"
S3_ACCESS_KEY_ID="..."
S3_SECRET_ACCESS_KEY="..."

# Domain
NEXT_PUBLIC_APP_URL="https://clickanunt.ro"
```

**Cum generezi JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### PASUL 4: Setup Server Automat (20 min)

1. **Conectează-te la server:**
   ```bash
   ssh root@[IP-UL-SERVERULUI-HETZNER]
   ```
   - Prima dată va întreba "Are you sure?", scrie `yes`

2. **Upload script setup:**
   
   **Pe calculatorul tău (într-un terminal nou):**
   ```bash
   cd /Users/ind1scutabil/projects/auto-platform
   scp deploy/setup-vps.sh root@[IP-UL-SERVERULUI]:/tmp/
   ```

3. **Rulează setup (pe server):**
   ```bash
   sudo bash /tmp/setup-vps.sh
   ```
   
   Scriptul va instala:
   - ✅ Node.js 20.x
   - ✅ PostgreSQL 14
   - ✅ Nginx (web server)
   - ✅ PM2 (process manager)
   - ✅ Certbot (SSL certificates)
   - ✅ Fail2ban (security)
   
   **Durată:** ~5-10 minute

4. **Setează parola PostgreSQL:**
   ```bash
   sudo -u postgres psql -c "ALTER USER autoplat WITH PASSWORD 'PAROLA_TA_SIGURA_AICI';"
   ```
   
   **IMPORTANT:** Folosește aceeași parolă ca în `.env.production`!

---

### PASUL 5: Deploy Aplicația (15 min)

1. **Pe calculatorul tău, creează pachetul de deployment:**
   
   ```bash
   cd /Users/ind1scutabil/projects/auto-platform
   
   # Build production
   npm run build
   
   # Creează arhivă
   tar -czf deploy-package.tar.gz \
     .next \
     node_modules \
     public \
     package.json \
     package-lock.json \
     prisma \
     ecosystem.config.js \
     .env.production
   ```

2. **Upload pe server:**
   ```bash
   scp deploy-package.tar.gz root@[IP-UL-SERVERULUI]:/home/appuser/
   ```

3. **Pe server, despachetează și setup:**
   ```bash
   # Conectează-te
   ssh root@[IP-UL-SERVERULUI]
   
   # Switch la user appuser
   su - appuser
   
   # Despachetează
   cd /home/appuser
   tar -xzf deploy-package.tar.gz
   rm deploy-package.tar.gz
   
   # Setup database
   npx prisma migrate deploy
   npx prisma generate
   
   # Pornește aplicația cu PM2
   pm2 start ecosystem.config.js --env production
   pm2 save
   pm2 startup
   ```

4. **Verificare:**
   ```bash
   pm2 status
   pm2 logs
   ```
   
   Ar trebui să vezi aplicația "online" (green)

---

### PASUL 6: Configurează Nginx (10 min)

1. **Pe server, editează config Nginx:**
   ```bash
   sudo nano /etc/nginx/sites-available/auto-platform
   ```

2. **Înlocuiește `YOUR_DOMAIN` cu domeniul tău:**
   ```nginx
   server {
       listen 80;
       listen [::]:80;
       server_name clickanunt.ro www.clickanunt.ro;
       
       # Redirecționează tot la HTTPS
       return 301 https://$server_name$request_uri;
   }
   
   server {
       listen 443 ssl http2;
       listen [::]:443 ssl http2;
       server_name clickanunt.ro www.clickanunt.ro;
       
       # SSL certificates (va fi generat de Certbot)
       ssl_certificate /etc/letsencrypt/live/clickanunt.ro/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/clickanunt.ro/privkey.pem;
       
       # Security headers
       add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
       add_header X-Frame-Options "SAMEORIGIN" always;
       add_header X-Content-Type-Options "nosniff" always;
       add_header X-XSS-Protection "1; mode=block" always;
       
       # Client body size (pentru upload imagini)
       client_max_body_size 10M;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
           
           # Timeouts
           proxy_connect_timeout 60s;
           proxy_send_timeout 60s;
           proxy_read_timeout 60s;
       }
       
       # Cache pentru assets statice
       location /_next/static {
           proxy_pass http://localhost:3000;
           proxy_cache_valid 200 365d;
           add_header Cache-Control "public, immutable";
       }
       
       # Health check (nu trebuie proxy prin Cloudflare)
       location /api/health {
           proxy_pass http://localhost:3000;
           access_log off;
       }
   }
   ```

3. **Activează site-ul:**
   ```bash
   sudo ln -sf /etc/nginx/sites-available/auto-platform /etc/nginx/sites-enabled/
   sudo nginx -t  # Test configurație
   sudo systemctl reload nginx
   ```

---

### PASUL 7: Generează SSL Certificate (5 min)

```bash
sudo certbot --nginx -d clickanunt.ro -d www.clickanunt.ro
```

**La întrebări răspunde:**
- Email: adresa ta de email
- Terms: `Y` (yes)
- Share email: `N` (no)

Certbot va configura automat Nginx pentru HTTPS și va seta auto-renewal.

---

### PASUL 8: Configurare Cloudflare Avansată (10 min)

1. **SSL/TLS:**
   - Cloudflare Dashboard → **SSL/TLS**
   - Mode: **Full (strict)** ✅
   - Edge Certificates → **Always Use HTTPS**: ON ✅
   - **Minimum TLS Version**: TLS 1.2 ✅

2. **Speed:**
   - **Auto Minify**: CSS, JavaScript, HTML - toate ON ✅
   - **Brotli**: ON ✅
   - **Rocket Loader**: OFF ❌ (poate cauza probleme cu Next.js)

3. **Caching:**
   - **Caching Level**: Standard ✅
   - **Browser Cache TTL**: Respect Existing Headers ✅

4. **Firewall (opțional dar recomandat):**
   - **Security Level**: Medium
   - **Bot Fight Mode**: ON
   - Creează regulă:
     ```
     Field: URI Path
     Operator: starts with
     Value: /api/
     Then: Managed Challenge
     When: requests > 100 per minute
     ```

5. **Page Rules (important pentru performanță):**
   
   **Rule 1: Cache Assets:**
   ```
   URL: *clickanunt.ro/_next/static/*
   Cache Level: Cache Everything
   Edge Cache TTL: 1 year
   ```
   
   **Rule 2: Cache Images:**
   ```
   URL: *clickanunt.ro/*.{jpg,jpeg,png,webp,svg}
   Cache Level: Cache Everything
   Edge Cache TTL: 1 month
   ```

---

### PASUL 9: Testare Completă (15 min)

1. **Verifică DNS propagation:**
   ```bash
   # Pe calculatorul tău
   nslookup clickanunt.ro
   ```
   Ar trebui să vezi IP-ul Cloudflare (nu IP-ul Hetzner direct)

2. **Testează site-ul:**
   - Deschide: https://clickanunt.ro
   - Verifică:
     - ✅ HTTPS funcționează (lacăt verde)
     - ✅ Pagina se încarcă
     - ✅ CSS-ul se aplică corect (fundal negru)
     - ✅ Poți naviga pe site

3. **Testează API-uri:**
   ```bash
   curl https://clickanunt.ro/api/health
   ```
   Ar trebui să vezi: `{"status":"healthy",...}`

4. **Verifică logs pe server:**
   ```bash
   ssh root@[IP-SERVER]
   su - appuser
   pm2 logs
   ```
   Nu ar trebui să vezi erori

5. **Testează SSL (important!):**
   - Mergi la: https://www.ssllabs.com/ssltest/
   - Introdu domeniul tău
   - Ar trebui să primești **A** sau **A+**

---

### PASUL 10: Setup Monitoring & Backups (20 min)

1. **Setup backup automat database:**
   
   **Pe server:**
   ```bash
   sudo nano /home/appuser/backup-db.sh
   ```
   
   **Conținut:**
   ```bash
   #!/bin/bash
   DATE=$(date +%Y%m%d_%H%M%S)
   BACKUP_DIR="/home/appuser/backups"
   mkdir -p $BACKUP_DIR
   
   # Backup PostgreSQL
   sudo -u postgres pg_dump autoplatform > $BACKUP_DIR/db_$DATE.sql
   
   # Păstrează doar ultimele 7 zile
   find $BACKUP_DIR -name "db_*.sql" -mtime +7 -delete
   
   # Compresia
   gzip $BACKUP_DIR/db_$DATE.sql
   ```
   
   ```bash
   chmod +x /home/appuser/backup-db.sh
   
   # Adaugă în cron (rulează zilnic la 3 AM)
   crontab -e
   ```
   
   **Adaugă linie:**
   ```
   0 3 * * * /home/appuser/backup-db.sh
   ```

2. **Setup monitoring PM2:**
   ```bash
   pm2 install pm2-logrotate
   pm2 set pm2-logrotate:max_size 10M
   pm2 set pm2-logrotate:retain 7
   ```

3. **Setup Uptime Monitor (Cloudflare - opțional):**
   - Hetzner Cloud Console → **Load Balancers** (gratuit cu serverul)
   - Sau folosește: https://uptimerobot.com (gratuit, verifică din 5 în 5 min)

---

## 🎯 CHECKLIST FINAL

Verifică că totul e completat:

### Pre-deployment
- [ ] Cont Hetzner creat
- [ ] Server VPS creat (CPX21 recomandat)
- [ ] IP server notat
- [ ] Cont Cloudflare activ
- [ ] Domeniu adăugat în Cloudflare
- [ ] Nameservers schimbați la registrar
- [ ] `.env.production` creat cu toate variabilele

### Deployment
- [ ] SSH key adăugat pe Hetzner
- [ ] `setup-vps.sh` rulat cu succes
- [ ] PostgreSQL configurat
- [ ] Aplicație deployată și rulează (pm2 status = online)
- [ ] Nginx configurat pentru domeniu
- [ ] SSL certificate generat (Certbot)
- [ ] DNS Records create în Cloudflare (A @ și A www)

### Post-deployment
- [ ] Site accesibil la https://domeniu.ro
- [ ] HTTPS funcționează (lacăt verde în browser)
- [ ] API-uri funcționează (/api/health)
- [ ] CSS-ul se încarcă corect
- [ ] Cloudflare SSL/TLS = Full (strict)
- [ ] Backup automat configurat
- [ ] Logs monitorizate (pm2 logs)
- [ ] SSL test = A/A+ rating

---

## 🔥 COMENZI RAPIDE UTILE

### Pe Server:

```bash
# Status aplicație
pm2 status
pm2 logs
pm2 monit

# Restart aplicație
pm2 restart all

# Deploy update nou
cd /home/appuser
pm2 stop all
# Upload fișiere noi aici
pm2 start ecosystem.config.js --env production

# Verificare Nginx
sudo nginx -t
sudo systemctl status nginx
sudo systemctl reload nginx

# Verificare PostgreSQL
sudo systemctl status postgresql
sudo -u postgres psql -c "\l"  # List databases

# Logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
pm2 logs --lines 100

# Disk space
df -h
du -sh /home/appuser/*
```

### Pe Local (pentru deploy nou):

```bash
cd /Users/ind1scutabil/projects/auto-platform

# Build
npm run build

# Creează pachet
tar -czf deploy-$(date +%Y%m%d).tar.gz .next public package.json prisma ecosystem.config.js .env.production

# Upload
scp deploy-$(date +%Y%m%d).tar.gz root@[IP-SERVER]:/home/appuser/

# Pe server: despachetează și restart
ssh root@[IP-SERVER]
su - appuser
tar -xzf deploy-*.tar.gz
npx prisma migrate deploy
pm2 restart all
```

---

## ⚠️ PROBLEME COMUNE & SOLUȚII

### 1. Site nu se încarcă (Error 522/521)
**Cauză:** Aplicația Next.js nu rulează sau Nginx nu e configurat corect

**Soluție:**
```bash
# Verifică aplicația
pm2 status
pm2 logs

# Verifică Nginx
sudo nginx -t
sudo systemctl status nginx

# Restart tot
pm2 restart all
sudo systemctl restart nginx
```

### 2. SSL Certificate Error
**Cauză:** Cloudflare SSL mode greșit

**Soluție:**
- Cloudflare Dashboard → SSL/TLS → **Full (strict)**
- Verifică că Certbot a rulat cu succes: `sudo certbot certificates`

### 3. 502 Bad Gateway
**Cauză:** Next.js nu ascultă pe portul 3000

**Soluție:**
```bash
pm2 logs
# Verifică dacă aplicația a pornit corect
netstat -tlnp | grep 3000
```

### 4. Database Connection Error
**Cauză:** DATABASE_URL incorect în `.env.production`

**Soluție:**
```bash
# Verifică conexiunea
psql postgresql://autoplat:PAROLA@localhost:5432/autoplatform

# Verifică .env.production
cat .env.production | grep DATABASE_URL
```

### 5. Images nu se încarcă
**Cauză:** S3/Storage nu e configurat

**Soluție:**
- Verifică variabilele S3 în `.env.production`
- Sau configurează storage local temporar

---

## 📞 SUPORT

**Documentație detaliată:**
- `/deploy/PRODUCTION-DEPLOY.md` - Ghid complet
- `/deploy/CLOUDFLARE-SETUP.md` - Configurare Cloudflare
- `/deploy/COMMANDS.md` - Comenzi utile

**Community:**
- Next.js Discord: https://discord.gg/nextjs
- Hetzner Community: https://community.hetzner.com

---

## 🎉 SUCCES!

Dacă totul e verde în checklist, **FELICITĂRI!** 

Site-ul tău este LIVE și accesibil public la:
- 🌐 https://clickanunt.ro
- 🌐 https://www.clickanunt.ro

**Next steps:**
1. Configurează Google Analytics
2. Adaugă Sitemap la Google Search Console
3. Setup Netopia Payments pentru plăți reale
4. Configurează email sending (SendGrid/Mailgun)
5. Monitorizare cu Sentry sau LogRocket

**IMPORTANT:** Fă backup-uri regulate și monitorizează logs-urile zilnic primele 2 săptămâni!

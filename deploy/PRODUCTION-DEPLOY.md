# 🚀 Production Deployment Guide - Complete

## 📋 Prerequisites

- VPS Hetzner (Ubuntu 22.04) - minimum 4GB RAM, 2 vCPU
- Domain registrat (exemplu: clickanunt.ro)
- Cont Cloudflare (gratuit)
- PostgreSQL 14+
- Node.js 20.x
- Cont Stripe (pentru plăți internaționale - opțional)
- Cont Netopia Payments (pentru plăți România)

---

## 🎯 Deployment Steps

### 1. Setup VPS Hetzner

```bash
# Conectare la VPS
ssh root@YOUR_SERVER_IP

# Upload setup script
scp deploy/setup-vps.sh root@YOUR_SERVER_IP:/tmp/

# Run setup
sudo bash /tmp/setup-vps.sh
```

**Ce face scriptul:**
- ✅ Instalează Node.js 20.x, PM2, Nginx, PostgreSQL 14
- ✅ Configurează firewall (UFW)
- ✅ Instalează fail2ban pentru securitate
- ✅ Creează user `appuser`
- ✅ Setup log rotation
- ✅ Creează directoare necesare

**IMPORTANT:** După script, schimbă parola PostgreSQL:
```bash
sudo -u postgres psql -c "ALTER USER autoplat WITH PASSWORD 'parola-foarte-sigura';"
```

---

### 2. Setup PostgreSQL Production

```bash
# Conectare la PostgreSQL
sudo -u postgres psql

# Verifică database
\l
\c autoplat
\dt

# Exit
\q
```

---

### 3. Setup Nginx

```bash
# Copiază configurația
sudo cp /var/www/auto-platform/deploy/nginx.conf /etc/nginx/sites-available/auto-platform

# Editează configurația - schimbă yourdomain.com cu domeniul tău
sudo nano /etc/nginx/sites-available/auto-platform

# Creează symlink
sudo ln -s /etc/nginx/sites-available/auto-platform /etc/nginx/sites-enabled/

# Test configurație
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

### 4. Setup SSL cu Let's Encrypt

```bash
# Obține certificat SSL
sudo certbot --nginx -d clickanunt.ro -d www.clickanunt.ro

# Test auto-renewal
sudo certbot renew --dry-run
```

**Certificatul se reînnoiește automat!**

---

### 5. Deploy Application

**A) Din local machine:**

```bash
# Editează deploy/deploy.sh
# Schimbă SERVER_HOST cu IP-ul serverului

# Deploy
bash deploy/deploy.sh production
```

**B) Manual pe server:**

```bash
# Clone repository
cd /var/www
sudo git clone https://github.com/YOUR_REPO/auto-platform.git
sudo chown -R appuser:appuser auto-platform

# Switch to appuser
sudo su - appuser
cd /var/www/auto-platform

# Install dependencies
npm ci --production

# Setup .env
cp .env.local .env.production
nano .env.production
```

**ENV PRODUCTION (obligatoriu):**
```env
DATABASE_URL="postgresql://autoplat:PAROLA_AICI@localhost:5432/autoplat"
NEXT_PUBLIC_SITE_URL="https://clickanunt.ro"
NEXT_PUBLIC_APP_URL="https://clickanunt.ro"
NODE_ENV="production"

# Email
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="contact@clickanunt.ro"
SMTP_PASS="PAROLA_GMAIL"

# Stripe (optional - pentru plăți internaționale)
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Netopia (obligatoriu - pentru plăți România)
NETOPIA_API_KEY="your_api_key"
NETOPIA_POS_SIGNATURE="your_pos_signature"
NETOPIA_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
NETOPIA_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Monitoring
ALERT_EMAIL="admin@clickanunt.ro"
SLACK_WEBHOOK="https://hooks.slack.com/services/..."

# Backup
BACKUP_ENCRYPTION_KEY="parola-foarte-sigura-pentru-backup"
DB_PASSWORD="parola_postgres"
```

```bash
# Run migrations
npx prisma migrate deploy
npx prisma generate

# Build application
npm run build

# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 config
pm2 save

# Setup PM2 startup
pm2 startup
# Copiază comanda afișată și rulează-o

# Verify
pm2 status
pm2 logs auto-platform
```

---

### 6. Setup Cloudflare

**A) DNS:**

1. Accesează Cloudflare Dashboard
2. Adaugă domeniul: clickanunt.ro
3. Copiază nameserver-urile Cloudflare
4. Mergi la registrar-ul domeniului (ex: Romarg) și schimbă nameservers
5. Așteaptă propagare DNS (2-24 ore)

**B) Configurare:**

Urmează ghidul din `deploy/CLOUDFLARE-SETUP.md`:
- ✅ SSL/TLS: Full (strict)
- ✅ Always Use HTTPS: ON
- ✅ Firewall Rules: Rate limiting
- ✅ Page Rules: Cache static assets
- ✅ Auto Minify: JS, CSS, HTML
- ✅ Brotli: ON

---

### 7. Setup Backups

```bash
# Editează backup script
nano /var/www/auto-platform/deploy/backup.sh

# Adaugă in crontab (ca appuser)
crontab -e

# Adaugă:
0 2 * * * /var/www/auto-platform/deploy/backup.sh
```

**Backup include:**
- ✅ Database dump (PostgreSQL)
- ✅ Uploaded files (dacă sunt pe server)
- ✅ .env file (encrypted)
- ✅ Retention: 14 zile

**Testează backup:**
```bash
bash /var/www/auto-platform/deploy/backup.sh
ls -lh /var/backups/auto-platform/
```

---

### 8. Setup Monitoring

```bash
# Editează monitoring script
nano /var/www/auto-platform/deploy/monitor.sh

# Adaugă in crontab
*/5 * * * * /var/www/auto-platform/deploy/monitor.sh
```

**Monitorizare:**
- ✅ Health check (API)
- ✅ Database connectivity
- ✅ Disk space
- ✅ Memory usage
- ✅ PM2 process status
- ✅ Alertă email/Slack la probleme

---

### 9. Setup Netopia Payments

**A) Obține credențiale:**

1. Cont Netopia: https://netopia-payments.com
2. Obține: API Key, POS Signature
3. Generează chei RSA pentru criptare

**B) Generare chei RSA:**

```bash
# Pe server
cd /var/www/auto-platform
mkdir -p keys

# Generează private key
openssl genrsa -out keys/netopia-private.pem 2048

# Generează public key
openssl rsa -in keys/netopia-private.pem -pubout -out keys/netopia-public.pem

# Vezi public key (trimite-l la Netopia)
cat keys/netopia-public.pem

# Protejează keys
chmod 600 keys/*.pem
```

**C) Configurare în Netopia Dashboard:**
- URL IPN: `https://clickanunt.ro/api/payments/netopia/ipn`
- URL Success: `https://clickanunt.ro/payments/success`
- URL Cancel: `https://clickanunt.ro/payments/cancel`

**D) Test plată:**
```bash
# Sandbox credentials
curl -X POST https://clickanunt.ro/api/payments/netopia \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_id","amount":10,"currency":"RON"}'
```

---

### 10. Create Initial Admin

```bash
# Pe server
cd /var/www/auto-platform
export DATABASE_URL="postgresql://autoplat:PAROLA@localhost:5432/autoplat"

# Creează admin
npx ts-node scripts/create-admin.ts
```

---

### 11. Verificare Finală

```bash
# Health check
curl https://clickanunt.ro/api/health

# Check SSL
curl -I https://clickanunt.ro

# Check API
curl https://clickanunt.ro/api/listings?limit=1

# Check PM2
pm2 status
pm2 logs auto-platform --lines 50

# Check Nginx
sudo nginx -t
sudo systemctl status nginx

# Check PostgreSQL
sudo systemctl status postgresql

# Check disk space
df -h

# Check memory
free -h
```

---

## 🔧 Maintenance Commands

### Update Application

```bash
# Pe server (ca appuser)
cd /var/www/auto-platform

# Pull latest code
git pull origin main

# Install deps
npm ci --production

# Run migrations
npx prisma migrate deploy
npx prisma generate

# Rebuild
npm run build

# Reload PM2
pm2 reload ecosystem.config.js --env production
```

### Database Backup Manual

```bash
# Backup
pg_dump -U autoplat -h localhost autoplat | gzip > backup_$(date +%Y%m%d).sql.gz

# Restore
gunzip < backup_20260205.sql.gz | psql -U autoplat -h localhost autoplat
```

### View Logs

```bash
# PM2 logs
pm2 logs auto-platform

# PM2 logs (ultimele 100 linii)
pm2 logs auto-platform --lines 100

# Nginx access logs
sudo tail -f /var/log/nginx/auto-platform-access.log

# Nginx error logs
sudo tail -f /var/log/nginx/auto-platform-error.log

# System logs
sudo journalctl -u nginx -f
```

### Restart Services

```bash
# Restart app (zero downtime)
pm2 reload auto-platform

# Restart Nginx
sudo systemctl restart nginx

# Restart PostgreSQL
sudo systemctl restart postgresql
```

---

## 🚨 Troubleshooting

### Site nu se încarcă

```bash
# Check PM2
pm2 status
pm2 logs auto-platform --err

# Check Nginx
sudo nginx -t
sudo systemctl status nginx

# Check ports
sudo lsof -i :3000
sudo lsof -i :80
sudo lsof -i :443
```

### Database connection failed

```bash
# Check PostgreSQL
sudo systemctl status postgresql

# Check connection
psql -U autoplat -h localhost -d autoplat

# Check .env
cat .env.production | grep DATABASE_URL
```

### 502 Bad Gateway

```bash
# Check app is running
pm2 status

# Check upstream
curl http://localhost:3000/api/health

# Restart
pm2 restart auto-platform
sudo systemctl restart nginx
```

### SSL errors

```bash
# Renew certificate
sudo certbot renew

# Check certificate
sudo certbot certificates

# Test SSL
openssl s_client -connect clickanunt.ro:443
```

---

## 📊 Monitoring URLs

- **Site:** https://clickanunt.ro
- **Health:** https://clickanunt.ro/api/health
- **Admin:** https://clickanunt.ro/admin/dashboard
- **Cloudflare:** https://dash.cloudflare.com
- **PM2:** `pm2 monit` (pe server)

---

## 🔐 Security Checklist

- ✅ Firewall configurat (UFW)
- ✅ fail2ban activ
- ✅ SSL/TLS activ
- ✅ HSTS enabled
- ✅ Security headers (via Nginx)
- ✅ Rate limiting (Cloudflare + Nginx)
- ✅ DDoS protection (Cloudflare)
- ✅ Database backups automate
- ✅ Strong passwords
- ✅ Keys protejate (chmod 600)
- ✅ .env nu este în git
- ✅ CORS configurate corect
- ✅ Input validation
- ✅ SQL injection protection (Prisma)
- ✅ XSS protection

---

## 📞 Support

**Email:** contact@clickanunt.ro  
**Phone:** +40 784 712 496

**Documentație:**
- Netopia: https://netopia-payments.com/documentatie-tehnica
- Stripe: https://stripe.com/docs
- Cloudflare: https://developers.cloudflare.com
- Next.js: https://nextjs.org/docs
- Prisma: https://www.prisma.io/docs

---

## 🎉 Post-Deploy

După deploy cu succes:

1. ✅ Testează toate funcționalitățile
2. ✅ Testează o plată în sandbox
3. ✅ Configurează monitoring alerts
4. ✅ Setup backup notifications
5. ✅ Configurează Google Analytics (opțional)
6. ✅ Submit sitemap la Google: https://clickanunt.ro/sitemap.xml
7. ✅ Testează SEO: https://search.google.com/search-console
8. ✅ Testează viteza: https://pagespeed.web.dev

**Platformă gata de producție! 🚀**

# ClickAnunț - Deployment Guide

## 🚀 Deployment pe www.clickanunt.ro

### Pre-requisites
- Domeniu: www.clickanunt.ro (✅ înregistrat)
- Server VPS/Cloud cu Node.js 18+
- PostgreSQL database
- SSL Certificate (Let's Encrypt recomandat)

### 1. Setup Server

```bash
# Update sistem
sudo apt update && sudo apt upgrade -y

# Instalează Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Instalează PM2 pentru process management
sudo npm install -g pm2

# Instalează PostgreSQL
sudo apt install postgresql postgresql-contrib
```

### 2. Setup Database

```bash
# Conectează la PostgreSQL
sudo -u postgres psql

# Creează database și user
CREATE DATABASE autoplat;
CREATE USER autoplat WITH ENCRYPTED PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE autoplat TO autoplat;
\q
```

### 3. Deployment Steps

```bash
# Clonează proiectul pe server
cd /var/www
git clone <your-repo-url> clickanunt
cd clickanunt

# Instalează dependințe
npm install

# Creează .env.production
nano .env.production
# Adaugă variabilele de mediu (vezi .env.production template)

# Rulează migrări Prisma
npx prisma generate
npx prisma migrate deploy

# Creează admin user
export DATABASE_URL="postgresql://autoplat:password@localhost:5432/autoplat"
npx ts-node scripts/create-admin.ts

# Build pentru producție
npm run build

# Start cu PM2
pm2 start npm --name "clickanunt" -- start
pm2 save
pm2 startup
```

### 4. Nginx Configuration

```nginx
# /etc/nginx/sites-available/clickanunt.ro

server {
    listen 80;
    server_name www.clickanunt.ro clickanunt.ro;
    return 301 https://www.clickanunt.ro$request_uri;
}

server {
    listen 443 ssl http2;
    server_name www.clickanunt.ro;

    ssl_certificate /etc/letsencrypt/live/clickanunt.ro/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/clickanunt.ro/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

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
    }
}

server {
    listen 443 ssl http2;
    server_name clickanunt.ro;
    return 301 https://www.clickanunt.ro$request_uri;
    
    ssl_certificate /etc/letsencrypt/live/clickanunt.ro/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/clickanunt.ro/privkey.pem;
}
```

```bash
# Activează site
sudo ln -s /etc/nginx/sites-available/clickanunt.ro /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. SSL Certificate (Let's Encrypt)

```bash
# Instalează Certbot
sudo apt install certbot python3-certbot-nginx

# Obține certificat SSL
sudo certbot --nginx -d clickanunt.ro -d www.clickanunt.ro

# Auto-renewal (deja configurat automat)
sudo certbot renew --dry-run
```

### 6. Setup Email (contact@clickanunt.ro)

Pentru Gmail SMTP:
1. Activează 2FA pe contul Google
2. Generează "App Password": https://myaccount.google.com/apppasswords
3. Folosește App Password în .env.production în loc de parola normală

### 7. Monitoring & Logs

```bash
# Vezi logs aplicație
pm2 logs clickanunt

# Status aplicație
pm2 status

# Restart aplicație
pm2 restart clickanunt

# Monitor
pm2 monit
```

### 8. DNS Configuration

La provider-ul de domeniu (ex: GoDaddy, Namecheap):

```
A Record:
@       →  <SERVER_IP>
www     →  <SERVER_IP>

CNAME Records (optional):
mail    →  mail.clickanunt.ro
```

### 9. Backup Strategy

```bash
# Backup database
pg_dump -U autoplat autoplat > backup-$(date +%Y%m%d).sql

# Cron job pentru backup zilnic
crontab -e
# Adaugă: 0 2 * * * pg_dump -U autoplat autoplat > /backups/clickanunt-$(date +\%Y\%m\%d).sql
```

## 🔄 Update Application

```bash
cd /var/www/clickanunt
git pull
npm install
npm run build
npx prisma migrate deploy
pm2 restart clickanunt
```

## 📊 Performance Optimization

- ✅ CDN pentru imagini (Cloudflare recomandat)
- ✅ Redis pentru caching (opțional)
- ✅ Image optimization cu Next.js Image
- ✅ Gzip compression activată în Nginx

## 🔐 Security Checklist

- ✅ SSL/HTTPS activat
- ✅ Firewall configurat (UFW)
- ✅ Rate limiting în Nginx
- ✅ Regular updates (security patches)
- ✅ Strong database passwords
- ✅ Environment variables securizate

## 📞 Contact Support

- Email: contact@clickanunt.ro
- Telefon: +40 784 712 496
- Website: www.clickanunt.ro

---

**Status**: ✅ Ready for deployment
**Ultima actualizare**: 3 Februarie 2026

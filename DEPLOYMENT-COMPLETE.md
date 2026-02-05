# 🚀 ClickAnunț - Complete Deployment Guide

## 📋 Quick Start Deployment Checklist

### Phase 1: Local Preparation (PE COMPUTER-UL TĂU)

1. **Verifică că totul este gata:**
```bash
cd /Users/ind1scutabil/projects/auto-platform
./pre-deploy-check.sh
```

2. **Configurează DNS-ul:**
```bash
./setup-dns.sh
```
Urmează instrucțiunile pentru provider-ul tău de domeniu.

---

### Phase 2: Server Setup (PE SERVER VPS)

#### 🖥️ Obține un Server VPS

**Recomandări Provider România:**
- **Contabo** (https://contabo.com) - 4€/lună
- **Hetzner** (https://www.hetzner.com) - 4€/lună  
- **OVH** (https://www.ovh.ro) - din 5€/lună
- **DigitalOcean** (https://digitalocean.com) - $6/lună

**Specificații minime:**
- CPU: 2 cores
- RAM: 2GB
- Storage: 20GB SSD
- OS: Ubuntu 22.04 LTS

#### 📥 Conectare și Setup Inițial

1. **Conectează-te la server:**
```bash
ssh root@IP_SERVER_TĂU
```

2. **Transfer scripturi setup pe server:**
```bash
# Pe computer-ul tău local
scp setup-server.sh root@IP_SERVER_TĂU:/root/
```

3. **Rulează setup complet pe server:**
```bash
# Pe server
cd /root
chmod +x setup-server.sh
sudo ./setup-server.sh
```

Scriptul instalează automat:
- ✅ Node.js 18.x
- ✅ PostgreSQL
- ✅ PM2
- ✅ Nginx
- ✅ Certbot (pentru SSL)
- ✅ Firewall (UFW)

**IMPORTANT:** Notează parola bazei de date generată!

---

### Phase 3: Deployment Application

#### 📦 Transfer Aplicație pe Server

**Opțiunea 1: Via Git (Recomandat)**
```bash
# Pe server
cd /var/www/clickanunt
git clone https://github.com/USERNAME/clickanunt.git .
```

**Opțiunea 2: Via rsync**
```bash
# Pe computer-ul tău
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  /Users/ind1scutabil/projects/auto-platform/ \
  root@IP_SERVER_TĂU:/var/www/clickanunt/
```

#### ⚙️ Configurare Aplicație pe Server

1. **Creează .env.production pe server:**
```bash
cd /var/www/clickanunt
nano .env.production
```

Adaugă:
```env
DATABASE_URL="postgresql://autoplat:ClickAnunt2026!Secure@localhost:5432/autoplat?schema=public"
NEXT_PUBLIC_SITE_URL="https://www.clickanunt.ro"
NEXT_PUBLIC_SITE_NAME="ClickAnunț"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="contact@clickanunt.ro"
SMTP_PASS="Gz082306gz082306@"
CONTACT_EMAIL="contact@clickanunt.ro"
CONTACT_PHONE="+40784712496"
NODE_ENV="production"
```

2. **Transfer și rulează deployment:**
```bash
# Transfer scripturi deployment
scp full-deploy.sh setup-nginx.sh setup-ssl.sh ecosystem.config.js \
  root@IP_SERVER_TĂU:/var/www/clickanunt/

# Pe server
cd /var/www/clickanunt
chmod +x *.sh
./full-deploy.sh
```

Scriptul va:
- ✅ Instala dependențe
- ✅ Genera Prisma client
- ✅ Rula migrări database
- ✅ Crea admin user
- ✅ Build Next.js
- ✅ Configura PM2
- ✅ Setup Nginx
- ✅ Instala SSL (opțional acum)

---

### Phase 4: DNS Configuration

#### 🌐 Configurare DNS la Provider

**Exemple pentru provideri populari:**

##### GoDaddy
1. Login → My Products → Domains
2. Click pe clickanunt.ro → DNS
3. Add Record:
   - Type: A, Host: @, Points to: IP_SERVER_TĂU
   - Type: A, Host: www, Points to: IP_SERVER_TĂU

##### Namecheap
1. Login → Domain List → Manage
2. Advanced DNS → Add New Record:
   - Type: A Record, Host: @, Value: IP_SERVER_TĂU
   - Type: A Record, Host: www, Value: IP_SERVER_TĂU

##### Cloudflare
1. Add Site → clickanunt.ro
2. Change nameservers la registrar
3. DNS → Add record:
   - Type: A, Name: @, IPv4: IP_SERVER_TĂU, Proxy: ON
   - Type: A, Name: www, IPv4: IP_SERVER_TĂU, Proxy: ON

#### ⏰ Verificare DNS

```bash
# Verifică DNS propagation
dig clickanunt.ro
dig www.clickanunt.ro

# Online tools
# https://dnschecker.org
# https://www.whatsmydns.net
```

**Timp de așteptare:** 15 minute - 48 ore (de obicei 2-4 ore)

---

### Phase 5: SSL Certificate Setup

După ce DNS-ul propagă (ambele domenii returnează IP-ul serverului):

```bash
# Pe server
cd /var/www/clickanunt
sudo ./setup-ssl.sh
```

Sau manual cu Certbot:
```bash
sudo certbot --nginx -d clickanunt.ro -d www.clickanunt.ro
```

---

## 🔍 Verificări Post-Deployment

### Testează aplicația:

```bash
# Pe server - verifică status
pm2 status
pm2 logs clickanunt

# Verifică Nginx
sudo nginx -t
sudo systemctl status nginx

# Verifică database
psql -U autoplat -d autoplat -c "SELECT COUNT(*) FROM \"User\";"
```

### Accesează site-ul:

- **Homepage:** https://www.clickanunt.ro
- **Admin Dashboard:** https://www.clickanunt.ro/admin/dashboard
- **Login:** 
  - Email: daniel.enoiu29@gmail.com
  - Password: Gz082306gz082306@

---

## 🛠️ Comenzi Utile

### PM2 Management
```bash
pm2 status              # Vezi status aplicație
pm2 logs clickanunt     # Vezi logs live
pm2 restart clickanunt  # Restart aplicație
pm2 stop clickanunt     # Oprește aplicație
pm2 monit              # Monitor resurse
```

### Database Management
```bash
# Conectare la database
psql -U autoplat -d autoplat

# Backup database
pg_dump -U autoplat autoplat > backup_$(date +%Y%m%d).sql

# Restore database
psql -U autoplat -d autoplat < backup_20260203.sql
```

### Nginx Management
```bash
sudo nginx -t              # Test configurație
sudo systemctl reload nginx # Reload configurație
sudo systemctl restart nginx # Restart Nginx
sudo tail -f /var/log/nginx/clickanunt-error.log # Vezi errors
```

### SSL Certificate
```bash
sudo certbot certificates  # Vezi certificatele
sudo certbot renew        # Reînnoiește manual
sudo certbot renew --dry-run # Test renewal
```

---

## 🔄 Update Application

Când vrei să faci update la aplicație:

```bash
# Pe server
cd /var/www/clickanunt

# Pull latest changes (dacă folosești git)
git pull origin main

# Sau transfer fișiere noi cu rsync
# (de pe computer-ul tău)
rsync -avz --exclude 'node_modules' --exclude '.next' \
  /Users/ind1scutabil/projects/auto-platform/ \
  root@IP_SERVER_TĂU:/var/www/clickanunt/

# Pe server - rebuild și restart
npm install
npm run build
pm2 restart clickanunt
```

---

## 📊 Monitoring & Maintenance

### Setup Monitoring (Opțional)

```bash
# Instalare monitoring tools
npm install -g pm2-logrotate
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Backup Automat

Creează script backup la `/root/backup-clickanunt.sh`:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/root/backups"
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U autoplat autoplat > $BACKUP_DIR/db_$DATE.sql

# Backup uploads (dacă ai)
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/www/clickanunt/public/uploads

# Păstrează doar ultimele 7 backup-uri
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

Setup cron pentru backup zilnic:
```bash
crontab -e
# Adaugă:
0 2 * * * /root/backup-clickanunt.sh
```

---

## 🆘 Troubleshooting

### Site-ul nu se încarcă

1. **Verifică PM2:**
```bash
pm2 status
pm2 logs clickanunt --lines 50
```

2. **Verifică Nginx:**
```bash
sudo systemctl status nginx
sudo tail -f /var/log/nginx/clickanunt-error.log
```

3. **Verifică DNS:**
```bash
dig www.clickanunt.ro
```

### Erori Database

```bash
# Verifică conexiune
psql -U autoplat -d autoplat

# Rulează migrări manual
cd /var/www/clickanunt
npx prisma migrate deploy
```

### SSL Issues

```bash
# Re-issue certificate
sudo certbot --nginx -d clickanunt.ro -d www.clickanunt.ro --force-renewal
```

---

## 📞 Support

- **Email:** contact@clickanunt.ro
- **Telefon:** +40 784 712 496
- **Admin:** daniel.enoiu29@gmail.com

---

## ✅ Deployment Flowchart

```
1. Computer Local
   └─> ./pre-deploy-check.sh
   └─> ./setup-dns.sh (configurare DNS)

2. Procură VPS Server
   └─> Ubuntu 22.04, 2GB RAM, 20GB SSD

3. Server Setup
   └─> ssh root@SERVER_IP
   └─> sudo ./setup-server.sh

4. Transfer Aplicație
   └─> git clone SAU rsync
   └─> creează .env.production

5. Deploy
   └─> ./full-deploy.sh
   
6. Verifică DNS
   └─> dig clickanunt.ro
   └─> Așteaptă propagare (2-4 ore)

7. Setup SSL
   └─> sudo ./setup-ssl.sh

8. Done! 🎉
   └─> https://www.clickanunt.ro
```

---

**Status:** ✅ READY FOR DEPLOYMENT
**Version:** 1.0.0
**Updated:** 3 February 2026

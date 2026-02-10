# 🚀 DEPLOYMENT RAPID - www.clickanunt.ro

## Status Actual
- ✅ Cod fără erori (toate fix-urile aplicate)
- ✅ In-memory database funcțional
- ✅ Authentication (register/login) funcțional
- ✅ Homepage completă
- ✅ Safari compatibility (CORS)
- ✅ Domeniu: **www.clickanunt.ro**
- ✅ Server: **46.225.69.155** (Hetzner)

---

## 🎯 DEPLOYMENT ÎN 3 PAȘI

### Pasul 1: Verifică Serverul

```bash
# Test SSH
ssh root@46.225.69.155 "echo 'Server OK'"

# Verifică dacă serverul e pregătit
ssh root@46.225.69.155 "which node npm pm2 nginx"
```

### Pasul 2: Configurează DNS (Cloudflare)

**Accesează:** https://dash.cloudflare.com

**DNS Records necesare:**
```
Type: A
Name: @
Content: 46.225.69.155
Proxy: ✅ Proxied (portocaliu)

Type: A  
Name: www
Content: 46.225.69.155
Proxy: ✅ Proxied (portocaliu)
```

**Verificare:**
```bash
dig +short www.clickanunt.ro
dig +short clickanunt.ro
```

### Pasul 3: Deploy Aplicație

```bash
# Rulează scriptul de deploy
./deploy-clickanunt.sh
```

**SAU manual:**

```bash
# 1. Build local
npm install
npx prisma generate
npm run build

# 2. Upload pe server
ssh root@46.225.69.155 "mkdir -p /var/www/clickanunt"

rsync -avz --exclude='node_modules' --exclude='.git' \
  ./ root@46.225.69.155:/var/www/clickanunt/

# 3. Install și start pe server
ssh root@46.225.69.155 << 'EOF'
cd /var/www/clickanunt
npm ci --production
npx prisma migrate deploy
pm2 restart clickanunt || pm2 start npm --name clickanunt -- start
pm2 save
systemctl restart nginx
EOF
```

---

## 🔧 Configurare Server (Doar Prima Dată)

### Instalare Software

```bash
ssh root@46.225.69.155

# Update sistem
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PM2
npm install -g pm2

# Install Nginx
apt install -y nginx

# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Install Certbot pentru SSL
apt install -y certbot python3-certbot-nginx
```

### Configurare PostgreSQL

```bash
sudo -u postgres psql << 'EOF'
CREATE DATABASE clickanunt_prod;
CREATE USER clickanunt_user WITH ENCRYPTED PASSWORD 'ClickPass2026Secure!';
GRANT ALL PRIVILEGES ON DATABASE clickanunt_prod TO clickanunt_user;
\c clickanunt_prod
GRANT ALL ON SCHEMA public TO clickanunt_user;
EOF
```

### Configurare Nginx

```bash
cat > /etc/nginx/sites-available/clickanunt << 'EOF'
server {
    listen 80;
    server_name clickanunt.ro www.clickanunt.ro;
    
    # Redirect to www
    if ($host = clickanunt.ro) {
        return 301 https://www.clickanunt.ro$request_uri;
    }
    
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
        
        # Timeout pentru cereri long-polling
        proxy_read_timeout 86400;
    }
    
    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/clickanunt /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test și restart
nginx -t
systemctl restart nginx
```

### Setup SSL (Certbot)

```bash
# Asigură-te că DNS-ul pointează către server
certbot --nginx -d clickanunt.ro -d www.clickanunt.ro --non-interactive --agree-tos -m contact@clickanunt.ro
```

---

## 📊 Verificare După Deploy

### 1. Check Website

```bash
# Homepage
curl -I https://www.clickanunt.ro

# Health API
curl https://www.clickanunt.ro/api/health

# Test registration
curl -X POST https://www.clickanunt.ro/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test User"}'
```

### 2. Check Logs

```bash
# Application logs
ssh root@46.225.69.155 "pm2 logs clickanunt --lines 100"

# Nginx logs
ssh root@46.225.69.155 "tail -f /var/log/nginx/access.log"
ssh root@46.225.69.155 "tail -f /var/log/nginx/error.log"
```

### 3. Check Status

```bash
ssh root@46.225.69.155 << 'EOF'
echo "=== PM2 Status ==="
pm2 status

echo "=== Nginx Status ==="
systemctl status nginx

echo "=== PostgreSQL Status ==="
systemctl status postgresql

echo "=== Disk Usage ==="
df -h

echo "=== Memory Usage ==="
free -h
EOF
```

---

## 🔄 Update Rapid (Deploy Ulterior)

```bash
# Build local
npm run build

# Upload și restart
./deploy-clickanunt.sh
```

**SAU:**

```bash
ssh root@46.225.69.155 << 'EOF'
cd /var/www/clickanunt
git pull origin main  # dacă folosești git
npm install
npm run build
npx prisma migrate deploy
pm2 restart clickanunt
EOF
```

---

## 🆘 Troubleshooting

### Website nu se încarcă

```bash
# Check Nginx
ssh root@46.225.69.155 "systemctl status nginx"

# Check aplicație
ssh root@46.225.69.155 "pm2 status"
ssh root@46.225.69.155 "pm2 logs clickanunt --lines 50"

# Restart all
ssh root@46.225.69.155 "pm2 restart clickanunt && systemctl restart nginx"
```

### Erori de database

```bash
# Check PostgreSQL
ssh root@46.225.69.155 "systemctl status postgresql"

# Test conexiune
ssh root@46.225.69.155 "sudo -u postgres psql -c '\l'"

# Run migrations
ssh root@46.225.69.155 "cd /var/www/clickanunt && npx prisma migrate deploy"
```

### SSL issues

```bash
# Renew SSL
ssh root@46.225.69.155 "certbot renew"

# Test SSL config
ssh root@46.225.69.155 "nginx -t"
```

---

## 📝 Comenzi Utile

```bash
# Restart aplicație
ssh root@46.225.69.155 "pm2 restart clickanunt"

# Stop aplicație
ssh root@46.225.69.155 "pm2 stop clickanunt"

# Logs în timp real
ssh root@46.225.69.155 "pm2 logs clickanunt"

# Restart Nginx
ssh root@46.225.69.155 "systemctl restart nginx"

# Monitor resurse
ssh root@46.225.69.155 "htop"
```

---

## ✅ Checklist Final

- [ ] DNS configurat corect (A records pentru @ și www)
- [ ] Server pregătit (Node.js, PM2, Nginx, PostgreSQL)
- [ ] SSL instalat (certbot)
- [ ] .env.production configurat cu DATABASE_URL corect
- [ ] Build-ul local rulează fără erori
- [ ] Aplicația deployed și pornită (PM2)
- [ ] Nginx proxează către aplicație
- [ ] Website accesibil la https://www.clickanunt.ro
- [ ] API endpoints funcționează
- [ ] Database migrations rulate

---

## 🎉 Success!

După deployment:
- 🌐 **Website:** https://www.clickanunt.ro
- 📊 **Health:** https://www.clickanunt.ro/api/health
- 🔐 **Admin:** https://www.clickanunt.ro/admin
- 📧 **Email:** contact@clickanunt.ro

**Server:** 46.225.69.155 (Hetzner)

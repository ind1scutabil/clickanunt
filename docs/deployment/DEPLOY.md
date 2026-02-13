# Production Deployment Guide

Complete guide for deploying ClickAnunț to production.

## Prerequisites

- Ubuntu 20.04+ server
- Domain pointing to server IP
- PostgreSQL 14+ installed
- Node.js 20+ installed
- Nginx installed
- PM2 installed globally

## 1. Server Setup

### Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install Nginx
sudo apt install nginx -y

# Install PM2
sudo npm install -g pm2
```

### Setup PostgreSQL

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE autoplat;
CREATE USER autoplat WITH ENCRYPTED PASSWORD 'YOUR_SECURE_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE autoplat TO autoplat;
\q
```

## 2. Application Deployment

### Clone and Setup

```bash
# Create deployment directory
sudo mkdir -p /var/www/clickanunt
sudo chown $USER:$USER /var/www/clickanunt

# Clone repository (or upload files)
cd /var/www/clickanunt

# Install dependencies
npm ci --production

# Setup environment
cp .env.example .env
nano .env  # Configure all variables
```

### Environment Configuration

Edit `/var/www/clickanunt/.env`:

```env
# Database
DATABASE_URL="postgresql://autoplat:YOUR_PASSWORD@localhost:5432/autoplat"

# Security
JWT_SECRET="YOUR_RANDOM_JWT_SECRET_32_CHARS_MIN"
NEXT_PUBLIC_TURNSTILE_SITE_KEY="YOUR_CLOUDFLARE_SITE_KEY"
TURNSTILE_SECRET_KEY="YOUR_CLOUDFLARE_SECRET_KEY"

# Stripe
STRIPE_SECRET_KEY="sk_live_YOUR_STRIPE_KEY"
STRIPE_WEBHOOK_SECRET="whsec_YOUR_WEBHOOK_SECRET"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_YOUR_PUB_KEY"

# Email (SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="ClickAnunț <noreply@clickanunt.ro>"

# App URLs
NEXT_PUBLIC_APP_URL="https://www.clickanunt.ro"
NEXT_PUBLIC_BASE_URL="https://www.clickanunt.ro"

# Optional: OpenAI for moderation
OPENAI_API_KEY="sk-proj-YOUR_KEY"
```

### Database Migration

```bash
cd /var/www/clickanunt
npx prisma migrate deploy
npx prisma generate
```

### Build Application

```bash
cd /var/www/clickanunt
npm run build
```

## 3. PM2 Configuration

### Start Application

```bash
cd /var/www/clickanunt
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### PM2 Commands

```bash
# Status
pm2 status

# Logs
pm2 logs clickanunt

# Restart
pm2 restart clickanunt --update-env

# Stop
pm2 stop clickanunt

# Monitor
pm2 monit
```

## 4. Nginx Configuration

### Create Nginx Config

Create `/etc/nginx/sites-available/clickanunt`:

```nginx
server {
    listen 80;
    server_name clickanunt.ro www.clickanunt.ro;

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

    location /_next/static {
        proxy_pass http://localhost:3000/_next/static;
        proxy_cache_valid 200 60m;
        proxy_cache_bypass $http_cache_control;
        add_header Cache-Control "public, max-age=3600, immutable";
    }
}
```

### Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/clickanunt /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### SSL with Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d clickanunt.ro -d www.clickanunt.ro
```

## 5. Cloudflare Setup

### DNS Configuration

1. Add A record: `clickanunt.ro` → `YOUR_SERVER_IP`
2. Add A record: `www.clickanunt.ro` → `YOUR_SERVER_IP`
3. Enable proxy (orange cloud)

### Cloudflare Settings

**SSL/TLS**:
- Mode: Full (strict)
- Minimum TLS: 1.2

**Caching**:
- Browser Cache TTL: 4 hours
- Development Mode: OFF (enable for testing)

**Speed**:
- Brotli: ON
- Auto Minify: CSS, JS, HTML

**Turnstile**:
1. Go to Turnstile dashboard
2. Create widget for domain
3. Copy Site Key and Secret Key to .env
4. Configure domains: `clickanunt.ro`, `www.clickanunt.ro`

## 6. Post-Deployment

### Create Admin User

```bash
cd /var/www/clickanunt
node -e "
const { db } = require('./lib/db');
const { hashPassword } = require('./lib/auth');
(async () => {
  const hash = await hashPassword('YOUR_ADMIN_PASSWORD');
  await db.user.create({
    data: {
      email: 'admin@clickanunt.ro',
      password: hash,
      role: 'admin',
      emailVerified: true,
      name: 'Admin',
      accountType: 'personal',
      trustScore: 100
    }
  });
  console.log('Admin created');
  process.exit(0);
})();
"
```

### Verify Deployment

1. Visit https://www.clickanunt.ro
2. Check `/api/turnstile/status` - should return configured: true
3. Test login with admin account
4. Check PM2 logs: `pm2 logs clickanunt`

### Setup Monitoring

```bash
# PM2 monitoring
pm2 install pm2-logrotate

# Configure logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

## 7. Updates and Maintenance

### Deploy Updates

```bash
cd /var/www/clickanunt

# Pull latest code
git pull origin main  # or upload new files

# Install dependencies
npm ci --production

# Run migrations
npx prisma migrate deploy
npx prisma generate

# Build
npm run build

# Restart with updated environment
pm2 restart clickanunt --update-env

# Check logs
pm2 logs clickanunt --lines 50
```

### Cloudflare Cache Purge

After deployment, purge Cloudflare cache:
1. Go to Cloudflare Dashboard
2. Caching → Configuration
3. Click "Purge Everything"

Or use API:
```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

### Database Backup

```bash
# Backup
pg_dump -U autoplat autoplat > backup_$(date +%Y%m%d).sql

# Restore
psql -U autoplat autoplat < backup_20260212.sql
```

## 8. Troubleshooting

### Application Won't Start

```bash
# Check logs
pm2 logs clickanunt --err

# Check database connection
psql -U autoplat -d autoplat -c "SELECT 1;"

# Verify environment
cd /var/www/clickanunt && node -e "console.log(process.env.DATABASE_URL)"
```

### Cloudflare Issues

- Enable Development Mode to bypass cache
- Check Turnstile keys are correct
- Verify SSL mode is "Full (strict)"

### Database Connection Issues

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

### Performance Issues

```bash
# Check PM2 memory
pm2 monit

# Restart if needed
pm2 restart clickanunt --update-env

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

## 9. Security Checklist

- [ ] SSL certificate installed and auto-renewing
- [ ] Firewall configured (UFW)
- [ ] PostgreSQL only accessible locally
- [ ] Strong passwords for database
- [ ] Environment variables secured
- [ ] Regular backups scheduled
- [ ] PM2 log rotation enabled
- [ ] Cloudflare proxy enabled
- [ ] Rate limiting configured
- [ ] 2FA enabled for admin

## Support

For deployment issues:
- Check logs: `pm2 logs clickanunt`
- Email: admin@clickanunt.ro

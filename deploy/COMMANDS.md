# 🔧 Useful Commands - Auto Platform

## Development

### Start Server
```bash
npm run dev                  # Development server with hot reload
npm run dev -- --turbo      # With Turbopack (faster)
npm run build               # Production build
npm run start               # Start production server
```

### Database
```bash
# Migrations
npx prisma migrate dev                    # Create and apply migration
npx prisma migrate dev --name add_users   # Named migration
npx prisma migrate deploy                 # Apply migrations (production)
npx prisma migrate reset --force          # Reset database (DEV ONLY!)

# Prisma Client
npx prisma generate                       # Generate Prisma client
npx prisma studio                         # Open Prisma Studio GUI

# Database inspection
npx prisma db pull                        # Pull schema from database
npx prisma db push                        # Push schema to database (no migration)

# Seeding
npm run seed                              # Seed database with test data
```

### TypeScript
```bash
npx tsc --noEmit           # Check for TypeScript errors
npx tsc --noEmit --watch   # Watch mode
```

### Linting
```bash
npm run lint               # Run ESLint
npm run lint -- --fix      # Fix auto-fixable issues
```

---

## Production

### PM2 Process Management
```bash
# Start
pm2 start ecosystem.config.js --env production
pm2 start npm --name "auto-platform" -- start

# Stop/Restart
pm2 stop auto-platform
pm2 restart auto-platform
pm2 reload auto-platform              # Zero-downtime reload
pm2 delete auto-platform

# Monitoring
pm2 status                            # List all processes
pm2 list
pm2 monit                            # Live monitoring
pm2 logs auto-platform               # View logs
pm2 logs auto-platform --lines 100   # Last 100 lines
pm2 logs auto-platform --err         # Error logs only

# Startup
pm2 startup                          # Generate startup script
pm2 save                            # Save current process list
pm2 resurrect                       # Restore saved processes

# Management
pm2 flush                           # Clear all logs
pm2 reloadLogs                      # Reload logs
pm2 reset auto-platform             # Reset restart counter
```

### Nginx
```bash
# Test configuration
sudo nginx -t

# Reload
sudo nginx -s reload
sudo systemctl reload nginx

# Restart
sudo systemctl restart nginx

# Status
sudo systemctl status nginx

# Logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/auto-platform-access.log
sudo tail -f /var/log/nginx/auto-platform-error.log

# Enable/Disable site
sudo ln -s /etc/nginx/sites-available/auto-platform /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/auto-platform
```

### SSL Certificates (Let's Encrypt)
```bash
# Obtain certificate
sudo certbot --nginx -d clickanunt.ro -d www.clickanunt.ro
sudo certbot certonly --nginx -d clickanunt.ro

# Renew
sudo certbot renew
sudo certbot renew --dry-run        # Test renewal

# List certificates
sudo certbot certificates

# Revoke certificate
sudo certbot revoke --cert-path /etc/letsencrypt/live/clickanunt.ro/cert.pem

# Delete certificate
sudo certbot delete --cert-name clickanunt.ro
```

### PostgreSQL
```bash
# Connect
psql -U autoplat -h localhost autoplat
sudo -u postgres psql

# Database commands (in psql)
\l                                   # List databases
\c autoplat                         # Connect to database
\dt                                 # List tables
\d users                            # Describe table
\du                                 # List users
\q                                  # Quit

# Backup
pg_dump -U autoplat -h localhost autoplat > backup.sql
pg_dump -U autoplat -h localhost autoplat | gzip > backup.sql.gz

# Restore
psql -U autoplat -h localhost autoplat < backup.sql
gunzip < backup.sql.gz | psql -U autoplat -h localhost autoplat

# User management
sudo -u postgres psql -c "CREATE USER autoplat WITH PASSWORD 'password';"
sudo -u postgres psql -c "ALTER USER autoplat WITH PASSWORD 'newpassword';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE autoplat TO autoplat;"

# Service management
sudo systemctl status postgresql
sudo systemctl restart postgresql
sudo systemctl stop postgresql
sudo systemctl start postgresql
```

### System Monitoring
```bash
# Disk space
df -h                              # All filesystems
df -h /                           # Root filesystem
du -sh /var/www/auto-platform     # Directory size
du -sh /var/www/auto-platform/*   # Subdirectories

# Memory
free -h                           # Human readable
free -m                          # In MB

# CPU & Processes
top                              # Process monitor
htop                            # Better process monitor
ps aux | grep node              # Find Node processes
ps aux | grep nginx             # Find Nginx processes

# Network
netstat -tulpn                  # All listening ports
lsof -i :3000                   # What's using port 3000
lsof -i :80                     # What's using port 80
lsof -i :443                    # What's using port 443

# Kill processes
kill PID                        # Graceful
kill -9 PID                     # Force
pkill -f "node"                 # Kill by name
lsof -ti:3000 | xargs kill -9   # Kill what's on port 3000
```

### Firewall (UFW)
```bash
# Status
sudo ufw status
sudo ufw status verbose

# Enable/Disable
sudo ufw enable
sudo ufw disable

# Rules
sudo ufw allow 22/tcp           # SSH
sudo ufw allow 80/tcp           # HTTP
sudo ufw allow 443/tcp          # HTTPS
sudo ufw allow from 1.2.3.4     # Specific IP
sudo ufw delete allow 80/tcp    # Delete rule

# Reset
sudo ufw reset
```

### Logs
```bash
# Application logs
pm2 logs auto-platform
pm2 logs --lines 100
tail -f /var/log/auto-platform/app.log

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# System logs
sudo journalctl -u nginx -f
sudo journalctl -xe

# Search logs
grep "error" /var/log/nginx/error.log
grep "500" /var/log/nginx/access.log
```

---

## Backup & Restore

### Manual Backup
```bash
# Application
cd /var/www
sudo tar -czf auto-platform_backup_$(date +%Y%m%d).tar.gz auto-platform/

# Database
pg_dump -U autoplat -h localhost autoplat | gzip > db_backup_$(date +%Y%m%d).sql.gz

# Full system backup
sudo rsync -avz /var/www/auto-platform/ /backup/auto-platform/
```

### Automated Backup (Cron)
```bash
# Edit crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * /var/www/auto-platform/deploy/backup.sh

# List cron jobs
crontab -l

# Remove all cron jobs
crontab -r
```

### Restore
```bash
# Application
cd /var/www
sudo tar -xzf auto-platform_backup_20260205.tar.gz

# Database
gunzip < db_backup_20260205.sql.gz | psql -U autoplat -h localhost autoplat

# Restart services
pm2 restart auto-platform
sudo systemctl restart nginx
```

---

## Deployment

### Quick Deploy
```bash
# From local machine
bash deploy/deploy.sh production
```

### Manual Deploy
```bash
# On server
cd /var/www/auto-platform

# Pull latest code
git pull origin main

# Install dependencies
npm ci --production

# Run migrations
npx prisma migrate deploy
npx prisma generate

# Build
npm run build

# Reload PM2
pm2 reload ecosystem.config.js --env production

# Verify
pm2 status
curl http://localhost:3000/api/health
```

### Zero-Downtime Deploy
```bash
# Build locally
npm run build

# Upload to server
scp -r .next appuser@server:/var/www/auto-platform/

# On server
pm2 reload auto-platform
```

---

## Troubleshooting

### Port Already in Use
```bash
# Find process
lsof -ti:3000

# Kill process
lsof -ti:3000 | xargs kill -9

# Or
pkill -f "next dev"
```

### Clear Cache
```bash
# Next.js
rm -rf .next
rm -rf node_modules/.cache

# Node modules
rm -rf node_modules
npm install

# Prisma
rm -rf node_modules/@prisma
npx prisma generate
```

### Database Connection Issues
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -U autoplat -h localhost -d autoplat -c "SELECT 1;"

# Check DATABASE_URL
echo $DATABASE_URL
cat .env.production | grep DATABASE_URL

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### 502 Bad Gateway
```bash
# Check PM2
pm2 status
pm2 logs auto-platform --err

# Check if app is running on 3000
curl http://localhost:3000/api/health

# Restart everything
pm2 restart auto-platform
sudo systemctl restart nginx
```

### High Memory Usage
```bash
# Check memory
free -h

# Find memory hogs
ps aux --sort=-%mem | head -10

# Restart PM2
pm2 restart auto-platform

# Clear PM2 logs
pm2 flush
```

---

## Testing

### API Testing
```bash
# Health check
curl http://localhost:3000/api/health

# Get listings
curl "http://localhost:3000/api/listings?limit=5"

# Create listing (with auth)
curl -X POST http://localhost:3000/api/listings \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user-uuid-here" \
  -d '{"title":"Test","category":"AUTO","price":1000}'

# Check response time
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/health
```

### Load Testing
```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Test with 1000 requests, 10 concurrent
ab -n 1000 -c 10 http://localhost:3000/api/health

# Test POST endpoint
ab -n 100 -c 5 -p post.json -T application/json http://localhost:3000/api/listings
```

---

## Security

### Check SSL
```bash
# OpenSSL check
openssl s_client -connect clickanunt.ro:443

# Test SSL rating
# Visit: https://www.ssllabs.com/ssltest/
```

### Security Headers
```bash
curl -I https://clickanunt.ro | grep -i "security\|hsts\|csp"
```

### Update System
```bash
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get autoremove -y
```

### fail2ban
```bash
# Status
sudo systemctl status fail2ban

# Banned IPs
sudo fail2ban-client status
sudo fail2ban-client status sshd

# Unban IP
sudo fail2ban-client set sshd unbanip 1.2.3.4
```

---

## Quick Reference

### Important Files
- **App:** `/var/www/auto-platform/`
- **Nginx Config:** `/etc/nginx/sites-available/auto-platform`
- **SSL Certs:** `/etc/letsencrypt/live/clickanunt.ro/`
- **Logs:** `/var/log/auto-platform/`
- **Backups:** `/var/backups/auto-platform/`

### Important URLs
- **Site:** https://clickanunt.ro
- **Health:** https://clickanunt.ro/api/health
- **Admin:** https://clickanunt.ro/admin/dashboard

### Important Ports
- **3000** - Next.js application
- **80** - HTTP (Nginx)
- **443** - HTTPS (Nginx)
- **5432** - PostgreSQL

---

**📚 More Help:**
- [PRODUCTION-DEPLOY.md](PRODUCTION-DEPLOY.md)
- [API-DOCUMENTATION.md](../API-DOCUMENTATION.md)
- [DEPLOY-CHECKLIST.md](DEPLOY-CHECKLIST.md)

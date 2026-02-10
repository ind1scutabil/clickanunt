# ✅ Production Deploy Checklist

## Pre-Deploy (Local)

- [ ] **Code Review**
  - [ ] All features tested locally
  - [ ] No console.errors in browser
  - [ ] TypeScript compilation successful
  - [ ] Build succeeds: `npm run build`

- [ ] **Environment Variables**
  - [ ] .env.production created
  - [ ] DATABASE_URL configured
  - [ ] SMTP credentials configured
  - [ ] Netopia keys ready (sandbox first)
  - [ ] Site URLs updated (production domain)

- [ ] **Documentation**
  - [ ] Read PRODUCTION-DEPLOY.md
  - [ ] Read CLOUDFLARE-SETUP.md
  - [ ] API documentation reviewed

---

## Server Setup

- [ ] **VPS Hetzner**
  - [ ] Rent VPS CX21 (4GB RAM, 2 vCPU) - 8 EUR/month
  - [ ] Save IP address: `_________________`
  - [ ] SSH access confirmed: `ssh root@IP`

- [ ] **Initial Setup**
  - [ ] Upload setup-vps.sh: `scp deploy/setup-vps.sh root@IP:/tmp/`
  - [ ] Run setup: `bash /tmp/setup-vps.sh`
  - [ ] Change PostgreSQL password
  - [ ] Note new password: `_________________`

- [ ] **Security**
  - [ ] Firewall enabled (UFW)
  - [ ] fail2ban configured
  - [ ] SSH key authentication (optional but recommended)

---

## Domain & DNS

- [ ] **Domain Registration**
  - [ ] Domain registered: `clickanunt.ro`
  - [ ] Registrar: `_________________`

- [ ] **Cloudflare Setup**
  - [ ] Domain added to Cloudflare
  - [ ] Nameservers changed at registrar
  - [ ] DNS propagated (check: whatsmydns.net)
  - [ ] A record: @ → VPS_IP (proxied ☁️)
  - [ ] A record: www → VPS_IP (proxied ☁️)

- [ ] **Cloudflare Configuration**
  - [ ] SSL/TLS: Full (strict)
  - [ ] Always Use HTTPS: ON
  - [ ] Auto HTTPS Rewrites: ON
  - [ ] Firewall rules configured
  - [ ] Page rules configured
  - [ ] Auto minify: JS, CSS, HTML

---

## Nginx Setup

- [ ] **Configuration**
  - [ ] Copy nginx.conf: `scp deploy/nginx.conf root@IP:/tmp/`
  - [ ] Edit domain in config: `yourdomain.com` → `clickanunt.ro`
  - [ ] Move to sites-available: `/etc/nginx/sites-available/auto-platform`
  - [ ] Create symlink: `/etc/nginx/sites-enabled/`
  - [ ] Test config: `nginx -t`
  - [ ] Restart Nginx: `systemctl restart nginx`

- [ ] **SSL Certificate**
  - [ ] Run certbot: `certbot --nginx -d clickanunt.ro -d www.clickanunt.ro`
  - [ ] Test auto-renewal: `certbot renew --dry-run`
  - [ ] Verify SSL: https://www.ssllabs.com/ssltest/

---

## Application Deploy

- [ ] **Code Deploy**
  - [ ] Clone repo or use deploy.sh
  - [ ] Install dependencies: `npm ci --production`
  - [ ] Copy .env.production
  - [ ] Run migrations: `npx prisma migrate deploy`
  - [ ] Generate Prisma client: `npx prisma generate`
  - [ ] Build: `npm run build`

- [ ] **PM2 Setup**
  - [ ] Start app: `pm2 start ecosystem.config.js --env production`
  - [ ] Save config: `pm2 save`
  - [ ] Setup startup: `pm2 startup` (copy and run command)
  - [ ] Verify: `pm2 status`

- [ ] **Create Admin User**
  - [ ] Export DATABASE_URL
  - [ ] Run: `npx ts-node scripts/create-admin.ts`
  - [ ] Save admin credentials: `_________________`

---

## Payments Setup

- [ ] **Netopia Payments**
  - [ ] Create account: https://netopia-payments.com
  - [ ] Get API Key: `_________________`
  - [ ] Get POS Signature: `_________________`
  
- [ ] **Generate RSA Keys**
  - [ ] Generate private key: `openssl genrsa -out keys/netopia-private.pem 2048`
  - [ ] Generate public key: `openssl rsa -in keys/netopia-private.pem -pubout -out keys/netopia-public.pem`
  - [ ] Upload public key to Netopia dashboard
  
- [ ] **Netopia Configuration**
  - [ ] IPN URL: `https://clickanunt.ro/api/payments/netopia/ipn`
  - [ ] Success URL: `https://clickanunt.ro/payments/success`
  - [ ] Cancel URL: `https://clickanunt.ro/payments/cancel`
  
- [ ] **Test Payment**
  - [ ] Test in sandbox mode
  - [ ] Verify IPN notification received
  - [ ] Check payment status updates
  - [ ] Verify promotion activation

- [ ] **Stripe (Optional)**
  - [ ] Create account: https://stripe.com
  - [ ] Get API keys (test first)
  - [ ] Configure webhook endpoint
  - [ ] Test international payment

---

## Backup & Monitoring

- [ ] **Backup Setup**
  - [ ] Edit backup.sh with correct credentials
  - [ ] Test manual backup: `bash deploy/backup.sh`
  - [ ] Verify backup created in `/var/backups/auto-platform/`
  
- [ ] **Cron Jobs**
  - [ ] Add backup cron: `0 2 * * * /var/www/auto-platform/deploy/backup.sh`
  - [ ] Add monitoring cron: `*/5 * * * * /var/www/auto-platform/deploy/monitor.sh`
  - [ ] Test cron execution: `crontab -l`

- [ ] **Monitoring**
  - [ ] Configure alert email in .env
  - [ ] Test monitoring: `bash deploy/monitor.sh`
  - [ ] Verify alert received (if issues detected)
  - [ ] Setup Slack webhook (optional)

---

## Testing & Verification

- [ ] **Basic Tests**
  - [ ] Health check: `curl https://clickanunt.ro/api/health`
  - [ ] Homepage loads: `curl https://clickanunt.ro`
  - [ ] SSL valid (no warnings)
  - [ ] HTTP redirects to HTTPS

- [ ] **Functionality Tests**
  - [ ] User registration works
  - [ ] Login works
  - [ ] Create listing works
  - [ ] Search works
  - [ ] Filters work
  - [ ] Admin dashboard accessible
  - [ ] Moderation queue works

- [ ] **Payment Tests**
  - [ ] Create promotion
  - [ ] Payment page loads
  - [ ] Test payment (sandbox)
  - [ ] Verify activation after payment
  - [ ] Check invoice generated

- [ ] **Performance Tests**
  - [ ] Page load < 3 seconds
  - [ ] API response < 500ms
  - [ ] Images optimized
  - [ ] Lighthouse score > 80

---

## Post-Deploy

- [ ] **SEO & Analytics**
  - [ ] Submit sitemap: `https://clickanunt.ro/sitemap.xml`
  - [ ] Google Search Console setup
  - [ ] Google Analytics (optional)
  - [ ] Meta tags verified

- [ ] **Monitoring (24h)**
  - [ ] Check logs: `pm2 logs auto-platform`
  - [ ] Monitor errors: `tail -f /var/log/nginx/auto-platform-error.log`
  - [ ] Check disk space: `df -h`
  - [ ] Check memory: `free -h`
  - [ ] Verify backups created

- [ ] **Documentation**
  - [ ] Update README with production URL
  - [ ] Document admin credentials (secure location)
  - [ ] Document server access details
  - [ ] Create runbook for common issues

---

## Go Live

- [ ] **Announcements**
  - [ ] Social media announcement
  - [ ] Email newsletter (if exists)
  - [ ] Press release (optional)

- [ ] **Switch Payments to Production**
  - [ ] Netopia: Switch to live keys
  - [ ] Stripe: Switch to live keys
  - [ ] Test real payment (small amount)
  - [ ] Verify money received

- [ ] **Final Checks**
  - [ ] All features working
  - [ ] No errors in logs
  - [ ] Backups running
  - [ ] Monitoring working
  - [ ] SSL certificate valid
  - [ ] Performance acceptable

---

## Rollback Plan (If Issues)

1. **Application Rollback**
   ```bash
   cd /var/www
   tar -xzf auto-platform_backup_TIMESTAMP.tar.gz -C auto-platform/
   cd auto-platform
   pm2 reload ecosystem.config.js
   ```

2. **Database Rollback**
   ```bash
   gunzip < /var/backups/auto-platform/db_autoplat_TIMESTAMP.sql.gz | psql -U autoplat autoplat
   ```

3. **Nginx Rollback**
   ```bash
   sudo nginx -t  # Test config
   sudo systemctl restart nginx
   ```

---

## Emergency Contacts

**Server Issues:**
- VPS Provider: Hetzner Support
- Cloudflare Support: https://dash.cloudflare.com/support

**Payment Issues:**
- Netopia Support: support@netopia-payments.com
- Stripe Support: https://support.stripe.com

**Development:**
- GitHub Issues: [repository_url]/issues
- Email: contact@clickanunt.ro

---

## Success Criteria

Platform is successfully deployed when:

✅ All URLs accessible (https only)  
✅ SSL certificate valid  
✅ Database connected  
✅ Admin can login  
✅ Users can register and create listings  
✅ Payments work (sandbox tested)  
✅ Backups running automatically  
✅ Monitoring alerts working  
✅ No critical errors in logs  
✅ Performance acceptable (<3s page load)  

---

**Good luck with deployment! 🚀**

**Need help?** Check [PRODUCTION-DEPLOY.md](PRODUCTION-DEPLOY.md) or contact support.

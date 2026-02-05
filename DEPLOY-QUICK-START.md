# 🚀 ClickAnunț - Deployment în 5 Pași Simpli

## ✅ Ce ai deja pregătit:
- ✓ Aplicația completă și funcțională
- ✓ Toate fișierele de configurare
- ✓ Scripturile automate de deployment
- ✓ Domeniul clickanunt.ro (înregistrat)

---

## 📋 Deployment Rapid - 5 Pași

### **PAS 1:** Verificare Locală ✓
```bash
cd /Users/ind1scutabil/projects/auto-platform
./pre-deploy-check.sh
```
✅ GATA! Toate verificările au trecut!

---

### **PAS 2:** Procură Server VPS (30 minute)

**🎯 Recomandări Provider:**

| Provider | Preț | Link |
|----------|------|------|
| **Contabo** | 4€/lună | https://contabo.com |
| **Hetzner** | 4€/lună | https://www.hetzner.com |
| **OVH** | 5€/lună | https://www.ovh.ro |
| **DigitalOcean** | $6/lună | https://digitalocean.com |

**Specificații necesare:**
- OS: **Ubuntu 22.04 LTS**
- RAM: **2GB** minimum
- CPU: **2 cores**
- Storage: **20GB SSD**

**După achiziție, vei primi:**
- IP Server (ex: 123.45.67.89)
- Password root
- Acces SSH

**📝 Notează:**
```
IP Server: ________________
Password Root: ________________
```

---

### **PAS 3:** Configurare DNS (5 minute + 2-4 ore așteptare)

```bash
./quick-dns-setup.sh
```

Scriptul te ghidează pas cu pas pentru provider-ul tău.

**În rezumat, trebuie să adaugi 2 înregistrări A:**
```
Type: A  | Host: @   | Value: IP_SERVER_TĂU
Type: A  | Host: www | Value: IP_SERVER_TĂU
```

**⏰ Verificare DNS:**
```bash
dig www.clickanunt.ro
# Dacă vezi IP-ul serverului → DNS propagat! ✓
```

**Online checker:** https://dnschecker.org

---

### **PAS 4:** Setup Server (15 minute)

**A. Conectare la server:**
```bash
ssh root@IP_SERVER_TĂU
# Introdu password-ul primit
```

**B. Transfer script setup:**
```bash
# Pe computer-ul tău (într-un terminal nou):
scp setup-server.sh root@IP_SERVER_TĂU:/root/

# Pe server:
cd /root
chmod +x setup-server.sh
sudo ./setup-server.sh
```

**Ce face scriptul automat:**
- ✓ Instalează Node.js 18
- ✓ Instalează PostgreSQL
- ✓ Creează database `autoplat`
- ✓ Instalează PM2
- ✓ Instalează Nginx
- ✓ Instalează Certbot (SSL)
- ✓ Configurează Firewall

**📝 Notează parola database-ului generată!**

---

### **PAS 5:** Deploy Aplicație (10 minute)

**A. Transfer aplicație pe server:**
```bash
# De pe computer-ul tău:
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  /Users/ind1scutabil/projects/auto-platform/ \
  root@IP_SERVER_TĂU:/var/www/clickanunt/
```

**B. Transfer scripturi deployment:**
```bash
scp full-deploy.sh setup-nginx.sh setup-ssl.sh ecosystem.config.js \
  root@IP_SERVER_TĂU:/var/www/clickanunt/
```

**C. Creează .env.production pe server:**
```bash
# Pe server:
cd /var/www/clickanunt
nano .env.production
```

**Adaugă (înlocuiește parola cu cea primită):**
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

**Salvează:** CTRL+X, apoi Y, apoi Enter

**D. Rulează deployment automat:**
```bash
chmod +x *.sh
./full-deploy.sh
```

Scriptul va întreba dacă vrei să configurezi SSL acum.
**→ Răspunde: y**

---

## 🎉 GATA! Site-ul este LIVE!

### 🌐 Accesează site-ul:
- **Homepage:** https://www.clickanunt.ro
- **Admin Dashboard:** https://www.clickanunt.ro/admin/dashboard

### 🔑 Login Admin:
- **Email:** daniel.enoiu29@gmail.com
- **Password:** Gz082306gz082306@

---

## 🛠️ Comenzi Utile

### Status aplicație:
```bash
pm2 status
pm2 logs clickanunt
```

### Restart aplicație:
```bash
pm2 restart clickanunt
```

### Verifică site:
```bash
curl -I https://www.clickanunt.ro
```

### Backup database:
```bash
pg_dump -U autoplat autoplat > backup_$(date +%Y%m%d).sql
```

---

## 🆘 Probleme Comune

### Site nu se încarcă?
```bash
# Verifică aplicația
pm2 logs clickanunt

# Verifică Nginx
sudo systemctl status nginx
sudo tail -f /var/log/nginx/clickanunt-error.log

# Restart
pm2 restart clickanunt
sudo systemctl restart nginx
```

### SSL nu funcționează?
```bash
# Re-issue certificate
sudo certbot --nginx -d clickanunt.ro -d www.clickanunt.ro --force-renewal
```

### Database erori?
```bash
# Conectare database
psql -U autoplat -d autoplat

# Re-run migrations
cd /var/www/clickanunt
npx prisma migrate deploy
```

---

## 📞 Contact

- **Email:** contact@clickanunt.ro
- **Telefon:** +40 784 712 496
- **Admin:** daniel.enoiu29@gmail.com

---

## ✅ Checklist Final

După deployment, verifică:
- [ ] Site-ul se încarcă: https://www.clickanunt.ro
- [ ] SSL activ (lacăt verde în browser)
- [ ] Login admin funcționează
- [ ] Poți crea un anunț test
- [ ] Imaginile se încarcă corect
- [ ] Toate categoriile sunt vizibile
- [ ] Filtrele funcționează
- [ ] Navbar și footer corect

---

**🎊 Felicitări! ClickAnunț este LIVE pe www.clickanunt.ro!**

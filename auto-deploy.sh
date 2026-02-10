#!/bin/bash

# ============================================
# AUTO-DEPLOY COMPLET - RULEAZĂ TOT AUTOMAT
# ============================================

set -e  # Oprește la prima eroare

SERVER_IP="46.225.69.155"
DOMAIN="clickanunt.ro"
WWW_DOMAIN="www.clickanunt.ro"
DB_PASSWORD=$(openssl rand -base64 32)
APP_USER="appuser"

echo "🚀 DEPLOYMENT AUTOMAT ÎNCEPUT..."
echo "================================"

# ============================================
# PASUL 1: VERIFICĂ CONEXIUNEA SSH
# ============================================
echo "📡 Verificare conexiune SSH..."
if ! ssh -o ConnectTimeout=5 root@${SERVER_IP} "echo 'SSH OK'" > /dev/null 2>&1; then
    echo "❌ EROARE: Nu pot conecta la server prin SSH!"
    echo ""
    echo "REZOLVĂ RAPID:"
    echo "1. Deschide Hetzner Console"
    echo "2. Click pe serverul tău"
    echo "3. Secțiunea 'Rescue' din meniul stânga"
    echo "4. Click 'Enable Rescue & Power Cycle'"
    echo "5. Copiază parola de rescue"
    echo "6. Așteaptă 2 minute"
    echo "7. Rulează: ssh root@${SERVER_IP}"
    echo "8. Când te conectezi, rulează:"
    echo "   mount /dev/sda1 /mnt"
    echo "   mkdir -p /mnt/root/.ssh"
    echo "   echo '$(cat ~/.ssh/id_rsa.pub)' > /mnt/root/.ssh/authorized_keys"
    echo "   chmod 700 /mnt/root/.ssh"
    echo "   chmod 600 /mnt/root/.ssh/authorized_keys"
    echo "   umount /mnt"
    echo "   reboot"
    echo ""
    echo "După reboot, rulează din nou: ./auto-deploy.sh"
    exit 1
fi

echo "✅ SSH Connection OK!"

# ============================================
# PASUL 2: INSTALARE SOFTWARE PE SERVER
# ============================================
echo ""
echo "📦 Instalare software pe server..."
ssh root@${SERVER_IP} bash << 'ENDSSH'
set -e

# Update sistem
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y

# Instalare dependențe
apt-get install -y curl git build-essential nginx postgresql postgresql-contrib certbot python3-certbot-nginx

# Instalare Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Instalare PM2
npm install -g pm2

# Creare user pentru aplicație
if ! id "appuser" &>/dev/null; then
    useradd -m -s /bin/bash appuser
fi

echo "✅ Software instalat!"
ENDSSH

# ============================================
# PASUL 3: CONFIGURARE POSTGRESQL
# ============================================
echo ""
echo "🗄️  Configurare PostgreSQL..."
ssh root@${SERVER_IP} bash << ENDSSH
set -e

# Configurare PostgreSQL
sudo -u postgres psql << EOF
CREATE DATABASE IF NOT EXISTS autoplat;
CREATE USER IF NOT EXISTS autoplat WITH PASSWORD '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON DATABASE autoplat TO autoplat;
ALTER DATABASE autoplat OWNER TO autoplat;
\q
EOF

echo "✅ PostgreSQL configurat!"
ENDSSH

# ============================================
# PASUL 4: GENERARE .env PRODUCTION
# ============================================
echo ""
echo "⚙️  Generare configurare production..."

cat > /tmp/.env.production << EOF
# Database
DATABASE_URL="postgresql://autoplat:${DB_PASSWORD}@localhost:5432/autoplat"

# NextAuth
NEXTAUTH_URL="https://${DOMAIN}"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"

# Stripe (folosește cheile tale reale)
STRIPE_SECRET_KEY="your_stripe_secret_key"
STRIPE_PUBLISHABLE_KEY="your_stripe_publishable_key"
STRIPE_WEBHOOK_SECRET="your_stripe_webhook_secret"

# Netopia (folosește cheile tale reale)
NETOPIA_API_KEY="your_netopia_api_key"
NETOPIA_MERCHANT_ID="your_netopia_merchant_id"

# Email
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your_email@gmail.com"
SMTP_PASSWORD="your_app_password"
EMAIL_FROM="noreply@${DOMAIN}"

# Upload
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES="image/jpeg,image/png,image/webp"

# Environment
NODE_ENV="production"
EOF

echo "✅ .env generat!"

# ============================================
# PASUL 5: BUILD ȘI UPLOAD APLICAȚIE
# ============================================
echo ""
echo "🔨 Build aplicație local..."

cd /Users/ind1scutabil/projects/auto-platform

# Install dependencies dacă nu există
if [ ! -d "node_modules" ]; then
    npm install
fi

# Build production
npm run build

# Creare arhivă pentru deploy
echo "📦 Creeare pachete pentru upload..."
tar -czf /tmp/app.tar.gz \
    .next \
    node_modules \
    package.json \
    package-lock.json \
    ecosystem.config.js \
    prisma \
    lib \
    app \
    public \
    middleware.ts \
    next.config.ts \
    tsconfig.json

# Upload pe server
echo "⬆️  Upload aplicație pe server..."
scp /tmp/.env.production root@${SERVER_IP}:/home/appuser/.env
scp /tmp/app.tar.gz root@${SERVER_IP}:/home/appuser/

# ============================================
# PASUL 6: DEPLOY APLICAȚIE PE SERVER
# ============================================
echo ""
echo "🚀 Deploy aplicație pe server..."
ssh root@${SERVER_IP} bash << 'ENDSSH'
set -e

cd /home/appuser

# Extrage aplicația
tar -xzf app.tar.gz
rm app.tar.gz

# Setează ownership
chown -R appuser:appuser /home/appuser

# Migrare bază de date
sudo -u appuser bash << 'ENDSU'
cd /home/appuser
npx prisma migrate deploy
npx prisma generate
ENDSU

# Start aplicație cu PM2
sudo -u appuser bash << 'ENDSU'
cd /home/appuser
pm2 delete auto-platform 2>/dev/null || true
pm2 start ecosystem.config.js --env production
pm2 save
ENDSU

# Setup PM2 startup
env PATH=$PATH:/usr/bin pm2 startup systemd -u appuser --hp /home/appuser
systemctl enable pm2-appuser

echo "✅ Aplicație deployed și pornită!"
ENDSSH

# ============================================
# PASUL 7: CONFIGURARE NGINX
# ============================================
echo ""
echo "🌐 Configurare Nginx..."
ssh root@${SERVER_IP} bash << ENDSSH
set -e

# Creare configurare Nginx
cat > /etc/nginx/sites-available/auto-platform << 'EOF'
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Activare site
ln -sf /etc/nginx/sites-available/auto-platform /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test și restart Nginx
nginx -t
systemctl restart nginx

echo "✅ Nginx configurat!"
ENDSSH

# ============================================
# PASUL 8: INSTALARE SSL (CERTBOT)
# ============================================
echo ""
echo "🔒 Instalare certificat SSL..."
echo "IMPORTANT: Asigură-te că DNS-ul ${DOMAIN} pointează către ${SERVER_IP}"
read -p "DNS-ul este configurat? (apasă Enter pentru a continua, sau Ctrl+C pentru a opri)" 

ssh root@${SERVER_IP} bash << ENDSSH
set -e

# Instalare certificat SSL
certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --non-interactive --agree-tos --email admin@${DOMAIN}

# Setup auto-renewal
systemctl enable certbot.timer
systemctl start certbot.timer

echo "✅ SSL instalat!"
ENDSSH

# ============================================
# PASUL 9: CLEANUP
# ============================================
echo ""
echo "🧹 Cleanup..."
rm -f /tmp/app.tar.gz /tmp/.env.production

# ============================================
# FINALIZARE
# ============================================
echo ""
echo "================================"
echo "✅ DEPLOYMENT COMPLET!"
echo "================================"
echo ""
echo "📊 INFORMAȚII IMPORTANTE:"
echo ""
echo "🌐 Website: https://${DOMAIN}"
echo "🗄️  Database Password: ${DB_PASSWORD}"
echo "📁 App Location: /home/appuser/"
echo ""
echo "🔧 COMENZI UTILE:"
echo "  - Vezi logs: ssh root@${SERVER_IP} 'sudo -u appuser pm2 logs'"
echo "  - Status app: ssh root@${SERVER_IP} 'sudo -u appuser pm2 status'"
echo "  - Restart app: ssh root@${SERVER_IP} 'sudo -u appuser pm2 restart auto-platform'"
echo "  - Restart Nginx: ssh root@${SERVER_IP} 'systemctl restart nginx'"
echo ""
echo "⚠️  IMPORTANT:"
echo "1. Salvează parola bazei de date: ${DB_PASSWORD}"
echo "2. Configurează DNS în Cloudflare: A record @ -> ${SERVER_IP}"
echo "3. Editează /home/appuser/.env pe server și adaugă cheile Stripe/Netopia"
echo "4. Test site: https://${DOMAIN}"
echo ""
echo "🎉 Gata! Site-ul tău este LIVE!"

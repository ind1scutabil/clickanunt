#!/bin/bash

# ClickAnunț - SSL Certificate Setup with Let's Encrypt

set -e

echo "🔐 Setup SSL Certificate pentru ClickAnunț"
echo "=========================================="
echo ""

# Check if Certbot is installed
if ! command -v certbot &> /dev/null; then
    echo "❌ Certbot nu este instalat!"
    echo "Rulează: sudo apt install certbot python3-certbot-nginx"
    exit 1
fi

# Email for Let's Encrypt
read -p "Enter email address for SSL notifications: " EMAIL

if [ -z "$EMAIL" ]; then
    echo "❌ Email-ul este necesar pentru Let's Encrypt!"
    exit 1
fi

echo ""
echo "🔍 Verificare DNS..."
echo "Checking if clickanunt.ro points to this server..."

# Get server IP
SERVER_IP=$(curl -s ifconfig.me)
echo "Server IP: $SERVER_IP"

# Check DNS for both domains
DOMAIN_IP=$(dig +short clickanunt.ro | tail -n1)
WWW_IP=$(dig +short www.clickanunt.ro | tail -n1)

echo "clickanunt.ro resolves to: $DOMAIN_IP"
echo "www.clickanunt.ro resolves to: $WWW_IP"

if [ "$DOMAIN_IP" != "$SERVER_IP" ] && [ "$WWW_IP" != "$SERVER_IP" ]; then
    echo ""
    echo "⚠️  WARNING: DNS nu pointează către acest server!"
    echo "Server IP: $SERVER_IP"
    echo "Domain IP: $DOMAIN_IP"
    echo "WWW IP: $WWW_IP"
    echo ""
    read -p "Continui oricum? (y/n): " CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        echo "❌ Setup oprit. Configurează DNS-ul mai întâi."
        exit 1
    fi
fi

echo ""
echo "📝 Obtaining SSL certificate..."
echo ""

# Obtain certificate
certbot --nginx \
    -d clickanunt.ro \
    -d www.clickanunt.ro \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --redirect

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SSL Certificate obtained successfully!"
    echo ""
    echo "🔒 HTTPS is now enabled for:"
    echo "   - https://clickanunt.ro"
    echo "   - https://www.clickanunt.ro"
    echo ""
    echo "🔄 Auto-renewal is configured"
    echo "   Certificate will auto-renew before expiration"
    echo ""
    echo "📋 Test auto-renewal with:"
    echo "   sudo certbot renew --dry-run"
    echo ""
    echo "🌐 Visit: https://www.clickanunt.ro"
else
    echo ""
    echo "❌ SSL setup failed!"
    echo ""
    echo "Troubleshooting:"
    echo "1. Verifică că DNS-ul este configurat corect"
    echo "2. Verifică că portul 80 și 443 sunt deschise în firewall"
    echo "3. Verifică logs Nginx: sudo tail -f /var/log/nginx/error.log"
    exit 1
fi

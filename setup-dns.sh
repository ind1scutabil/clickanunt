#!/bin/bash

# ClickAnunț - DNS Configuration Guide
# Acest script generează instrucțiuni DNS pentru provider-ul tău

echo "🌐 DNS Configuration pentru www.clickanunt.ro"
echo "================================================"
echo ""

# Solicită IP-ul serverului
read -p "Introdu IP-ul serverului tău (ex: 123.45.67.89): " SERVER_IP

if [ -z "$SERVER_IP" ]; then
    echo "❌ IP-ul serverului este necesar!"
    exit 1
fi

echo ""
echo "✅ Configurare DNS pentru IP: $SERVER_IP"
echo ""
echo "📋 RECORD-URI DNS DE ADĂUGAT:"
echo "================================"
echo ""
echo "1. A Record pentru domeniul principal:"
echo "   Tip: A"
echo "   Name: @"
echo "   Value: $SERVER_IP"
echo "   TTL: 3600 (1 oră)"
echo ""
echo "2. A Record pentru www:"
echo "   Tip: A"
echo "   Name: www"
echo "   Value: $SERVER_IP"
echo "   TTL: 3600"
echo ""
echo "3. CNAME Record pentru mail (opțional):"
echo "   Tip: CNAME"
echo "   Name: mail"
echo "   Value: mail.clickanunt.ro"
echo "   TTL: 3600"
echo ""
echo "================================"
echo ""
echo "🔧 INSTRUCȚIUNI PENTRU PROVIDER-E POPULARE:"
echo ""
echo "📌 GoDaddy:"
echo "   1. Login la godaddy.com"
echo "   2. My Products → Domains → clickanunt.ro → DNS"
echo "   3. Add → A Record"
echo "   4. Host: @ / Points to: $SERVER_IP"
echo "   5. Add → A Record"
echo "   6. Host: www / Points to: $SERVER_IP"
echo ""
echo "📌 Namecheap:"
echo "   1. Login la namecheap.com"
echo "   2. Domain List → Manage → Advanced DNS"
echo "   3. Add New Record → A Record"
echo "   4. Host: @ / Value: $SERVER_IP"
echo "   5. Add New Record → A Record"
echo "   6. Host: www / Value: $SERVER_IP"
echo ""
echo "📌 Cloudflare:"
echo "   1. Login la cloudflare.com"
echo "   2. Select Domain → DNS → Add record"
echo "   3. Type: A / Name: @ / IPv4: $SERVER_IP / Proxy: ON"
echo "   4. Add record"
echo "   5. Type: A / Name: www / IPv4: $SERVER_IP / Proxy: ON"
echo ""
echo "📌 Romanian Providers (rotld.ro, etc):"
echo "   1. Login la panoul provider-ului"
echo "   2. Găsește secțiunea DNS Management"
echo "   3. Adaugă A Record pentru @ → $SERVER_IP"
echo "   4. Adaugă A Record pentru www → $SERVER_IP"
echo ""
echo "⏰ TIMP DE PROPAGARE DNS:"
echo "   - Minim: 15-30 minute"
echo "   - Normal: 2-4 ore"
echo "   - Maxim: 24-48 ore"
echo ""
echo "🔍 VERIFICARE DNS:"
echo "   După configurare, verifică cu:"
echo "   dig clickanunt.ro"
echo "   dig www.clickanunt.ro"
echo "   nslookup clickanunt.ro"
echo ""
echo "   Sau online:"
echo "   https://dnschecker.org"
echo "   https://www.whatsmydns.net"
echo ""

# Salvează configurația
cat > /tmp/dns-config.txt << EOL
DNS Configuration pentru ClickAnunț
====================================
Domeniu: clickanunt.ro, www.clickanunt.ro
Server IP: $SERVER_IP
Data: $(date)

Record-uri DNS:
--------------
Type  | Name | Value
------|------|-------
A     | @    | $SERVER_IP
A     | www  | $SERVER_IP
CNAME | mail | mail.clickanunt.ro

Verificare:
-----------
dig clickanunt.ro
dig www.clickanunt.ro

Online checkers:
https://dnschecker.org
https://www.whatsmydns.net
EOL

echo "💾 Configurația a fost salvată în: /tmp/dns-config.txt"
echo ""
echo "✅ Următorul pas: Rulează ./setup-server.sh pe server"

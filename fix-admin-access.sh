#!/bin/bash

# Fix Admin Access - Verify and Configure Nginx

SERVER_IP="46.225.69.155"

echo "🔍 Verificare și Fixare Acces Admin"
echo "===================================="

# Step 1: Test Nginx Config
echo ""
echo "1️⃣ Testez configurația Nginx..."
ssh root@${SERVER_IP} "nginx -t"

# Step 2: Check if Nginx is running
echo ""
echo "2️⃣ Verific dacă Nginx rulează..."
ssh root@${SERVER_IP} "systemctl is-active nginx"

# Step 3: Reload Nginx
echo ""
echo "3️⃣ Reiau Nginx..."
ssh root@${SERVER_IP} "systemctl reload nginx"

# Step 4: Check if the app is running
echo ""
echo "4️⃣ Verific dacă aplicația rulează..."
ssh root@${SERVER_IP} "ps aux | grep 'next-server\|npm run start' | grep -v grep" || echo "⚠️  App nu rulează. Porniți-o cu: npm run start"

# Step 5: Test URLs
echo ""
echo "5️⃣ Testez URL-uri..."
echo ""
echo "Testing: http://localhost:3000/admin/dashboard"
curl -s -o /dev/null -w "HTTP %{http_code} - Admin Dashboard Local\n" http://localhost:3000/admin/dashboard

echo ""
echo "Testing: http://clickanunt.ro (should redirect to https://www.clickanunt.ro)"
curl -s -I http://clickanunt.ro 2>&1 | head -5

echo ""
echo "Testing: https://www.clickanunt.ro/"
curl -s -I https://www.clickanunt.ro/ 2>&1 | head -5

# Step 6: Show Nginx Status
echo ""
echo "6️⃣ Status Nginx:"
ssh root@${SERVER_IP} "systemctl status nginx --no-pager" | head -20

# Step 7: Show recent errors
echo ""
echo "7️⃣ Erori recente (dacă sunt):"
ssh root@${SERVER_IP} "tail -20 /var/log/nginx/error.log" 2>/dev/null || echo "Fără erori recente"

echo ""
echo "✅ Verificare completă!"
echo ""
echo "Dacă problema persistă:"
echo "1. Asigură-te că DNS-ul este configurat corect (clickanunt.ro și www.clickanunt.ro)"
echo "2. Verific loggurile: ssh root@${SERVER_IP} 'tail -f /var/log/nginx/access.log'"
echo "3. Accesează: https://www.clickanunt.ro/auth/login"
echo "4. După login (dacă ești admin), vei fi redirecționat la /admin/dashboard"

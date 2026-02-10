#!/bin/bash
# Script upload manual - generează comenzi pentru console

echo "📦 Împachetare cod..."
cd /Users/ind1scutabil/projects/auto-platform

# Exclude node_modules, .next, .git
tar -czf /tmp/app-deploy.tar.gz \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.git' \
  --exclude='*.log' \
  --exclude='.env*' \
  .

# Convertește în base64 și split în bucăți de 50KB
base64 /tmp/app-deploy.tar.gz | split -b 50000 - /tmp/app-part-

echo ""
echo "✅ Cod împachetat! Dimensiune:"
ls -lh /tmp/app-deploy.tar.gz

echo ""
echo "📋 COPIAZĂ COMENZILE ASTEA ÎN CONSOLA HETZNER:"
echo "================================================================"
echo "cd /var/www/auto-platform"

# Generează comenzi pentru fiecare parte
for file in /tmp/app-part-*; do
    echo "cat >> app.b64 << 'EOFDATA'"
    cat "$file"
    echo "EOFDATA"
done

echo "base64 -d app.b64 > app.tar.gz"
echo "tar -xzf app.tar.gz"
echo "rm app.b64 app.tar.gz"
echo "================================================================"

echo ""
echo "🎯 Număr bucăți: $(ls -1 /tmp/app-part-* | wc -l)"
echo ""
echo "Dacă sunt prea multe bucăți, rulează în loc:"
echo "  cd /var/www/auto-platform"
echo "  curl -O http://localhost:8000/app.tar.gz  # după ce pornești server local"

#!/bin/bash

# Setup Hetzner server for ClickAnunț deployment
# Run this ONCE before initial deployment

SERVER="root@46.225.69.155"

echo "🔧 Preparing Hetzner server for ClickAnunț..."
echo ""

ssh ${SERVER} << 'EOF'
set -e

echo "📁 Creating directories..."
mkdir -p /var/www/clickanunt
mkdir -p /var/log/clickanunt

echo "📦 Checking Node.js installation..."
node --version || (
  echo "Installing Node.js v25..."
  curl -fsSL https://deb.nodesource.com/setup_25.x | bash -
  apt-get install -y nodejs
)

echo "⚙️  Checking npm..."
npm --version

echo "🚀 Checking PM2..."
npm list -g pm2 || npm install -g pm2

echo "📚 Checking PostgreSQL client..."
which psql || apt-get install -y postgresql-client

echo "✅ Server ready!"
echo ""
echo "Next: Run deployment script"
EOF

echo "✅ Server preparation complete!"

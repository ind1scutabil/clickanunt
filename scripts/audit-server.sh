#!/bin/bash

###############################################################################
# AUDIT-SERVER.SH - Complete Server Deployment Audit
# Runs on production server to verify what code is actually running
# Usage: bash /tmp/audit-server.sh
###############################################################################

set -u  # Exit on undefined variables

echo "════════════════════════════════════════════════════════════════"
echo "  SERVER AUDIT - ClickAnunț Production"
echo "════════════════════════════════════════════════════════════════"
echo ""

# A) FIND ACTUAL APP FOLDERS
echo "[A] FINDING SERVED APPLICATION FOLDERS..."
echo ""

for PATH_CANDIDATE in /var/www /srv /home /opt; do
  if [ -d "$PATH_CANDIDATE" ]; then
    echo "Checking $PATH_CANDIDATE..."
    find "$PATH_CANDIDATE" -maxdepth 2 -type f -name "package.json" 2>/dev/null | while read -r pkg; do
      folder=$(dirname "$pkg")
      app_name=$(grep -o '"name"[[:space:]]*:[[:space:]]*"[^"]*"' "$pkg" 2>/dev/null | cut -d'"' -f4 || echo "N/A")
      modified=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "$pkg" 2>/dev/null || stat -c "%y" "$pkg" 2>/dev/null | cut -d' ' -f1-2)
      has_next="[ -d \"$folder/.next\" ] && echo 'YES' || echo 'NO'"
      
      echo "  Found: $folder"
      echo "    Package: $app_name"
      echo "    Modified: $modified"
      echo "    .next exists: $(eval $has_next)"
      echo ""
    done
  fi
done

# B) PM2 TRUTH
echo ""
echo "[B] PM2 PROCESS INFORMATION..."
echo ""
echo "PM2 List:"
pm2 list
echo ""

echo "PM2 Describe (clickanunt):"
pm2 describe clickanunt 2>/dev/null | grep -E "script|cwd|env|instance|status|pid" || echo "❌ App not found in PM2"
echo ""

echo "PM2 Config File:"
if [ -f "/var/www/clickanunt/ecosystem.config.js" ]; then
  echo "✅ ecosystem.config.js exists at /var/www/clickanunt/"
  grep -E "name:|script:|cwd:|max_memory" /var/www/clickanunt/ecosystem.config.js | head -10
else
  echo "❌ ecosystem.config.js NOT found"
fi
echo ""

# C) GIT TRUTH ON SERVER
echo ""
echo "[C] GIT REPOSITORY STATUS ON SERVER..."
echo ""

APP_DIR="/var/www/clickanunt"

if [ -d "$APP_DIR/.git" ]; then
  echo "✅ Git repository exists at $APP_DIR"
  cd "$APP_DIR"
  
  echo ""
  echo "Current Branch:"
  git branch | grep '\*'
  
  echo ""
  echo "Last 5 Commits:"
  git log --oneline -5 2>/dev/null || echo "❌ No commits"
  
  echo ""
  echo "Current Commit Hash:"
  git rev-parse HEAD 2>/dev/null || echo "❌ No commit"
  
  echo ""
  echo "Git Remote:"
  git remote -v 2>/dev/null | cat || echo "❌ No remotes configured"
  
  echo ""
  echo "Uncommitted Changes:"
  git status --short 2>/dev/null | cat || echo "None"
else
  echo "❌ No .git folder at $APP_DIR"
  echo "   Deployment must be copying compiled artifacts only"
fi
echo ""

# D) ENVIRONMENT CONFIGURATION
echo ""
echo "[D] ENVIRONMENT & DATABASE CONFIGURATION..."
echo ""

echo "Active .env files on server:"
find /var/www -name ".env*" -type f 2>/dev/null | head -10
echo ""

echo "DATABASE_URL (masked, showing host/port/dbname/user only):"
if [ -f "$APP_DIR/.env" ]; then
  DATABASE_URL=$(grep "^DATABASE_URL=" "$APP_DIR/.env" 2>/dev/null | cut -d'=' -f2-)
  if [ -n "$DATABASE_URL" ]; then
    # Extract components
    HOST=$(echo "$DATABASE_URL" | grep -oP '(?<=postgresql://[^:]*:[^@]*@)[^:]*' || echo "N/A")
    PORT=$(echo "$DATABASE_URL" | grep -oP '(?<=:)[0-9]+(?=/)' || echo "5432")
    DBNAME=$(echo "$DATABASE_URL" | grep -oP '(?<=/)[^?]*' || echo "N/A")
    USER=$(echo "$DATABASE_URL" | grep -oP '(?<=postgresql://)[^:]*' || echo "N/A")
    echo "  Host: $HOST"
    echo "  Port: $PORT"
    echo "  Database: $DBNAME"
    echo "  User: $USER"
    echo "  (password is masked)"
  else
    echo "❌ DATABASE_URL not found in .env"
  fi
else
  echo "❌ .env not found at $APP_DIR/.env"
fi
echo ""

echo "PM2 Environment Variables:"
pm2 describe clickanunt 2>/dev/null | grep -A 50 "env:" | grep "DATABASE_URL" || echo "No DATABASE_URL in PM2 env"
echo ""

echo "System Environment (postgresql):"
env | grep -i postgres | grep -v PASSWORD || echo "None in system env"
echo ""

# E) NODE PROCESS CHECK
echo ""
echo "[E] RUNNING NODE PROCESSES..."
echo ""
ps aux | grep -E "node|next" | grep -v grep || echo "No node processes found"
echo ""

# F) PORT BINDING CHECK
echo ""
echo "[F] PORT 3000 BINDING..."
echo ""
netstat -tulpn 2>/dev/null | grep 3000 || lsof -i :3000 2>/dev/null || echo "Port 3000 info not available"
echo ""

# G) BUILD ARTIFACTS
echo ""
echo "[G] BUILD ARTIFACTS..."
echo ""
if [ -d "$APP_DIR/.next" ]; then
  NEXT_SIZE=$(du -sh "$APP_DIR/.next" 2>/dev/null | cut -f1)
  echo "✅ .next folder exists"
  echo "   Size: $NEXT_SIZE"
  NEXT_MODIFIED=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "$APP_DIR/.next" 2>/dev/null || stat -c "%y" "$APP_DIR/.next" 2>/dev/null | cut -d' ' -f1-2)
  echo "   Modified: $NEXT_MODIFIED"
else
  echo "❌ .next folder NOT found"
fi

if [ -f "$APP_DIR/package.json" ]; then
  PKG_NAME=$(grep -o '"name"[[:space:]]*:[[:space:]]*"[^"]*"' "$APP_DIR/package.json" 2>/dev/null | cut -d'"' -f4 || echo "N/A")
  echo "✅ package.json exists: $PKG_NAME"
else
  echo "❌ package.json NOT found"
fi
echo ""

# H) VERSION ENDPOINT CHECK
echo ""
echo "[H] VERSION ENDPOINT TEST..."
echo ""
curl -s http://localhost:3000/api/version 2>/dev/null | cat || echo "❌ /api/version not available (expected - will be added in PHASE 4)"
echo ""

echo "════════════════════════════════════════════════════════════════"
echo "  AUDIT COMPLETE"
echo "════════════════════════════════════════════════════════════════"

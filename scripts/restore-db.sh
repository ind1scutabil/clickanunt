#!/bin/bash
# PostgreSQL Restore Script
# Usage: ./scripts/restore-db.sh <backup_file.sql.gz>

set -e

if [ -z "$1" ]; then
  echo "❌ Usage: $0 <backup_file.sql.gz>"
  echo "Example: $0 backups/backup_20260204_120000.sql.gz"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Backup file not found: $BACKUP_FILE"
  exit 1
fi

# Configuration
DB_NAME="${POSTGRES_DB:-autoplat}"
DB_USER="${POSTGRES_USER:-autoplat}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"

echo "⚠️  WARNING: This will REPLACE the current database!"
echo "📦 Database: $DB_NAME"
echo "📂 Backup file: $BACKUP_FILE"
echo ""
read -p "Are you sure you want to continue? (yes/no): " -r
echo

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  echo "❌ Restore cancelled"
  exit 1
fi

echo "🔄 Starting restore..."

# Stop application server (optional)
# lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Drop and recreate database
echo "🗑️  Dropping existing database..."
PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;"

# Restore from backup
echo "📥 Restoring from backup..."
gunzip -c "$BACKUP_FILE" | PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"

echo "✅ Restore completed successfully!"
echo ""
echo "🔄 Run migrations to ensure schema is up to date:"
echo "  npx prisma migrate deploy"
echo ""
echo "🚀 Start the application:"
echo "  npm run dev"

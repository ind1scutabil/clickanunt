#!/bin/bash
# PostgreSQL Backup Script
# Usage: ./scripts/backup-db.sh [backup_name]

set -e

# Configuration
DB_NAME="${POSTGRES_DB:-autoplat}"
DB_USER="${POSTGRES_USER:-autoplat}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="${1:-backup_${TIMESTAMP}}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Ensure pg_dump is non-interactive.
# backup-db.sh uses POSTGRES_PASSWORD -> PGPASSWORD for pg_dump. If it's missing,
# try deriving it from DATABASE_URL (format: postgres://user:pass@host:port/db).
if [ -z "${POSTGRES_PASSWORD:-}" ] && [ -n "${DATABASE_URL:-}" ]; then
  POSTGRES_PASSWORD="$(echo "$DATABASE_URL" | sed -E 's#^[a-zA-Z]+://[^:]+:([^@]+)@.*#\1#')"
fi

if [ -z "${POSTGRES_PASSWORD:-}" ]; then
  echo "❌ POSTGRES_PASSWORD missing (and could not be derived from DATABASE_URL). Refusing interactive pg_dump." >&2
  exit 1
fi

echo "🔄 Starting backup of database: $DB_NAME"
echo "📁 Backup location: $BACKUP_DIR/$BACKUP_NAME.sql.gz"

# Run pg_dump with compression
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  | gzip > "$BACKUP_DIR/$BACKUP_NAME.sql.gz"

# Verify backup
if [ -f "$BACKUP_DIR/$BACKUP_NAME.sql.gz" ]; then
  SIZE=$(du -h "$BACKUP_DIR/$BACKUP_NAME.sql.gz" | cut -f1)
  echo "✅ Backup completed successfully!"
  echo "📊 Backup size: $SIZE"
  echo "📂 File: $BACKUP_DIR/$BACKUP_NAME.sql.gz"
  
  # Keep only last 30 backups
  cd "$BACKUP_DIR"
  ls -t backup_*.sql.gz | tail -n +31 | xargs -r rm
  echo "🧹 Cleaned old backups (kept last 30)"
else
  echo "❌ Backup failed!"
  exit 1
fi

echo ""
echo "🔍 To restore this backup, run:"
echo "  gunzip -c $BACKUP_DIR/$BACKUP_NAME.sql.gz | psql -h $DB_HOST -U $DB_USER -d $DB_NAME"

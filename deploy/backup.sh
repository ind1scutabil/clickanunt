#!/bin/bash
# Database backup script
# Add to crontab: 0 2 * * * /var/www/auto-platform/deploy/backup.sh

set -e

# Configuration
BACKUP_DIR="/var/backups/auto-platform"
DB_NAME="autoplat"
DB_USER="autoplat"
RETENTION_DAYS=14
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/db_${DB_NAME}_${DATE}.sql.gz"
LOG_FILE="/var/log/auto-platform/backup.log"

# Create backup directory if not exists
mkdir -p "${BACKUP_DIR}"

# Log function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

log "Starting database backup..."

# Backup database
if PGPASSWORD="${DB_PASSWORD}" pg_dump -U "${DB_USER}" -h localhost "${DB_NAME}" | gzip > "${BACKUP_FILE}"; then
    log "✅ Database backup successful: ${BACKUP_FILE}"
    
    # Get backup size
    SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    log "Backup size: ${SIZE}"
    
    # Delete old backups
    find "${BACKUP_DIR}" -name "db_${DB_NAME}_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
    log "Deleted backups older than ${RETENTION_DAYS} days"
    
    # Count remaining backups
    BACKUP_COUNT=$(ls -1 "${BACKUP_DIR}"/db_${DB_NAME}_*.sql.gz 2>/dev/null | wc -l)
    log "Total backups: ${BACKUP_COUNT}"
    
    # Optional: Upload to remote storage (S3, etc.)
    if [ -n "${BACKUP_S3_BUCKET}" ]; then
        log "Uploading to S3..."
        aws s3 cp "${BACKUP_FILE}" "s3://${BACKUP_S3_BUCKET}/backups/" && \
            log "✅ S3 upload successful" || \
            log "❌ S3 upload failed"
    fi
    
else
    log "❌ Database backup failed!"
    exit 1
fi

# Backup uploaded files (if using local storage)
if [ -d "/var/www/auto-platform/public/uploads" ]; then
    UPLOADS_BACKUP="${BACKUP_DIR}/uploads_${DATE}.tar.gz"
    log "Backing up uploads..."
    
    if tar -czf "${UPLOADS_BACKUP}" -C /var/www/auto-platform/public uploads; then
        log "✅ Uploads backup successful: ${UPLOADS_BACKUP}"
        
        # Delete old uploads backups
        find "${BACKUP_DIR}" -name "uploads_*.tar.gz" -mtime +${RETENTION_DAYS} -delete
    else
        log "⚠️  Uploads backup failed"
    fi
fi

# Backup .env file
ENV_BACKUP="${BACKUP_DIR}/env_${DATE}.enc"
if [ -f "/var/www/auto-platform/.env" ]; then
    log "Backing up .env file..."
    
    # Encrypt .env file (requires openssl)
    if [ -n "${BACKUP_ENCRYPTION_KEY}" ]; then
        openssl enc -aes-256-cbc -salt -in /var/www/auto-platform/.env \
            -out "${ENV_BACKUP}" -k "${BACKUP_ENCRYPTION_KEY}" && \
            log "✅ .env backup successful (encrypted)" || \
            log "⚠️  .env backup failed"
    else
        cp /var/www/auto-platform/.env "${BACKUP_DIR}/env_${DATE}.txt"
        log "⚠️  .env backed up without encryption (set BACKUP_ENCRYPTION_KEY)"
    fi
    
    # Delete old env backups
    find "${BACKUP_DIR}" -name "env_*" -mtime +${RETENTION_DAYS} -delete
fi

# Disk space check
DISK_USAGE=$(df -h "${BACKUP_DIR}" | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "${DISK_USAGE}" -gt 90 ]; then
    log "⚠️  WARNING: Disk usage is ${DISK_USAGE}%"
fi

log "Backup completed successfully!"
log "---"

# Send notification (optional - requires configured mail)
# echo "Backup completed: ${BACKUP_FILE}" | mail -s "Auto-Platform Backup" admin@yourdomain.com

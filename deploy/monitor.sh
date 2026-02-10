#!/bin/bash
# Health monitoring script
# Add to crontab: */5 * * * * /var/www/auto-platform/deploy/monitor.sh

set -e

APP_URL="${APP_URL:-http://localhost:3000}"
LOG_FILE="/var/log/auto-platform/monitor.log"
ALERT_EMAIL="${ALERT_EMAIL:-admin@yourdomain.com}"

# Log function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

# Check health endpoint
check_health() {
    local response=$(curl -s -o /dev/null -w "%{http_code}" "${APP_URL}/api/health" 2>&1)
    
    if [ "$response" -eq 200 ]; then
        log "✅ Health check passed"
        return 0
    else
        log "❌ Health check failed (HTTP $response)"
        return 1
    fi
}

# Check database
check_database() {
    local health_data=$(curl -s "${APP_URL}/api/health" 2>&1)
    
    if echo "$health_data" | grep -q '"status":"up"'; then
        log "✅ Database is up"
        return 0
    else
        log "❌ Database is down"
        return 1
    fi
}

# Check disk space
check_disk() {
    local usage=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [ "$usage" -lt 90 ]; then
        log "✅ Disk usage: ${usage}%"
        return 0
    else
        log "⚠️  WARNING: Disk usage: ${usage}%"
        return 1
    fi
}

# Check PM2 processes
check_pm2() {
    local pm2_status=$(pm2 jlist 2>&1)
    
    if echo "$pm2_status" | grep -q '"status":"online"'; then
        log "✅ PM2 process is running"
        return 0
    else
        log "❌ PM2 process is not running"
        
        # Try to restart
        log "Attempting to restart PM2..."
        pm2 restart ecosystem.config.js --env production
        
        return 1
    fi
}

# Check memory
check_memory() {
    local mem_usage=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
    
    if [ "$mem_usage" -lt 90 ]; then
        log "✅ Memory usage: ${mem_usage}%"
        return 0
    else
        log "⚠️  WARNING: Memory usage: ${mem_usage}%"
        return 1
    fi
}

# Send alert
send_alert() {
    local subject="$1"
    local message="$2"
    
    log "Sending alert: $subject"
    
    # Send email if mail is configured
    if command -v mail &> /dev/null; then
        echo "$message" | mail -s "$subject" "$ALERT_EMAIL"
    fi
    
    # Could also send to Slack, Discord, etc.
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$subject\n$message\"}" \
            "$SLACK_WEBHOOK" 2>&1 | tee -a "${LOG_FILE}"
    fi
}

# Main monitoring
main() {
    log "Starting health monitoring..."
    
    local failed=0
    local alerts=""
    
    # Run checks
    if ! check_health; then
        failed=$((failed + 1))
        alerts="${alerts}\n- Health endpoint failed"
    fi
    
    if ! check_database; then
        failed=$((failed + 1))
        alerts="${alerts}\n- Database check failed"
    fi
    
    if ! check_disk; then
        failed=$((failed + 1))
        alerts="${alerts}\n- Disk space warning"
    fi
    
    if ! check_pm2; then
        failed=$((failed + 1))
        alerts="${alerts}\n- PM2 process check failed"
    fi
    
    if ! check_memory; then
        failed=$((failed + 1))
        alerts="${alerts}\n- Memory usage warning"
    fi
    
    # Send alert if any checks failed
    if [ $failed -gt 0 ]; then
        send_alert \
            "Auto-Platform: $failed checks failed" \
            "Health monitoring detected issues:${alerts}\n\nTime: $(date)\nServer: $(hostname)"
    fi
    
    log "Monitoring complete. Failed checks: $failed"
    log "---"
}

# Run monitoring
main

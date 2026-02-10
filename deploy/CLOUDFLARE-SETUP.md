# Cloudflare Configuration Guide

## DNS Setup

1. **Add DNS Records:**
```
Type: A
Name: @
Content: YOUR_SERVER_IP
TTL: Auto
Proxy status: Proxied (orange cloud)

Type: A
Name: www
Content: YOUR_SERVER_IP
TTL: Auto
Proxy status: Proxied (orange cloud)
```

2. **CAA Records (optional but recommended):**
```
Type: CAA
Name: @
Value: 0 issue "letsencrypt.org"
```

## SSL/TLS Settings

**SSL/TLS encryption mode:** Full (strict)

This ensures encryption between Cloudflare and your origin server.

**Always Use HTTPS:** ON

**Automatic HTTPS Rewrites:** ON

**Minimum TLS Version:** TLS 1.2

**TLS 1.3:** ON

**HSTS:**
- Enable HSTS: ON
- Max Age: 6 months (15768000 seconds)
- Include subdomains: ON
- Preload: ON

## Security Settings

**Security Level:** Medium

**Bot Fight Mode:** ON

**Challenge Passage:** 30 minutes

**Browser Integrity Check:** ON

## Firewall Rules

Create these firewall rules in order:

### 1. Block Bad Bots
```
Field: User Agent
Operator: contains
Value: (scraper|bot|spider|crawler)
Action: Block
```

### 2. Rate Limiting
```
Field: URI Path
Operator: equals
Value: /api/
Action: Managed Challenge
When incoming requests exceed: 100 requests per minute
```

### 3. Block Countries (optional)
```
Field: Country
Operator: not in
Value: RO, EU
Action: Block
```

### 4. Allow Health Checks
```
Field: URI Path
Operator: equals
Value: /api/health
Action: Allow
Priority: 1 (highest)
```

## Page Rules

### 1. Cache API Responses
```
URL: auto-platform.com/api/*
Settings:
- Cache Level: Standard
- Edge Cache TTL: 2 hours
```

### 2. Cache Static Assets
```
URL: auto-platform.com/_next/static/*
Settings:
- Cache Level: Cache Everything
- Edge Cache TTL: 1 year
- Browser Cache TTL: 1 year
```

### 3. Security Headers
```
URL: auto-platform.com/*
Settings:
- Security Level: Medium
- Always Use HTTPS: ON
```

## Speed Optimization

**Auto Minify:**
- JavaScript: ON
- CSS: ON
- HTML: ON

**Brotli:** ON

**Early Hints:** ON

**HTTP/2:** ON
**HTTP/3 (QUIC):** ON

**Rocket Loader:** OFF (can break Next.js)

**Mirage:** ON (optimizes images)

**Polish:** Lossy (compresses images)

## Caching

**Caching Level:** Standard

**Browser Cache TTL:** 4 hours

**Crawler Hints:** ON

**Always Online:** ON

## Network

**WebSockets:** ON (required for hot reload in dev)

**IP Geolocation:** ON

**Pseudo IPv4:** Add header

## DNS Settings

**DNSSEC:** ON (enable after DNS is working)

**CNAME Flattening:** Flatten at root

## Analytics

**Web Analytics:** ON

Track:
- Page views
- Unique visitors
- Top pages
- Referrers
- Countries

## Custom Rules (optional)

### Redirect www to non-www
```
Expression: (http.host eq "www.auto-platform.com")
Action: Dynamic Redirect
Status code: 301
URL: concat("https://auto-platform.com", http.request.uri.path)
```

### Block Admin from non-RO
```
Expression: (http.request.uri.path contains "/admin" and ip.geoip.country ne "RO")
Action: Block
```

## Origin Rules

**Origin Error Page Pass-through:** OFF

**True-Client-IP Header:** ON

**WebSockets:** ON

## Verification

After setup, verify:

1. SSL is working: `https://www.ssllabs.com/ssltest/`
2. Security headers: `https://securityheaders.com/`
3. Speed test: `https://www.webpagetest.org/`
4. DNS propagation: `https://www.whatsmydns.net/`

## Cloudflare API (optional)

For automated management, use Cloudflare API:

```bash
# Get Zone ID
curl -X GET "https://api.cloudflare.com/client/v4/zones" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json"

# Purge cache
curl -X POST "https://api.cloudflare.com/client/v4/zones/ZONE_ID/purge_cache" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

## Troubleshooting

**521 Error (Web server is down):**
- Check if Nginx is running: `systemctl status nginx`
- Check if PM2 is running: `pm2 status`
- Check server IP in Cloudflare DNS

**522 Error (Connection timed out):**
- Check firewall allows Cloudflare IPs
- Verify origin server is accessible

**525 Error (SSL handshake failed):**
- Set SSL mode to "Full" not "Full (strict)"
- Check SSL certificate on origin server

**Too Many Redirects:**
- Set SSL mode to "Full (strict)"
- Remove redirect loops in Nginx config

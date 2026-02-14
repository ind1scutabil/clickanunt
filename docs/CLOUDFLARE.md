# Cloudflare Configuration Guide

**Domain**: clickanunt.ro  
**CDN**: Cloudflare  
**Last Updated**: 2026-02-14

---

## 🌐 DNS CONFIGURATION

### Current Setup
- **A Record**: `clickanunt.ro` → `46.225.69.155` (Proxied ☁️)
- **A Record**: `www.clickanunt.ro` → `46.225.69.155` (Proxied ☁️)
- **SSL/TLS**: Full (strict)

### Verification
```bash
# Check DNS resolution
dig clickanunt.ro
dig www.clickanunt.ro

# Check if proxied through Cloudflare
curl -I https://www.clickanunt.ro | grep -i server
# Should show: server: cloudflare
```

---

## 🔒 SSL/TLS CONFIGURATION

### Settings (in Cloudflare Dashboard)

**SSL/TLS Mode**: Full (strict)
- ✅ Encrypts traffic between browser and Cloudflare
- ✅ Encrypts traffic between Cloudflare and origin server
- ✅ Validates origin certificate

**Edge Certificates**:
- ✅ Always Use HTTPS: ON
- ✅ HSTS: Enabled (max-age=31536000)
- ✅ Minimum TLS Version: TLS 1.2
- ✅ Opportunistic Encryption: ON
- ✅ TLS 1.3: ON

**Origin Server**:
- Use Cloudflare Origin Certificate OR Let's Encrypt
- Certificate location: `/etc/nginx/ssl/` (if using nginx)

---

## ⚡ CACHING CONFIGURATION

### Caching Levels
**Recommended**: Standard

### Browser Cache TTL
**Recommended**: Respect Existing Headers

### Page Rules (Create these)

#### Rule 1: API Routes - No Cache
```
URL Pattern: *clickanunt.ro/api/*
Settings:
  - Cache Level: Bypass
  - Edge Cache TTL: Do not override
```

#### Rule 2: Auth Pages - No Cache
```
URL Pattern: *clickanunt.ro/auth/*
Settings:
  - Cache Level: Bypass
  - Edge Cache TTL: Do not override
```

#### Rule 3: Dashboard - No Cache
```
URL Pattern: *clickanunt.ro/dashboard/*
Settings:
  - Cache Level: Bypass
  - Edge Cache TTL: Do not override
```

#### Rule 4: Static Assets - Aggressive Cache
```
URL Pattern: *clickanunt.ro/_next/static/*
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 year
```

#### Rule 5: Images - Cache
```
URL Pattern: *clickanunt.ro/_next/image*
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 week
```

#### Rule 6: Homepage - Moderate Cache
```
URL Pattern: clickanunt.ro/
Settings:
  - Cache Level: Standard
  - Edge Cache TTL: 1 hour
  - Browser Cache TTL: 1 hour
```

#### Rule 7: Listings - Moderate Cache
```
URL Pattern: *clickanunt.ro/listings/*
Settings:
  - Cache Level: Standard
  - Edge Cache TTL: 10 minutes
  - Browser Cache TTL: 5 minutes
```

---

## 🚦 RATE LIMITING (via Cloudflare)

### Create Rate Limiting Rules

#### Rule 1: Auth Protection
```
Name: Auth Endpoints Rate Limit
Expression: 
  (http.request.uri.path contains "/api/auth/login" or 
   http.request.uri.path contains "/api/auth/register") and
  http.request.method eq "POST"
  
Characteristics: IP Address
Requests: 5 requests
Period: 15 minutes
Action: Block
```

#### Rule 2: API General Limit
```
Name: API General Rate Limit
Expression: 
  http.request.uri.path contains "/api/"
  
Characteristics: IP Address
Requests: 100 requests
Period: 1 minute
Action: Managed Challenge
```

#### Rule 3: Search Protection
```
Name: Search Rate Limit
Expression: 
  http.request.uri.path contains "/api/search"
  
Characteristics: IP Address
Requests: 30 requests
Period: 1 minute
Action: Managed Challenge
```

#### Rule 4: Create Listing Protection
```
Name: Create Listing Rate Limit
Expression: 
  http.request.uri.path contains "/api/listings" and
  http.request.method eq "POST"
  
Characteristics: IP Address
Requests: 10 requests
Period: 1 hour
Action: Block
```

---

## 🛡️ FIREWALL RULES

### Create WAF Rules

#### Rule 1: Block Known Bots
```
Name: Block Bad Bots
Expression: 
  (cf.client.bot) and not (cf.verified_bot_category in {"Search Engine Crawler"})
Action: Block
```

#### Rule 2: Challenge Suspicious Traffic
```
Name: Challenge Suspicious
Expression: 
  (cf.threat_score > 10)
Action: Managed Challenge
```

#### Rule 3: Block Specific Countries (if needed)
```
Name: Geo-blocking
Expression: 
  (ip.geoip.country in {"CN" "RU"})
Action: Challenge
```

#### Rule 4: Protect Admin Routes
```
Name: Admin Route Protection
Expression: 
  (http.request.uri.path contains "/admin/") and
  not (ip.src in {46.225.69.155})
Action: Managed Challenge
```

---

## 🔧 SPEED OPTIMIZATION

### Enable in Cloudflare Dashboard

**Speed → Optimization**:
- ✅ Auto Minify: JavaScript, CSS, HTML
- ✅ Brotli: ON
- ✅ Early Hints: ON
- ✅ Rocket Loader: OFF (can break Next.js)
- ✅ Mirage: ON (image optimization)
- ✅ Polish: Lossless

**Network**:
- ✅ HTTP/2: ON
- ✅ HTTP/3 (QUIC): ON
- ✅ 0-RTT Connection Resumption: ON
- ✅ IPv6 Compatibility: ON
- ✅ WebSockets: ON

**Caching**:
- ✅ Tiered Caching: ON
- ✅ Argo Smart Routing: ON (paid feature, recommended)

---

## 📊 ANALYTICS

### Enable in Cloudflare

**Analytics → Web Analytics**:
- Enable for detailed traffic insights
- No impact on performance (lightweight JS)

**Security → Events**:
- Monitor firewall events
- Track rate limit hits
- Review blocked traffic

---

## 🧹 CACHE MANAGEMENT

### When to Purge Cache

**Always purge after**:
- ✅ Code deployment
- ✅ Content updates
- ✅ Bug fixes affecting cached pages

**How to Purge**:

#### Option 1: Purge Everything (Nuclear)
```
Cloudflare Dashboard → Caching → Purge Everything
```

#### Option 2: Purge by URL (Selective)
```
Cloudflare Dashboard → Caching → Custom Purge
URLs:
  - https://www.clickanunt.ro/
  - https://www.clickanunt.ro/listings
```

#### Option 3: Purge by Tag (Advanced)
```bash
# Via API (requires API token)
curl -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"tags":["auth","listings"]}'
```

### Automatic Purge on Deploy

Add to deploy script:
```bash
# Get Zone ID from Cloudflare dashboard
ZONE_ID="your_zone_id"
CF_API_TOKEN="your_api_token"

curl -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

---

## 🔍 MONITORING

### Key Metrics to Watch

**Analytics → Traffic**:
- Requests per minute
- Bandwidth usage
- Status code distribution (4xx, 5xx)
- Top countries
- Top paths

**Security → Events**:
- Blocked requests
- Challenged requests
- Rate limit hits

**Speed → Performance**:
- Time to First Byte (TTFB)
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)

### Alerts (Recommended)

Create notifications for:
- Spike in 5xx errors (> 10/min)
- Spike in traffic (> 500 req/min)
- Origin unreachable
- SSL certificate expiring

---

## 🚨 TROUBLESHOOTING

### Site Showing Old Content

**Solution**: Purge cache
```
Cloudflare Dashboard → Caching → Purge Everything
```

### 502 Bad Gateway

**Causes**:
- Origin server down
- Origin server too slow (> 100s)
- Connection timeout

**Check**:
```bash
# Bypass Cloudflare (test origin directly)
curl -H "Host: www.clickanunt.ro" http://46.225.69.155/api/health

# Check origin server
ssh root@46.225.69.155 "pm2 status"
```

### 520/521/522 Errors

**520**: Unknown error  
**521**: Origin down  
**522**: Connection timeout

**Solution**:
1. Check origin server is running
2. Check firewall allows Cloudflare IPs
3. Check SSL certificate is valid

### Rate Limit False Positives

**Solution**:
- Adjust rate limits in Cloudflare dashboard
- Whitelist specific IPs if needed
- Use "Managed Challenge" instead of "Block"

---

## 📝 RECOMMENDED SETTINGS SUMMARY

| Setting | Value | Location |
|---------|-------|----------|
| SSL/TLS Mode | Full (strict) | SSL/TLS |
| Always Use HTTPS | ON | SSL/TLS → Edge Certificates |
| HSTS | ON | SSL/TLS → Edge Certificates |
| Min TLS Version | 1.2 | SSL/TLS → Edge Certificates |
| Auto Minify | JS, CSS, HTML | Speed → Optimization |
| Brotli | ON | Speed → Optimization |
| HTTP/2 | ON | Network |
| HTTP/3 | ON | Network |
| WebSockets | ON | Network |
| Browser Cache TTL | Respect Headers | Caching |

---

## 🔗 QUICK LINKS

- **Dashboard**: https://dash.cloudflare.com
- **Zone ID**: Get from Overview → API section
- **API Docs**: https://developers.cloudflare.com/api/
- **Page Rules Limit**: 3 rules (free plan)
- **Rate Limiting**: 1 rule (free plan) - Use WAF instead

---

**For Cloudflare-specific issues, check their status page: https://www.cloudflarestatus.com**

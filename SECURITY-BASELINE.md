# 🔒 OWASP ASVS Security Baseline - Implementation Guide

## 📋 Security Controls Checklist

### ✅ V1: Architecture, Design and Threat Modeling

- [x] **Security architecture documented**
  - Input validation layer
  - Rate limiting middleware
  - CSRF protection
  - Session management
  - Image upload security
  
- [x] **Threat model created**
  - XSS attacks via user input
  - SQL/NoSQL injection
  - CSRF attacks
  - Brute-force attacks
  - Session hijacking
  - Malicious file uploads

---

### ✅ V2: Authentication

#### 2.1 Password Security
- [x] Password minimum length: 8 characters
- [x] Password complexity requirements:
  - At least 1 uppercase letter
  - At least 1 lowercase letter
  - At least 1 digit
  - At least 1 special character
- [x] Maximum password length: 128 characters
- [x] Passwords hashed with bcrypt (implemented in existing code)

#### 2.2 General Authenticator Security
- [x] Secure credential recovery mechanism
- [x] Password reset tokens expire after 1 hour
- [x] Email verification tokens expire after 24 hours

#### 2.3 Authenticator Lifecycle
- [x] JWT tokens with short expiration (15 minutes)
- [x] Refresh tokens with longer expiration (7 days)
- [x] Token rotation on refresh
- [x] Token blacklist for logout

#### 2.7 Out of Band Verifier
- [x] Email verification system
- [x] Secure token generation for email links

#### 2.8 Single Factor One Time Verifier
- [ ] TODO: Implement OTP for 2FA (optional enhancement)

#### 2.9 Cryptographic Verifier
- [x] JWT signed with HS256
- [x] Secure key storage via environment variables
- [x] Separate keys for access and refresh tokens

#### 2.10 Service Authentication
- [x] API authentication via JWT
- [x] Session fingerprinting (user-agent + IP)

---

### ✅ V3: Session Management

#### 3.1 Fundamental Session Management
- [x] Secure cookie attributes:
  - `HttpOnly`: true
  - `Secure`: true (production)
  - `SameSite`: strict
- [x] Session tokens unpredictable (crypto.randomBytes)
- [x] Tokens contain no sensitive data

#### 3.2 Session Binding
- [x] Session fingerprint validation
- [x] User-agent and IP tracking

#### 3.3 Session Termination
- [x] Logout functionality
- [x] Token blacklist for revoked tokens
- [x] Automatic cleanup of expired entries

#### 3.4 Cookie-based Session Management
- [x] Cookie domain properly set
- [x] Cookie path restrictions
- [x] Cookie expiration times

#### 3.5 Token-based Session Management
- [x] JWT tokens stateless
- [x] Refresh token mechanism
- [x] Token rotation on refresh
- [x] No sensitive data in tokens

---

### ✅ V4: Access Control

#### 4.1 General Access Control Design
- [x] Authentication required for protected routes
- [x] Role-based access control (admin routes)
- [x] Middleware enforces access control

#### 4.2 Operation Level Access Control
- [x] User can only modify own listings
- [x] Admin can moderate all content
- [x] API endpoints check ownership

#### 4.3 Other Access Control Considerations
- [x] CSRF protection on state-changing operations
- [x] Origin/Referer validation

---

### ✅ V5: Validation, Sanitization and Encoding

#### 5.1 Input Validation
- [x] Zod schemas for type validation
- [x] String length limits
- [x] Numeric range validation
- [x] Email format validation
- [x] Phone number format validation
- [x] Whitelist approach for allowed values

#### 5.2 Sanitization and Sandboxing
- [x] HTML sanitization with DOMPurify
- [x] Filename sanitization (path traversal prevention)
- [x] SQL string escaping helpers
- [x] NoSQL injection prevention

#### 5.3 Output Encoding
- [x] React auto-escapes output (default protection)
- [x] dangerouslySetInnerHTML only for sanitized content
- [x] URL sanitization

#### 5.4 Memory, String, and Unmanaged Code
- [x] String length limits prevent DoS
- [x] Buffer size limits for uploads

#### 5.5 Deserialization Prevention
- [x] JSON parsing with error handling
- [x] No eval() usage
- [x] No Function() constructor usage

---

### ✅ V6: Stored Cryptography

- [x] JWT secret from environment variables
- [x] Separate secrets for different purposes
- [x] Crypto.randomBytes for secure random generation
- [x] SHA-256 for token hashing
- [ ] TODO: Key rotation mechanism

---

### ✅ V7: Error Handling and Logging

#### 7.1 Log Content
- [x] Error logging implemented
- [x] No sensitive data in logs
- [x] User actions logged (login attempts, etc.)

#### 7.2 Log Processing
- [x] Structured error messages
- [x] Stack traces only in development

#### 7.3 Log Protection
- [x] Logs don't contain passwords or tokens
- [x] Log sanitization helpers

#### 7.4 Error Handling
- [x] Generic error messages to users
- [x] Detailed errors only in development
- [x] Try-catch blocks for async operations

---

### ✅ V8: Data Protection

#### 8.1 General Data Protection
- [x] HTTPS enforced (HSTS header)
- [x] Sensitive data not in URLs
- [x] Secure cookie transmission

#### 8.2 Client-side Data Protection
- [x] No sensitive data in localStorage
- [x] Session storage for temporary data only
- [x] Cookies with Secure and HttpOnly flags

#### 8.3 Sensitive Private Data
- [x] Passwords never stored in plain text
- [x] Payment info not stored (delegated to payment gateway)
- [x] PII access logged

---

### ✅ V9: Communication

#### 9.1 Client Communication Security
- [x] TLS/HTTPS enforced
- [x] HSTS header with preload
- [x] Certificate validation (browser default)

#### 9.2 Server Communication Security
- [x] API connections over HTTPS
- [x] Certificate pinning ready (for mobile apps)

---

### ✅ V10: Malicious Code

#### 10.1 Code Integrity
- [x] CSP headers prevent inline scripts
- [x] Dependency scanning (npm audit)
- [x] No eval() or Function() constructors

#### 10.2 Malicious Code Search
- [x] Image malware scanning infrastructure
- [x] File upload validation
- [x] Magic byte verification

#### 10.3 Application Integrity
- [x] Dependency lockfile (package-lock.json)
- [ ] TODO: Implement Subresource Integrity (SRI)

---

### ✅ V11: Business Logic

#### 11.1 Business Logic Security
- [x] Input validation for business rules
- [x] Rate limiting prevents abuse
- [x] Price range validation
- [x] Listing limits per user

---

### ✅ V12: Files and Resources

#### 12.1 File Upload
- [x] File type validation (magic bytes)
- [x] File size limits (10MB)
- [x] Filename sanitization
- [x] Max files per listing (10)

#### 12.2 File Integrity
- [x] Image processing strips EXIF
- [x] Malware scanning infrastructure ready

#### 12.3 File Execution
- [x] Uploaded files stored with random names
- [x] No direct execution of uploaded files

#### 12.4 File Storage
- [x] Secure filename generation
- [x] Path traversal prevention

#### 12.5 File Download
- [x] Content-Disposition header
- [x] Content-Type validation

#### 12.6 SSRF Protection
- [x] URL validation for external resources
- [x] Protocol whitelist (http/https only)

---

### ✅ V13: API and Web Service

#### 13.1 Generic Web Service Security
- [x] RESTful API design
- [x] JSON responses
- [x] Error messages don't leak info

#### 13.2 RESTful Web Service
- [x] Authentication via JWT
- [x] CSRF protection
- [x] Rate limiting per endpoint

#### 13.3 SOAP Web Service
- [x] N/A (not using SOAP)

#### 13.4 GraphQL
- [x] N/A (not using GraphQL yet)

---

### ✅ V14: Configuration

#### 14.1 Build and Deploy
- [x] Environment-based configuration
- [x] Secrets in environment variables
- [x] No hardcoded credentials

#### 14.2 Dependency
- [x] npm audit for vulnerabilities
- [x] Dependencies up to date
- [ ] TODO: Automated dependency scanning (Snyk/Dependabot)

#### 14.3 Unintended Security Disclosure
- [x] Server headers removed (X-Powered-By)
- [x] Debug mode disabled in production
- [x] Error stack traces hidden in production

#### 14.4 HTTP Security Headers
- [x] Content-Security-Policy
- [x] Strict-Transport-Security (HSTS)
- [x] X-Frame-Options: DENY
- [x] X-Content-Type-Options: nosniff
- [x] Referrer-Policy
- [x] Permissions-Policy

#### 14.5 HTTP Request Header Validation
- [x] Host header validation
- [x] Origin header validation
- [x] Referer header validation

---

## 🧪 Security Testing Checklist

### Manual Testing

#### Authentication Tests
```bash
# Test 1: Login rate limiting
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
  echo ""
done
# Expected: 429 after 5 attempts

# Test 2: Password complexity
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"weak","name":"Test"}'
# Expected: Validation error

# Test 3: SQL injection in login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin'\'' OR 1=1--","password":"test"}'
# Expected: Validation error or safe handling
```

#### CSRF Tests
```bash
# Test 4: CSRF protection
curl -X POST http://localhost:3000/api/listings/create \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","priceAmount":1000}'
# Expected: 403 CSRF validation failed

# Test 5: Valid CSRF token
# (requires valid session cookie and CSRF token from browser)
```

#### XSS Tests
```bash
# Test 6: XSS in title
curl -X POST http://localhost:3000/api/listings/create \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <valid-token>" \
  -H "Cookie: access-token=<valid-token>" \
  -d '{"title":"<script>alert(1)</script>","priceAmount":1000}'
# Expected: Sanitized or rejected

# Test 7: XSS in description
curl -X POST http://localhost:3000/api/listings/create \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","description":"<img src=x onerror=alert(1)>"}'
# Expected: HTML sanitized
```

#### File Upload Tests
```bash
# Test 8: Invalid file type
curl -X POST http://localhost:3000/api/upload \
  -F "file=@malicious.php"
# Expected: 400 Invalid file type

# Test 9: File size limit
dd if=/dev/zero of=large.jpg bs=1M count=20
curl -X POST http://localhost:3000/api/upload \
  -F "file=@large.jpg"
# Expected: 400 File too large

# Test 10: Path traversal in filename
curl -X POST http://localhost:3000/api/upload \
  -F "file=@../../etc/passwd"
# Expected: Filename sanitized
```

#### Security Headers Tests
```bash
# Test 11: Check security headers
curl -I http://localhost:3000/
# Expected headers:
# - Content-Security-Policy
# - Strict-Transport-Security
# - X-Frame-Options: DENY
# - X-Content-Type-Options: nosniff
# - Referrer-Policy

# Test 12: Check API headers
curl -I http://localhost:3000/api/listings
# Expected: CORS headers, no cache headers
```

---

### Automated Testing

#### Dependency Scanning
```bash
# Run npm audit
npm audit

# Check for known vulnerabilities
npm audit fix

# Use Snyk (optional)
npx snyk test
```

#### OWASP ZAP
```bash
# Install OWASP ZAP
# Run baseline scan
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t http://localhost:3000 \
  -r zap-report.html
```

#### Burp Suite
- Configure proxy: localhost:8080
- Browse application
- Review findings in Target > Site map

#### Security Headers Check
```bash
# Use securityheaders.com
curl -I https://your-domain.com | grep -E "(Content-Security|Strict-Transport|X-Frame|X-Content-Type)"
```

---

## 🚀 Deployment Checklist

### Pre-Production
- [ ] All environment variables set
- [ ] JWT secrets are strong (32+ chars)
- [ ] Database credentials secured
- [ ] Redis configured for rate limiting (if using)
- [ ] SSL certificate installed
- [ ] HSTS preload submitted
- [ ] CSP report-uri configured

### Production
- [ ] NODE_ENV=production
- [ ] Debug mode disabled
- [ ] Source maps not deployed
- [ ] Error logging configured (Sentry/LogRocket)
- [ ] Rate limiting tested under load
- [ ] Backup strategy in place
- [ ] Incident response plan ready

### Monitoring
- [ ] Security headers monitored (securityheaders.com)
- [ ] Failed login attempts logged
- [ ] Rate limit violations tracked
- [ ] File upload activity monitored
- [ ] API abuse detected

---

## 📊 Security Metrics

### Key Performance Indicators

| Metric | Target | Measurement |
|--------|--------|-------------|
| Failed logins | <5% | Login failure rate |
| Rate limit hits | <1% | Rate limit violations |
| CSRF rejections | 0 (except attacks) | CSRF failures |
| XSS attempts | Blocked 100% | WAF/validation logs |
| Malicious uploads | Blocked 100% | Upload rejections |
| JWT token expiry | 15 min | Token lifetime |
| Refresh token lifetime | 7 days | Refresh frequency |
| Password reset time | <1 hour | Token expiration |

---

## 🔧 Maintenance Tasks

### Daily
- [ ] Review failed login attempts
- [ ] Check rate limit violations
- [ ] Monitor error logs

### Weekly
- [ ] Run npm audit
- [ ] Review security logs
- [ ] Check CSP violations

### Monthly
- [ ] Rotate JWT secrets
- [ ] Review access logs
- [ ] Update dependencies
- [ ] Run OWASP ZAP scan

### Quarterly
- [ ] Full security audit
- [ ] Penetration testing
- [ ] Update threat model
- [ ] Review incident response plan

---

## 📚 References

- [OWASP ASVS 4.0](https://owasp.org/www-project-application-security-verification-standard/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CWE Top 25](https://cwe.mitre.org/top25/)

---

## 🎯 Implementation Status

### ✅ Completed (85%)
- Input validation & sanitization
- Rate limiting
- CSRF protection
- Security headers
- Session management
- Image upload security
- Brute-force protection

### 🔄 In Progress (10%)
- Token blacklist with Redis
- Advanced malware scanning
- Security event logging

### ⏳ Planned (5%)
- 2FA/OTP implementation
- Automated security scanning CI/CD
- Web Application Firewall (WAF)
- DDoS protection (Cloudflare)

---

**Last Updated**: February 2026  
**Version**: 1.0  
**Contact**: security@clickanunt.ro

# Safari Connection Fix - Rezolvare Eroare "Can't Connect to Server"

## ✅ Probleme Rezolvate

### 1. **Header-e CORS Missing**
Safari este mai strict cu CORS decât alte browsere. Am adăugat header-ele necesare în:
- `middleware.ts` - pentru toate request-urile
- `next.config.ts` - configurație globală
- `app/api/auth/login/route.ts` - pentru autentificare

### 2. **Cookie Settings pentru Safari**
Safari blochează cookie-urile dacă nu sunt configurate corect:
- ✅ `httpOnly: true` - securitate
- ✅ `secure: true` în producție
- ✅ `sameSite: 'strict'` în producție, 'lax' în development
- ✅ `priority: 'high'` - pentru a evita ștergerea
- ✅ `path: '/'` - disponibil pe tot site-ul

### 3. **OPTIONS Preflight Requests**
Safari trimite cereri OPTIONS înainte de POST/PUT/DELETE:
- ✅ Handler dedicat în middleware pentru OPTIONS
- ✅ Returnează 204 No Content cu header-e CORS
- ✅ Timeout de 86400s (24h) pentru cache

### 4. **Security Headers**
Header-e de securitate pentru toate browserele:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security` (în producție)

## 🔧 Ce s-a Modificat

### `middleware.ts`
```typescript
// ✅ Handler pentru OPTIONS (preflight)
if (request.method === 'OPTIONS') {
  return new NextResponse(null, { 
    status: 204, 
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    }
  });
}

// ✅ Header-e CORS pentru toate răspunsurile
response.headers.set('Access-Control-Allow-Origin', origin);
response.headers.set('Access-Control-Allow-Credentials', 'true');
```

### `next.config.ts`
```typescript
// ✅ Header-e globale pentru API
async headers() {
  return [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Credentials', value: 'true' },
        { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, PATCH, OPTIONS' },
        { key: 'Access-Control-Allow-Headers', value: 'X-Requested-With, Content-Type, Authorization' },
      ],
    },
  ];
}
```

### `app/api/auth/login/route.ts`
```typescript
// ✅ Cookie-uri Safari-compatible
response.cookies.set('accessToken', result.accessToken!, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: 60 * 60 * 24 * 7,
  path: '/',
  priority: 'high',
});

// ✅ Header-e CORS explicit
response.headers.set('Access-Control-Allow-Origin', origin);
response.headers.set('Access-Control-Allow-Credentials', 'true');
```

## 🧪 Testare

### 1. Development (localhost)
```bash
# Pornește serverul
npm run dev

# Testează în Safari
open -a Safari http://localhost:3000
```

### 2. Verifică Cookie-urile în Safari
1. Deschide Safari DevTools (Develop menu)
2. Storage tab → Cookies
3. Verifică că există `accessToken` și `refreshToken`

### 3. Testează API-ul
```bash
# Health check
curl http://localhost:3000/api/health

# Login test
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{"email":"owner@autoplatform.ro","password":"admin123"}' \
  -v
```

### 4. Verifică Header-ele CORS
```bash
# Preflight OPTIONS
curl -X OPTIONS http://localhost:3000/api/listings \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -v

# Ar trebui să vezi:
# < HTTP/1.1 204 No Content
# < Access-Control-Allow-Origin: http://localhost:3000
# < Access-Control-Allow-Credentials: true
```

## 🚨 Troubleshooting Safari

### Problema: "Can't connect to server"
**Cauze posibile:**
1. ❌ Cookie-urile sunt blocate în Safari Settings
2. ❌ CORS headers lipsesc
3. ❌ Preflight OPTIONS nu returnează 204
4. ❌ `sameSite` nu este setat corect

**Soluții:**
```bash
# 1. Verifică setările Safari
Safari → Preferences → Privacy → Uncheck "Block all cookies"

# 2. Restart server după modificări
npm run dev

# 3. Clear cache Safari
Safari → Develop → Empty Caches (Cmd + Option + E)

# 4. Verifică consolă browser pentru erori CORS
```

### Problema: Cookie-urile nu se salvează
**Cauze:**
1. ❌ `secure: true` în development fără HTTPS
2. ❌ `sameSite: 'none'` fără `secure: true`
3. ❌ Domain mismatch

**Soluții:**
- ✅ În development: `secure: false`, `sameSite: 'lax'`
- ✅ În production: `secure: true`, `sameSite: 'strict'`

### Problema: CORS errors în Safari console
**Verifică:**
```javascript
// Browser console
fetch('http://localhost:3000/api/health', {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

## 📱 Safari iOS

Safari pe iOS are reguli și mai stricte:

### Cookie Settings iOS
```typescript
// Exact aceleași setări funcționează pe iOS
response.cookies.set('accessToken', token, {
  httpOnly: true,
  secure: true, // MANDATORY pe iOS în production
  sameSite: 'strict',
  path: '/',
});
```

### Private Browsing Mode
Safari Private Mode blochează cookies terță-parte:
- ✅ First-party cookies funcționează
- ❌ Third-party cookies sunt blocate
- ✅ Solution: Folosim cookies first-party (same domain)

## 🌐 Production Checklist

Înainte de deploy în producție:

- [ ] `NEXT_PUBLIC_APP_URL` setat corect în `.env`
- [ ] HTTPS activat (SSL certificat)
- [ ] `secure: true` pentru toate cookie-urile
- [ ] `sameSite: 'strict'` în producție
- [ ] Domain explicit în cookie settings (dacă e necesar)
- [ ] CORS origin specific (nu `*`)
- [ ] Test pe Safari desktop și iOS

## 🔐 Security Benefits

Aceste modificări îmbunătățesc și securitatea:

1. **CSRF Protection** - `sameSite: 'strict'`
2. **XSS Protection** - `httpOnly: true`
3. **Man-in-the-middle** - `secure: true`
4. **Clickjacking** - `X-Frame-Options: DENY`
5. **Content Type Sniffing** - `X-Content-Type-Options: nosniff`

## 📚 Referințe

- [Safari Cookie Policy](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/)
- [MDN CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Next.js Headers](https://nextjs.org/docs/api-reference/next.config.js/headers)
- [Safari Developer Tools](https://developer.apple.com/safari/tools/)

---

**Status:** ✅ REZOLVAT
**Testat:** Safari 17.x, Safari iOS 17.x
**Data:** 8 Februarie 2026

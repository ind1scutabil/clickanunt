# Security Integration Guide - Exemple Practice

## 📚 Ghid Complet de Integrare Securitate

Acest document conține exemple concrete de cum să integrezi modulele de securitate în rutele API existente.

---

## 1. 🔐 API Route cu Validare Completă

### Exemplu: POST /api/listings/create

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createRateLimiter, RATE_LIMITS } from '@/lib/security/rate-limit';
import { listingValidationSchema, sanitizeHTML } from '@/lib/security/input-validation';
import { verifyAccessToken } from '@/lib/security/tokens';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // 1. Rate Limiting
    const rateLimiter = createRateLimiter(RATE_LIMITS.CREATE_LISTING);
    const rateLimit = await rateLimiter(request);
    
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: rateLimit.retryAfter },
        { 
          status: 429,
          headers: { 'Retry-After': rateLimit.retryAfter?.toString() || '60' }
        }
      );
    }
    
    // 2. Authentication
    const token = request.cookies.get('access-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = verifyAccessToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    // 3. Input Validation
    const body = await request.json();
    const validation = listingValidationSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validation.error.issues.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      );
    }
    
    const data = validation.data;
    
    // 4. Sanitize HTML content
    if (data.description) {
      data.description = sanitizeHTML(data.description);
    }
    
    // 5. Business Logic
    const listingCount = await prisma.listing.count({
      where: { userId: user.userId, status: 'ACTIVE' }
    });
    
    if (listingCount >= 100) {
      return NextResponse.json(
        { error: 'Ai atins limita de 100 anunțuri active' },
        { status: 403 }
      );
    }
    
    // 6. Create Listing
    const listing = await prisma.listing.create({
      data: {
        ...data,
        userId: user.userId,
        status: 'ACTIVE',
      }
    });
    
    return NextResponse.json({ success: true, listing }, { status: 201 });
    
  } catch (error) {
    console.error('[CREATE_LISTING_ERROR]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## 2. 🔓 Login Route cu Brute-Force Protection

### POST /api/auth/login

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createRateLimiter, RATE_LIMITS, loginBruteForce } from '@/lib/security/rate-limit';
import { loginSchema } from '@/lib/security/input-validation';
import { generateAccessToken, generateRefreshToken, getSecureCookieOptions } from '@/lib/security/tokens';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';

export async function POST(request: NextRequest) {
  try {
    // 1. Rate Limiting
    const rateLimiter = createRateLimiter(RATE_LIMITS.LOGIN);
    const rateLimit = await rateLimiter(request);
    
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Prea multe încercări. Încearcă mai târziu.' },
        { status: 429 }
      );
    }
    
    // 2. Validate Input
    const body = await request.json();
    const validation = loginSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Date invalide' },
        { status: 400 }
      );
    }
    
    const { email, password } = validation.data;
    
    // 3. Check Brute-Force Protection
    const canAttempt = await loginBruteForce.isAllowed(email);
    if (!canAttempt) {
      return NextResponse.json(
        { error: 'Contul tău este temporar blocat din cauza prea multor încercări eșuate.' },
        { status: 429 }
      );
    }
    
    // 4. Find User
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
        emailVerified: true,
      }
    });
    
    if (!user) {
      await loginBruteForce.recordViolation(email);
      return NextResponse.json(
        { error: 'Email sau parolă incorectă' },
        { status: 401 }
      );
    }
    
    // 5. Verify Password
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      await loginBruteForce.recordViolation(email);
      return NextResponse.json(
        { error: 'Email sau parolă incorectă' },
        { status: 401 }
      );
    }
    
    // 6. Check Email Verification
    if (!user.emailVerified) {
      return NextResponse.json(
        { error: 'Te rugăm să verifici email-ul înainte de login' },
        { status: 403 }
      );
    }
    
    // 7. Reset Brute-Force Counter
    await loginBruteForce.reset(email);
    
    // 8. Generate Tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    
    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    
    // 9. Set Cookies
    const response = NextResponse.json({ 
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      }
    });
    
    response.cookies.set('access-token', accessToken, getSecureCookieOptions());
    response.cookies.set('refresh-token', refreshToken, {
      ...getSecureCookieOptions(),
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });
    
    return response;
    
  } catch (error) {
    console.error('[LOGIN_ERROR]', error);
    return NextResponse.json(
      { error: 'Eroare de server' },
      { status: 500 }
    );
  }
}
```

---

## 3. 🖼️ Image Upload Route

### POST /api/listings/[id]/images

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createRateLimiter, RATE_LIMITS } from '@/lib/security/rate-limit';
import { validateImageUpload, processImage, generateThumbnail, generateSecureFilename } from '@/lib/security/image-upload';
import { verifyAccessToken } from '@/lib/security/tokens';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Rate Limiting
    const rateLimiter = createRateLimiter(RATE_LIMITS.IMAGE_UPLOAD);
    const rateLimit = await rateLimiter(request);
    
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Prea multe upload-uri. Așteaptă câteva minute.' },
        { status: 429 }
      );
    }
    
    // 2. Authentication
    const token = request.cookies.get('access-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = verifyAccessToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    // 3. Authorization (check listing ownership)
    const listing = await prisma.listing.findUnique({
      where: { id: params.id },
      select: { userId: true }
    });
    
    if (!listing || listing.userId !== user.userId) {
      return NextResponse.json(
        { error: 'Nu ai permisiunea să modifici acest anunț' },
        { status: 403 }
      );
    }
    
    // 4. Parse FormData
    const formData = await request.formData();
    const file = formData.get('image') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'Niciun fișier trimis' },
        { status: 400 }
      );
    }
    
    // 5. Convert to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // 6. Validate Image
    const validation = await validateImageUpload(
      buffer,
      file.name,
      file.size,
      file.type
    );
    
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }
    
    // 7. Process Image
    const processed = await processImage(buffer);
    const thumbnail = await generateThumbnail(buffer);
    
    // 8. Generate Secure Filenames
    const secureFilename = generateSecureFilename(file.name);
    const thumbnailFilename = `thumb_${secureFilename}`;
    
    // 9. Save to Disk (sau S3/Cloudflare R2)
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'listings', params.id);
    await writeFile(join(uploadDir, secureFilename), processed.buffer);
    await writeFile(join(uploadDir, thumbnailFilename), thumbnail);
    
    // 10. Save to Database
    const image = await prisma.listingImage.create({
      data: {
        listingId: params.id,
        filename: secureFilename,
        thumbnailFilename,
        url: `/uploads/listings/${params.id}/${secureFilename}`,
        thumbnailUrl: `/uploads/listings/${params.id}/${thumbnailFilename}`,
        width: processed.width,
        height: processed.height,
        format: processed.format,
        size: processed.size,
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      image 
    }, { status: 201 });
    
  } catch (error) {
    console.error('[IMAGE_UPLOAD_ERROR]', error);
    return NextResponse.json(
      { error: 'Eroare la upload imagine' },
      { status: 500 }
    );
  }
}
```

---

## 4. 🔍 Search Route cu Rate Limiting

### GET /api/listings/search

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createRateLimiter, RATE_LIMITS } from '@/lib/security/rate-limit';
import { searchQuerySchema, sanitizeText } from '@/lib/security/input-validation';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // 1. Rate Limiting
    const rateLimiter = createRateLimiter(RATE_LIMITS.SEARCH);
    const rateLimit = await rateLimiter(request);
    
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Prea multe căutări. Așteaptă puțin.' },
        { status: 429 }
      );
    }
    
    // 2. Parse Query Parameters
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const page = parseInt(searchParams.get('page') || '1');
    
    // 3. Validate Input
    const validation = searchQuerySchema.safeParse({
      query,
      category,
      minPrice: minPrice ? parseInt(minPrice) : undefined,
      maxPrice: maxPrice ? parseInt(maxPrice) : undefined,
    });
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Parametri invalizi' },
        { status: 400 }
      );
    }
    
    const validData = validation.data;
    
    // 4. Sanitize Query
    const safeQuery = sanitizeText(validData.query);
    
    // 5. Build Search Query
    const where: any = {
      status: 'ACTIVE',
    };
    
    if (safeQuery) {
      where.OR = [
        { title: { contains: safeQuery, mode: 'insensitive' } },
        { description: { contains: safeQuery, mode: 'insensitive' } },
      ];
    }
    
    if (validData.category) {
      where.category = validData.category;
    }
    
    if (validData.minPrice !== undefined || validData.maxPrice !== undefined) {
      where.priceAmount = {};
      if (validData.minPrice !== undefined) {
        where.priceAmount.gte = validData.minPrice;
      }
      if (validData.maxPrice !== undefined) {
        where.priceAmount.lte = validData.maxPrice;
      }
    }
    
    // 6. Execute Search
    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        take: 20,
        skip: (page - 1) * 20,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          priceAmount: true,
          priceCurrency: true,
          category: true,
          images: {
            take: 1,
            select: { thumbnailUrl: true }
          },
          createdAt: true,
        }
      }),
      prisma.listing.count({ where })
    ]);
    
    return NextResponse.json({
      listings,
      pagination: {
        page,
        pageSize: 20,
        total,
        totalPages: Math.ceil(total / 20),
      }
    });
    
  } catch (error) {
    console.error('[SEARCH_ERROR]', error);
    return NextResponse.json(
      { error: 'Eroare la căutare' },
      { status: 500 }
    );
  }
}
```

---

## 5. 🗑️ Delete Route cu Authorization

### DELETE /api/listings/[id]

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAccessToken } from '@/lib/security/tokens';
import { validateId } from '@/lib/security/input-validation';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Validate ID format
    if (!validateId(params.id)) {
      return NextResponse.json(
        { error: 'ID invalid' },
        { status: 400 }
      );
    }
    
    // 2. Authentication
    const token = request.cookies.get('access-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = verifyAccessToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    // 3. Find Listing
    const listing = await prisma.listing.findUnique({
      where: { id: params.id },
      select: { 
        id: true,
        userId: true,
        title: true,
      }
    });
    
    if (!listing) {
      return NextResponse.json(
        { error: 'Anunț negăsit' },
        { status: 404 }
      );
    }
    
    // 4. Authorization (owner or admin)
    if (listing.userId !== user.userId && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Nu ai permisiunea să ștergi acest anunț' },
        { status: 403 }
      );
    }
    
    // 5. Soft Delete
    await prisma.listing.update({
      where: { id: params.id },
      data: { 
        status: 'DELETED',
        deletedAt: new Date(),
      }
    });
    
    // 6. Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'DELETE_LISTING',
        resourceType: 'listing',
        resourceId: params.id,
        userId: user.userId,
        metadata: {
          title: listing.title,
          deletedBy: user.role === 'admin' ? 'admin' : 'owner',
        }
      }
    });
    
    return NextResponse.json({ 
      success: true,
      message: 'Anunț șters cu succes'
    });
    
  } catch (error) {
    console.error('[DELETE_LISTING_ERROR]', error);
    return NextResponse.json(
      { error: 'Eroare la ștergere' },
      { status: 500 }
    );
  }
}
```

---

## 6. 📧 Contact Form cu CSRF Protection

### POST /api/contact

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createRateLimiter, RATE_LIMITS } from '@/lib/security/rate-limit';
import { contactFormSchema, sanitizeHTML } from '@/lib/security/input-validation';
import { validateCsrfToken } from '@/lib/security/csrf';
import { sendEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    // 1. Rate Limiting
    const rateLimiter = createRateLimiter(RATE_LIMITS.API_GENERAL);
    const rateLimit = await rateLimiter(request);
    
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Prea multe mesaje. Așteaptă puțin.' },
        { status: 429 }
      );
    }
    
    // 2. CSRF Protection
    const csrfToken = request.headers.get('x-csrf-token');
    if (!csrfToken || !validateCsrfToken(csrfToken, request)) {
      return NextResponse.json(
        { error: 'CSRF validation failed' },
        { status: 403 }
      );
    }
    
    // 3. Validate Input
    const body = await request.json();
    const validation = contactFormSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Date invalide',
          details: validation.error.issues
        },
        { status: 400 }
      );
    }
    
    const { name, email, subject, message } = validation.data;
    
    // 4. Sanitize HTML
    const safeMessage = sanitizeHTML(message);
    
    // 5. Send Email
    await sendEmail({
      to: 'support@clickanunt.ro',
      from: 'noreply@clickanunt.ro',
      replyTo: email,
      subject: `Contact Form: ${subject}`,
      html: `
        <h2>Mesaj nou de la ${name}</h2>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subiect:</strong> ${subject}</p>
        <hr>
        ${safeMessage}
      `
    });
    
    // 6. Save to Database (optional)
    await prisma.contactMessage.create({
      data: {
        name,
        email,
        subject,
        message: safeMessage,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      }
    });
    
    return NextResponse.json({ 
      success: true,
      message: 'Mesaj trimis cu succes!'
    });
    
  } catch (error) {
    console.error('[CONTACT_ERROR]', error);
    return NextResponse.json(
      { error: 'Eroare la trimitere mesaj' },
      { status: 500 }
    );
  }
}
```

---

## 7. 🔄 Token Refresh Route

### POST /api/auth/refresh

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { 
  verifyRefreshToken, 
  generateAccessToken, 
  generateRefreshToken,
  shouldRotateToken,
  getSecureCookieOptions,
  tokenBlacklist
} from '@/lib/security/tokens';

export async function POST(request: NextRequest) {
  try {
    // 1. Get Refresh Token
    const refreshToken = request.cookies.get('refresh-token')?.value;
    
    if (!refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token' },
        { status: 401 }
      );
    }
    
    // 2. Check if blacklisted
    if (tokenBlacklist.isBlacklisted(refreshToken)) {
      return NextResponse.json(
        { error: 'Token revoked' },
        { status: 401 }
      );
    }
    
    // 3. Verify Token
    const payload = verifyRefreshToken(refreshToken);
    
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      );
    }
    
    // 4. Generate New Access Token
    const newAccessToken = generateAccessToken({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    });
    
    // 5. Check if Refresh Token needs rotation
    let newRefreshToken = refreshToken;
    
    if (shouldRotateToken(payload.iat)) {
      // Blacklist old refresh token
      tokenBlacklist.add(refreshToken, 7 * 24 * 60 * 60); // 7 days
      
      // Generate new refresh token
      newRefreshToken = generateRefreshToken({
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
      });
    }
    
    // 6. Set Cookies
    const response = NextResponse.json({ success: true });
    
    response.cookies.set('access-token', newAccessToken, getSecureCookieOptions());
    
    if (newRefreshToken !== refreshToken) {
      response.cookies.set('refresh-token', newRefreshToken, {
        ...getSecureCookieOptions(),
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });
    }
    
    return response;
    
  } catch (error) {
    console.error('[REFRESH_TOKEN_ERROR]', error);
    return NextResponse.json(
      { error: 'Token refresh failed' },
      { status: 500 }
    );
  }
}
```

---

## 8. 🚪 Logout Route

### POST /api/auth/logout

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { tokenBlacklist } from '@/lib/security/tokens';

export async function POST(request: NextRequest) {
  try {
    // 1. Get Tokens
    const accessToken = request.cookies.get('access-token')?.value;
    const refreshToken = request.cookies.get('refresh-token')?.value;
    
    // 2. Blacklist Tokens
    if (accessToken) {
      tokenBlacklist.add(accessToken, 15 * 60); // 15 min
    }
    
    if (refreshToken) {
      tokenBlacklist.add(refreshToken, 7 * 24 * 60 * 60); // 7 days
    }
    
    // 3. Clear Cookies
    const response = NextResponse.json({ success: true });
    
    response.cookies.set('access-token', '', { maxAge: 0 });
    response.cookies.set('refresh-token', '', { maxAge: 0 });
    
    return response;
    
  } catch (error) {
    console.error('[LOGOUT_ERROR]', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}
```

---

## 9. ⚙️ Environment Variables

### .env.local

```bash
# Database
DATABASE_URL="postgresql://..."

# JWT Secrets (Generate with: openssl rand -hex 32)
JWT_SECRET="your-super-secret-jwt-key-here-32-chars-minimum"
JWT_REFRESH_SECRET="different-secret-for-refresh-tokens-here"

# Rate Limiting (Optional - Redis)
REDIS_URL="redis://localhost:6379"

# File Upload
MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_DIR="./public/uploads"

# Email
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Security
NODE_ENV="production"
ALLOWED_ORIGINS="https://clickanunt.ro,https://www.clickanunt.ro"

# Malware Scanning (Optional)
VIRUSTOTAL_API_KEY="your-api-key"
CLAMAV_HOST="localhost"
CLAMAV_PORT=3310
```

---

## 10. 📊 Logging & Monitoring

### lib/audit.ts

```typescript
import { prisma } from './prisma';

export async function auditLog({
  action,
  resourceType,
  resourceId,
  userId,
  ipAddress,
  userAgent,
  metadata = {},
}: {
  action: string;
  resourceType: string;
  resourceId?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        resourceType,
        resourceId,
        userId,
        ipAddress,
        userAgent,
        metadata,
        timestamp: new Date(),
      }
    });
  } catch (error) {
    console.error('[AUDIT_LOG_ERROR]', error);
    // Don't throw - logging failure shouldn't break app
  }
}

// Usage in API routes:
await auditLog({
  action: 'CREATE_LISTING',
  resourceType: 'listing',
  resourceId: listing.id,
  userId: user.userId,
  ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
  userAgent: request.headers.get('user-agent') || 'unknown',
  metadata: { title: listing.title, category: listing.category }
});
```

---

## ✅ Checklist Integrare

- [ ] Adaugă rate limiting pe toate rutele API
- [ ] Validează input cu Zod schemas
- [ ] Sanitizează HTML în câmpurile text
- [ ] Verifică autentificare JWT
- [ ] Verifică autorizare (owner/admin)
- [ ] Implementează CSRF pe POST/PUT/DELETE
- [ ] Adaugă audit logging
- [ ] Testează cu security-test.sh
- [ ] Review error messages (fără info sensibile)
- [ ] Activează HTTPS în producție

---

*Ghid creat: 2025 | ClickAnunt Security Team*

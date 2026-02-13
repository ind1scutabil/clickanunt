# System Architecture

## Overview

ClickAnunț is a modern classified ads platform built with a serverless-first approach using Next.js App Router and PostgreSQL.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Cloudflare CDN                          │
│  (Bot Protection, DDoS, SSL, Edge Caching, DNS)            │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                   Nginx Reverse Proxy                       │
│              (Port 80/443 → Port 3000)                     │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│            Next.js 16 Application (PM2)                     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │           App Router (app/)                         │  │
│  │  - Pages (Server Components)                       │  │
│  │  - API Routes (Route Handlers)                     │  │
│  │  - Client Components                               │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │         Business Logic Layer (lib/)                 │  │
│  │  - Authentication (JWT, 2FA)                       │  │
│  │  - Security (CSRF, Rate Limiting, Turnstile)      │  │
│  │  - Database Client (Prisma)                       │  │
│  │  - Payments (Stripe)                              │  │
│  │  - Email (Nodemailer)                             │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│              PostgreSQL Database                            │
│  - User accounts & authentication                          │
│  - Listings & categories                                   │
│  - Messages & conversations                                │
│  - Invoices & billing data                                 │
│  - Audit logs & security events                            │
└─────────────────────────────────────────────────────────────┘

External Services:
├─ Stripe API (Payments)
├─ Cloudflare Turnstile (Bot Protection)
├─ SMTP Server (Email)
└─ OpenAI API (Optional - Content Moderation)
```

## Components

### Frontend Layer

**Technology**: Next.js 16 with React Server Components

- Server Components for SEO and performance
- Client Components for interactivity
- Tailwind CSS for styling
- Form validation with Zod

### API Layer

**Technology**: Next.js Route Handlers

- RESTful API design
- Input validation middleware
- Security middleware (CSRF, Turnstile, Rate Limiting)
- Authentication guards
- Error handling

### Business Logic Layer

**Core Modules**:

1. **Authentication** (`lib/auth.ts`)
   - JWT token generation and validation
   - Password hashing with bcrypt
   - 2FA for admin users
   - Session management

2. **Security** (`lib/security/`)
   - CSRF token validation
   - Rate limiting (IP-based)
   - Cloudflare Turnstile integration
   - Input sanitization
   - Audit logging

3. **Database** (`lib/db.ts`)
   - Prisma client
   - Connection pooling
   - Query optimization
   - Transaction support

4. **Payments** (`lib/stripe.ts`)
   - Stripe integration
   - Invoice generation
   - Webhook handling
   - VAT calculation

5. **Messaging** (`lib/messaging.ts`)
   - Real-time messaging
   - Thread management
   - Notification system

### Database Layer

**Technology**: PostgreSQL 14+ with Prisma ORM

**Schema Design**:

- Users (accounts, authentication, profiles)
- Listings (ads, categories, images)
- Messages (conversations, threads)
- Invoices (billing, VAT)
- AuditLogs (security, tracking)
- Subscriptions (pricing tiers)

### Infrastructure

**Deployment**:
- Ubuntu 20.04+ VPS
- PM2 process manager
- Nginx reverse proxy
- Cloudflare CDN

**Security**:
- SSL/TLS certificates
- Firewall (UFW)
- Regular backups
- Log rotation

## Data Flow

### User Registration

```
User → Turnstile → API → Validation → Hash Password → Database → JWT → Response
```

### Listing Creation

```
User → Auth Check → Upload Images → Validation → Database → Index → Response
```

### Payment Flow

```
User → Stripe Checkout → Webhook → Verify → Database → Invoice → Email
```

## Security Architecture

### Authentication Flow

1. User submits credentials
2. Turnstile verification
3. CSRF token validation
4. Rate limit check
5. Credentials verification
6. JWT generation
7. Cookie setting (httpOnly, secure)

### Authorization Levels

- **Public**: Anyone can view listings
- **User**: Authenticated users can create listings, message
- **Business**: Can access invoicing, business features
- **Moderator**: Can moderate content
- **Admin**: Full system access + 2FA required

### Security Measures

- **Input Validation**: Zod schemas
- **SQL Injection**: Parameterized queries (Prisma)
- **XSS**: React auto-escaping + CSP headers
- **CSRF**: Token-based protection
- **Bot Protection**: Cloudflare Turnstile
- **Rate Limiting**: IP-based limits
- **Password Security**: bcrypt with salts
- **Session Security**: JWT with rotation

## Performance Optimizations

### Caching Strategy

- **CDN**: Cloudflare edge caching
- **Static Assets**: Immutable cache headers
- **API Responses**: Conditional based on data freshness
- **Database**: Query optimization, indexes

### Build Optimization

- Turbopack for fast rebuilds
- Code splitting
- Tree shaking
- Image optimization

## Monitoring & Logging

- PM2 process monitoring
- Application logs (PM2)
- Database query logs
- Audit logs for security events
- Error tracking

## Scalability Considerations

### Current Architecture

- Single server deployment
- Vertical scaling ready
- Database connection pooling

### Future Scaling

- Horizontal scaling with load balancer
- Database read replicas
- Redis for caching
- Message queue for async tasks
- Microservices for specific features

## Development Workflow

```
Development → Testing → Build → Deploy → Monitor
     ↓           ↓         ↓        ↓         ↓
  Local      Jest/PW   Turbopack   PM2   PM2 Logs
```

## Technology Choices

### Why Next.js 16?

- App Router for modern routing
- Server Components for performance
- Built-in optimizations
- TypeScript support
- Easy deployment

### Why PostgreSQL?

- ACID compliance
- Mature ecosystem
- Strong data integrity
- JSON support for flexibility
- Proven performance

### Why Prisma?

- Type-safe queries
- Automatic migrations
- Great TypeScript integration
- Developer experience

### Why PM2?

- Process management
- Zero-downtime restarts
- Log management
- Monitoring

## API Design Principles

- RESTful conventions
- Consistent error responses
- Versioning ready
- Rate limiting
- Authentication required
- Input validation
- Output sanitization

## Database Design Principles

- Normalized schema
- Foreign key constraints
- Indexes on frequent queries
- Soft deletes for important data
- Audit trails
- UTC timestamps

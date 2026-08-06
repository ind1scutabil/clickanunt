import type { NextConfig } from "next";

function getCdnHostname(): string | null {
  const raw = process.env.NEXT_PUBLIC_CDN_URL || process.env.CDN_URL || "";
  if (!raw) return null;
  try {
    const withProto = raw.startsWith("http") ? raw : `https://${raw}`;
    const u = new URL(withProto);
    return u.hostname || null;
  } catch {
    return null;
  }
}

const cdnHostname = getCdnHostname();

const nextConfig: NextConfig = {
  reactStrictMode: false, // Disabled - causing hydration errors in production
  poweredByHeader: false,
  compress: true,

  /** Client bundle trebuie să vadă același host CDN ca serverul pentru isValidListingPhotoUrl / cdnOrAppHostMatches */
  env: {
    NEXT_PUBLIC_CDN_URL: process.env.NEXT_PUBLIC_CDN_URL || process.env.CDN_URL || '',
  },
  
  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: 'clickanunt.ro',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.clickanunt.ro',
        pathname: '/**',
      },
      ...(cdnHostname
        ? [
            {
              protocol: 'https',
              hostname: cdnHostname,
              pathname: '/**',
            },
          ]
        : []),
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  experimental: {
    optimizePackageImports: ['react', 'react-dom'],
  },
  
  // Production optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  /** Legacy numeric-suffixed URLs (pre-restructure) → clean canonical hubs (permanent: true ⇒ 308). */
  async redirects() {
    return [
      { source: "/sport-1", destination: "/sport", permanent: true },
      { source: "/locuri-de-munca/arad-2", destination: "/locuri-de-munca/arad", permanent: true },
      { source: "/servicii/arad-3", destination: "/servicii/arad", permanent: true },
      {
        source:
          "/:categorySlug(auto|imobiliare|electronice|moda|casa-si-gradina|sport|copii|animale|locuri-de-munca|servicii|agricultura|altele)-:legacyId(\\d+)",
        destination: "/:categorySlug",
        permanent: true,
      },
    ];
  },

  /** Pretty sitemap filenames → internal route handlers (see `SEO_IMPLEMENTATION_REPORT.md`). */
  async rewrites() {
    return [
      { source: "/sitemap-categories.xml", destination: "/sitemap-serve/categories" },
      { source: "/sitemap-cities.xml", destination: "/sitemap-serve/cities" },
      { source: "/sitemap-listings.xml", destination: "/sitemap-serve/listings-index" },
      { source: "/sitemap-listings-:chunk.xml", destination: "/sitemap-serve/listings/:chunk" },
      { source: "/sitemap-auto-hubs.xml", destination: "/sitemap-serve/auto-hubs" },
      { source: "/sitemap-images.xml", destination: "/sitemap-serve/images-index" },
      { source: "/sitemap-images-:chunk.xml", destination: "/sitemap-serve/images/:chunk" },
    ];
  },
  
  // Security headers (suplimentar față de proxy.ts la edge)
  async headers() {
    const baseHeaders: any = [
      {
        key: 'X-DNS-Prefetch-Control',
        value: 'on'
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff'
      },
      {
        key: 'X-Frame-Options',
        value: 'DENY'
      },
      {
        key: 'X-XSS-Protection',
        value: '1; mode=block'
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin'
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://js.stripe.com")'
      },
      {
        key: 'Cache-Control',
        value: 'public, max-age=3600, must-revalidate'
      },
      {
        key: 'Content-Disposition',
        value: 'inline'
      },
      {
        // CSP Security Policy - Enterprise Grade
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          // Script: allow self + inline (Next.js requires) + GTM + Clarity + Stripe
          "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.clarity.ms https://scripts.clarity.ms https://cdn.jsdelivr.net https://js.stripe.com https://static.cloudflareinsights.com",
          // Style: allow self + inline (styled-components/emotion require) + Google Fonts
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          // Fonts: Google Fonts + data URIs
          "font-src 'self' https://fonts.gstatic.com data:",
          // Images: self + data + blob + https (for external images)
          "img-src 'self' data: blob: https:",
          // Connect: self + API + GA4 regional collect + Clarity + Stripe
          // GA4: https://developers.google.com/tag-platform/security/guides/csp#google_analytics_4_google_analytics
          // Clarity: https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-csp
          "connect-src 'self' https://www.clickanunt.ro https://clickanunt.ro https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://*.clarity.ms https://c.bing.com https://api.stripe.com https://cloudflareinsights.com https://static.cloudflareinsights.com",
          // Frame: allow Stripe iframes
          "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
          // Frame ancestors: deny embedding
          "frame-ancestors 'none'",
          // Base URI: restrict to same origin
          "base-uri 'self'",
          // Form action: restrict to same origin
          "form-action 'self'",
        ].join('; ')
      }
    ];
    
    // HSTS: applied per-request in proxy.ts (host-aware; skipped on localhost only).
    // next.config cannot vary headers by Host, so avoid blanket HSTS here.

    const headersWithoutCacheControl = baseHeaders.filter(
      (h: { key: string }) => h.key !== 'Cache-Control'
    );

    return [
      {
        // Default page cache — exclude upload serve so route handler sets per-status Cache-Control.
        source: '/:path((?!api/uploads/serve$).*)',
        headers: baseHeaders,
      },
      {
        /**
         * Homepage shows a live "N anunțuri în catalog" count (see app/page.tsx /
         * lib/home-page-stats.ts). It is statically rendered by Next.js with a 5-minute
         * ISR window and revalidated on-demand after listing mutations
         * (lib/cache/revalidate-marketplace.ts). The blanket `max-age=3600` used above for
         * the rest of the site would let a visitor's own browser keep showing a snapshot up
         * to an hour old — long past both the ISR window and any on-demand revalidation —
         * which is the exact staleness reported in FAZA 22. This block only overrides the
         * `Cache-Control` key for `/` (Next.js header override rule: last match wins per
         * key — https://nextjs.org/docs/app/api-reference/config/next-config-js/headers);
         * all other security headers from the catch-all above still apply unchanged.
         * `max-age=0, must-revalidate` forces every navigation to re-check with the origin
         * (Next.js then serves its already-revalidated static render — this does not add
         * DB load per request; it only removes the browser's own hour-long local cache).
         */
        source: '/',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      {
        // Security/CSP only; Cache-Control owned by app/api/uploads/serve/route.ts (immutable 200, no-store 404).
        source: '/api/uploads/serve',
        headers: headersWithoutCacheControl,
      },
      {
        // Don't cache dynamic form pages
        source: '/listings/new',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate'
          },
          {
            key: 'Pragma',
            value: 'no-cache'
          },
          {
            key: 'Expires',
            value: '0'
          }
        ]
      },
      {
        // API routes with CORS for Safari (OPTIONS preflight handled in app/api/cors)
        // Public listing images are served at /api/uploads/serve — excluded here so
        // app/api/uploads/serve/route.ts owns Cache-Control (immutable 200, no-store 404).
        // Blanket no-store on /api/* was overriding that handler on every image request.
        source: '/api/:path((?!uploads/serve$).*)',
        headers: [
          /**
           * Rewrite Cache-Control vs catch-all `/:path*` above: public CDN/browser cache pe răspunsuri
           * `/api/*` produce 401/JSON utilizator-specific și trebuie ne-stocate + Vary.
           */
          {
            key: 'Cache-Control',
            value: 'private, no-store, max-age=0, must-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
          {
            key: 'Vary',
            value: 'Cookie, Authorization',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, PATCH, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-Requested-With, Content-Type, Authorization, x-csrf-token'
          },
          {
            key: 'Access-Control-Max-Age',
            value: '86400'
          },
        ],
      },
    ];
  },
};

export default nextConfig;

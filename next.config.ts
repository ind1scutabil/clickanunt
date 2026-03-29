import type { NextConfig } from "next";

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
          // Script: allow self + inline (Next.js requires) + GTM + Stripe
          "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://cdn.jsdelivr.net https://js.stripe.com",
          // Style: allow self + inline (styled-components/emotion require) + Google Fonts
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          // Fonts: Google Fonts + data URIs
          "font-src 'self' https://fonts.gstatic.com data:",
          // Images: self + data + blob + https (for external images)
          "img-src 'self' data: blob: https:",
          // Connect: self + API endpoints + Stripe API
          "connect-src 'self' https://www.clickanunt.ro https://clickanunt.ro https://api.stripe.com",
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
    
    if (process.env.NODE_ENV === 'production') {
      baseHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload'
      });
    }
    
    return [
      {
        source: '/:path*',
        headers: baseHeaders,
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
        source: '/api/:path*',
        headers: [
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
            value: 'X-Requested-With, Content-Type, Authorization'
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

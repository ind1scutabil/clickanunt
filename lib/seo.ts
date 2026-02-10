/**
 * SEO Utilities for Enterprise-Level Optimization
 * 
 * Features:
 * - Dynamic meta tags per page
 * - OpenGraph and Twitter Card generation
 * - JSON-LD structured data
 * - Canonical URL management
 * - Sitemap generation utilities
 */

interface SEOConfig {
  title: string;
  description: string;
  keywords?: string[];
  canonical?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'product';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  noindex?: boolean;
}

/**
 * Generate complete metadata for Next.js pages
 */
export function generateMetadata(config: SEOConfig) {
  const {
    title,
    description,
    keywords = [],
    canonical,
    ogImage = '/images/og-default.jpg',
    ogType = 'website',
    author,
    publishedTime,
    modifiedTime,
    noindex = false,
  } = config;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.clickanunt.ro';
  const fullTitle = title.includes('ClickAnunț') ? title : `${title} | ClickAnunț`;
  const canonicalUrl = canonical || siteUrl;

  return {
    title: fullTitle,
    description,
    keywords: keywords.join(', '),
    authors: author ? [{ name: author }] : undefined,
    robots: noindex ? 'noindex,nofollow' : 'index,follow',
    
    // Canonical URL
    alternates: {
      canonical: canonicalUrl,
    },

    // OpenGraph
    openGraph: {
      type: ogType,
      locale: 'ro_RO',
      url: canonicalUrl,
      title: fullTitle,
      description,
      siteName: 'ClickAnunț',
      images: [
        {
          url: ogImage.startsWith('http') ? ogImage : `${siteUrl}${ogImage}`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
    },

    // Twitter Card
    twitter: {
      card: 'summary_large_image',
      site: '@clickanunt',
      creator: '@clickanunt',
      title: fullTitle,
      description,
      images: [ogImage.startsWith('http') ? ogImage : `${siteUrl}${ogImage}`],
    },
  };
}

/**
 * Generate JSON-LD structured data for listings
 */
export function generateListingStructuredData(listing: {
  id: string;
  title: string;
  description?: string;
  priceAmount: number;
  priceCurrency: string;
  photos?: string[];
  make?: string;
  model?: string;
  year?: number;
  mileage?: number;
  fuel?: string;
  transmission?: string;
  createdAt: string;
  updatedAt?: string;
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.clickanunt.ro';
  
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${siteUrl}/listings/${listing.id}`,
    name: listing.title,
    description: listing.description || listing.title,
    url: `${siteUrl}/listings/${listing.id}`,
    image: listing.photos?.map(photo => 
      photo.startsWith('http') ? photo : `${siteUrl}${photo}`
    ) || [],
    offers: {
      '@type': 'Offer',
      price: listing.priceAmount,
      priceCurrency: listing.priceCurrency,
      availability: 'https://schema.org/InStock',
      url: `${siteUrl}/listings/${listing.id}`,
    },
    brand: listing.make ? {
      '@type': 'Brand',
      name: listing.make,
    } : undefined,
    model: listing.model,
    productionDate: listing.year?.toString(),
    mileageFromOdometer: listing.mileage ? {
      '@type': 'QuantitativeValue',
      value: listing.mileage,
      unitCode: 'KMT',
    } : undefined,
    fuelType: listing.fuel,
    vehicleTransmission: listing.transmission,
    datePublished: listing.createdAt,
    dateModified: listing.updatedAt || listing.createdAt,
  };
}

/**
 * Generate JSON-LD structured data for organization
 */
export function generateOrganizationStructuredData() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.clickanunt.ro';
  
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'ClickAnunț',
    url: siteUrl,
    logo: `${siteUrl}/images/logo.png`,
    description: 'Platforma de anunțuri gratuite din România',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+40-784-712-496',
      contactType: 'customer service',
      email: 'contact@clickanunt.ro',
      availableLanguage: ['Romanian'],
    },
    sameAs: [
      'https://www.facebook.com/clickanunt',
      'https://twitter.com/clickanunt',
      'https://www.instagram.com/clickanunt',
    ],
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'RO',
      addressLocality: 'București',
    },
  };
}

/**
 * Generate JSON-LD structured data for breadcrumbs
 */
export function generateBreadcrumbStructuredData(items: Array<{ name: string; url: string }>) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.clickanunt.ro';
  
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${siteUrl}${item.url}`,
    })),
  };
}

/**
 * Generate JSON-LD structured data for local business
 */
export function generateLocalBusinessStructuredData() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.clickanunt.ro';
  
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': siteUrl,
    name: 'ClickAnunț',
    image: `${siteUrl}/images/logo.png`,
    url: siteUrl,
    telephone: '+40-784-712-496',
    email: 'contact@clickanunt.ro',
    priceRange: 'Gratuit',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'RO',
      addressLocality: 'București',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 44.4268,
      longitude: 26.1025,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '09:00',
        closes: '18:00',
      },
    ],
  };
}

/**
 * Generate JSON-LD script tags as string
 * Use dangerouslySetInnerHTML in components
 */
export function generateStructuredDataScripts(data: object | object[]): string {
  const dataArray = Array.isArray(data) ? data : [data];
  
  return dataArray
    .map(item => 
      `<script type="application/ld+json">${JSON.stringify(item, null, 0)}</script>`
    )
    .join('\n');
}

/**
 * Generate sitemap entries
 */
export interface SitemapEntry {
  url: string;
  lastModified?: Date;
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

export function generateSitemapXML(entries: SitemapEntry[]): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.clickanunt.ro';
  
  const urls = entries.map(entry => {
    const url = entry.url.startsWith('http') ? entry.url : `${siteUrl}${entry.url}`;
    const lastmod = entry.lastModified ? entry.lastModified.toISOString().split('T')[0] : '';
    
    return `
  <url>
    <loc>${url}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}
    ${entry.changeFrequency ? `<changefreq>${entry.changeFrequency}</changefreq>` : ''}
    ${entry.priority !== undefined ? `<priority>${entry.priority}</priority>` : ''}
  </url>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

/**
 * Generate robots.txt content
 */
export function generateRobotsTxt(options: {
  disallow?: string[];
  allow?: string[];
  sitemap?: string;
} = {}): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.clickanunt.ro';
  const {
    disallow = ['/api/', '/admin/', '/dashboard/'],
    allow = ['/'],
    sitemap = `${siteUrl}/sitemap.xml`,
  } = options;

  const disallowRules = disallow.map(path => `Disallow: ${path}`).join('\n');
  const allowRules = allow.map(path => `Allow: ${path}`).join('\n');

  return `User-agent: *
${allowRules}
${disallowRules}

Sitemap: ${sitemap}`;
}

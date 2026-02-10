/**
 * Image Optimization Configuration
 * 
 * - Responsive images (srcset)
 * - Lazy loading
 * - Format negotiation (webp, avif)
 * - Automatic compression
 */

export interface ImageOptimizationConfig {
  enableLazyLoad: boolean;
  enableResponsive: boolean;
  formats: string[];
  quality: number;
  priority: boolean;
  placeholder: 'blur' | 'empty';
  sizes?: string;
}

/**
 * Default configurations for different image types
 */
export const IMAGE_CONFIGS = {
  // Listing thumbnails - lazy load, small
  LISTING_THUMB: {
    enableLazyLoad: true,
    enableResponsive: true,
    formats: ['image/webp', 'image/jpeg'],
    quality: 75,
    priority: false,
    placeholder: 'blur' as const,
    sizes: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
    width: 400,
    height: 300,
  },

  // Listing detail image - lazy load, large
  LISTING_DETAIL: {
    enableLazyLoad: true,
    enableResponsive: true,
    formats: ['image/avif', 'image/webp', 'image/jpeg'],
    quality: 85,
    priority: false,
    placeholder: 'blur' as const,
    sizes: '(max-width: 1024px) 100vw, 80vw',
    width: 1200,
    height: 800,
  },

  // Profile avatar - priority, small
  AVATAR: {
    enableLazyLoad: false,
    enableResponsive: false,
    formats: ['image/webp', 'image/jpeg'],
    quality: 80,
    priority: true,
    placeholder: 'empty' as const,
    width: 128,
    height: 128,
  },

  // Hero image - priority, large
  HERO: {
    enableLazyLoad: false,
    enableResponsive: true,
    formats: ['image/avif', 'image/webp', 'image/jpeg'],
    quality: 85,
    priority: true,
    placeholder: 'blur' as const,
    sizes: '100vw',
    width: 1920,
    height: 1080,
  },

  // Logo - priority, small
  LOGO: {
    enableLazyLoad: false,
    enableResponsive: false,
    formats: ['image/png', 'image/svg+xml'],
    quality: 95,
    priority: true,
    placeholder: 'empty' as const,
    width: 128,
    height: 128,
  },
};

/**
 * Preload hints for critical images
 */
export function getPreloadHint(imageUrl: string, config: Partial<ImageOptimizationConfig>) {
  return {
    rel: 'preload',
    as: 'image',
    href: imageUrl,
    imagesrcset: buildSrcSet(imageUrl, config),
    imagesizes: config.sizes || '100vw',
    type: getOptimalFormat(config.formats?.[0] || 'image/jpeg'),
  };
}

/**
 * Build srcset string for responsive images
 */
export function buildSrcSet(imageUrl: string, config: Partial<ImageOptimizationConfig>) {
  if (!config.enableResponsive) {
    return imageUrl;
  }

  const sizes = [320, 640, 960, 1280, 1920];
  return sizes
    .map(size => `${imageUrl}?w=${size} ${size}w`)
    .join(', ');
}

/**
 * Get optimal image format for browser
 */
export function getOptimalFormat(preferredFormat?: string): string {
  const formats: Record<string, string> = {
    'image/avif': 'image/avif',
    'image/webp': 'image/webp',
    'image/jpeg': 'image/jpeg',
    'image/png': 'image/png',
  };

  return formats[preferredFormat || 'image/jpeg'];
}

/**
 * Example Next.js Image component usage:
 * 
 * import Image from 'next/image';
 * import { IMAGE_CONFIGS } from '@/lib/image-optimization';
 * 
 * export function ListingThumbnail({ src, alt }) {
 *   const config = IMAGE_CONFIGS.LISTING_THUMB;
 *   
 *   return (
 *     <Image
 *       src={src}
 *       alt={alt}
 *       width={config.width}
 *       height={config.height}
 *       quality={config.quality}
 *       loading={config.enableLazyLoad ? 'lazy' : 'eager'}
 *       placeholder={config.placeholder}
 *       sizes={config.sizes}
 *       priority={config.priority}
 *     />
 *   );
 * }
 */

/**
 * Picture element with multiple formats for fallback
 */
export function buildPictureElement(
  imageUrl: string,
  alt: string,
  config: Partial<ImageOptimizationConfig>
) {
  return {
    sources: (config.formats || ['image/webp', 'image/jpeg']).map(format => ({
      srcSet: buildSrcSet(imageUrl, config),
      type: format,
    })),
    img: {
      src: imageUrl,
      alt,
      loading: config.enableLazyLoad ? 'lazy' : 'eager',
    },
  };
}

/**
 * Get blur placeholder
 * In production, generate real LQIP (Low Quality Image Placeholder)
 */
export function getBlurDataUrl(): string {
  // SVG blur placeholder (generic, light gray)
  return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2YzZjRmNiIvPjwvc3ZnPg==';
}

/**
 * Image loading strategies
 */
export const IMAGE_LOADING_STRATEGIES = {
  // Eager load with priority (above the fold)
  CRITICAL: {
    loading: 'eager' as const,
    priority: true,
    sizes: '100vw',
  },

  // Lazy load (below the fold)
  LAZY: {
    loading: 'lazy' as const,
    priority: false,
  },

  // Eager load but not priority (visible but not critical)
  VISIBLE: {
    loading: 'eager' as const,
    priority: false,
  },
};

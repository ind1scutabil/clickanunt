/**
 * ClickAnunț Enterprise Design System Utilities
 * 
 * Helper functions and utilities for the design system
 */

import { type ClassValue, clsx } from 'clsx';

/**
 * Merge Tailwind CSS classes with proper precedence
 * 
 * @example
 * ```tsx
 * <div className={cn('px-4 py-2', isActive && 'bg-primary-500')} />
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Focus visible ring utility
 * Standard focus ring for accessibility
 * 
 * @example
 * ```tsx
 * <button className={cn('...', focusRing())}>Click me</button>
 * ```
 */
export function focusRing(color: 'primary' | 'secondary' | 'white' = 'primary') {
  const rings = {
    primary: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950',
    secondary: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950',
    white: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950',
  };
  
  return rings[color];
}

/**
 * Generate responsive class utility
 * Helps with mobile-first responsive design
 * 
 * @example
 * ```tsx
 * <div className={responsive({ base: 'text-sm', md: 'text-base', lg: 'text-lg' })} />
 * ```
 */
export function responsive(classes: {
  base?: string;
  sm?: string;
  md?: string;
  lg?: string;
  xl?: string;
  '2xl'?: string;
}) {
  return cn(
    classes.base,
    classes.sm && `sm:${classes.sm}`,
    classes.md && `md:${classes.md}`,
    classes.lg && `lg:${classes.lg}`,
    classes.xl && `xl:${classes.xl}`,
    classes['2xl'] && `2xl:${classes['2xl']}`
  );
}

/**
 * Truncate text utility
 * 
 * @param lines - Number of lines before truncation (default: 1)
 */
export function truncate(lines: number = 1) {
  if (lines === 1) {
    return 'truncate overflow-hidden text-ellipsis whitespace-nowrap';
  }
  
  return cn(
    'overflow-hidden text-ellipsis',
    `line-clamp-${lines}`
  );
}

/**
 * Glass effect utility (blur + transparency)
 * Use sparingly for overlays and modals
 */
export function glass(opacity: 'light' | 'medium' | 'heavy' = 'medium') {
  const opacities = {
    light: 'bg-neutral-900/40',
    medium: 'bg-neutral-900/60',
    heavy: 'bg-neutral-900/80',
  };
  
  return cn(
    opacities[opacity],
    'backdrop-blur-lg',
    'border border-white/10'
  );
}

/**
 * Skeleton loading utility
 * For loading states
 */
export function skeleton() {
  return cn(
    'animate-pulse',
    'bg-neutral-800',
    'rounded-lg'
  );
}

/**
 * Hover lift effect
 * Subtle elevation on hover
 * 
 * @param scale - Scale factor (default: 1.02)
 */
export function hoverLift(scale: number = 1.02) {
  return cn(
    'transition-transform duration-240',
    `hover:scale-[${scale}]`,
    'hover:shadow-lg'
  );
}

/**
 * Screen reader only utility
 * Hide visually but keep for screen readers
 */
export function srOnly() {
  return 'sr-only absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0';
}

/**
 * Format currency helper
 * 
 * @param amount - Amount in smallest unit (e.g., cents)
 * @param currency - Currency code (default: 'RON')
 */
export function formatCurrency(amount: number, currency: 'RON' | 'EUR' | 'USD' = 'RON') {
  const formatter = new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  
  return formatter.format(amount);
}

/**
 * Format number with thousands separator
 */
export function formatNumber(num: number) {
  return new Intl.NumberFormat('ro-RO').format(num);
}

/**
 * Format date helper
 */
export function formatDate(date: Date | string, format: 'short' | 'long' | 'relative' = 'short') {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (format === 'relative') {
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Acum';
    if (diffMins < 60) return `Acum ${diffMins} min`;
    if (diffHours < 24) return `Acum ${diffHours}h`;
    if (diffDays < 7) return `Acum ${diffDays}z`;
    
    // Fallback to short format
    format = 'short';
  }
  
  if (format === 'short') {
    return d.toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
  
  return d.toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Debounce function
 * For search inputs, etc.
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Check if reduced motion is preferred
 * Respects user's accessibility settings
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Generate initials from name
 * 
 * @example
 * getInitials('Daniel Enoiu') // 'DE'
 */
export function getInitials(name: string, maxLength: number = 2): string {
  if (!name) return '';
  
  const parts = name.trim().split(/\s+/);
  
  if (parts.length === 1) {
    return parts[0].substring(0, maxLength).toUpperCase();
  }
  
  // Take first letter of first and last word
  const initials = parts[0][0] + parts[parts.length - 1][0];
  return initials.toUpperCase();
}

/**
 * Clamp number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Check if value is empty (null, undefined, empty string, empty array)
 */
export function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

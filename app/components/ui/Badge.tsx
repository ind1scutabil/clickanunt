/**
 * Badge Component - Enterprise Design System
 * 
 * Small status indicator with variants and icons.
 * 
 * @example
 * ```tsx
 * <Badge>Nou</Badge>
 * <Badge variant="success">Activ</Badge>
 * <Badge variant="error" icon={<XIcon />}>Respins</Badge>
 * ```
 */

import React from 'react';
import { cn } from '@/lib/design/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * Visual style variant
   * - default: Neutral gray
   * - primary: Violet brand color
   * - success: Green
   * - error: Red
   * - warning: Orange
   * - info: Blue
   */
  variant?: 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info';
  
  /**
   * Size of the badge
   * - sm: Compact (20px height)
   * - md: Standard (24px height)
   * - lg: Large (32px height)
   */
  size?: 'sm' | 'md' | 'lg';
  
  /**
   * Icon element to display before text
   */
  icon?: React.ReactNode;
  
  /**
   * Rounded pill shape
   */
  pill?: boolean;
  
  /**
   * Outlined style (transparent background with border)
   */
  outlined?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Badge content
   */
  children: React.ReactNode;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      variant = 'default',
      size = 'md',
      icon,
      pill = false,
      outlined = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    // Base styles
    const baseStyles = cn(
      'inline-flex items-center justify-center gap-1',
      'font-medium tabular-nums',
      'whitespace-nowrap',
      'transition-colors duration-normal ease-premium',
      pill ? 'rounded-full' : 'rounded-md'
    );

    // Variant styles (solid) — enterprise: muted surfaces, single accent (primary)
    const solidVariantStyles = {
      default: 'bg-neutral-800 text-neutral-200 border border-white/5',
      primary: 'bg-primary-600/90 text-white border border-primary-500/30',
      success: 'bg-emerald-950/80 text-emerald-200 border border-emerald-500/25',
      error: 'bg-red-950/80 text-red-200 border border-red-500/25',
      warning: 'bg-neutral-800 text-neutral-300 border border-amber-500/25',
      info: 'bg-neutral-800 text-neutral-200 border border-neutral-600',
    };

    // Variant styles (outlined)
    const outlinedVariantStyles = {
      default: 'border border-neutral-600 bg-transparent text-neutral-300',
      primary: 'border border-primary-500/40 bg-primary-500/10 text-primary-300',
      success: 'border border-emerald-500/30 bg-emerald-500/5 text-emerald-300',
      error: 'border border-red-500/30 bg-red-500/5 text-red-300',
      warning: 'border border-amber-500/25 bg-amber-500/5 text-amber-200/90',
      info: 'border border-neutral-600 bg-neutral-900/50 text-neutral-300',
    };

    // Size styles — unified chip scale
    const sizeStyles = {
      sm: 'px-2 py-0.5 text-[11px] leading-tight min-h-[22px]',
      md: 'px-2.5 py-1 text-xs min-h-[24px]',
      lg: 'px-3 py-1.5 text-sm min-h-[30px]',
    };

    // Icon size
    const iconSize = {
      sm: 'w-3 h-3',
      md: 'w-3.5 h-3.5',
      lg: 'w-4 h-4',
    };

    return (
      <span
        ref={ref}
        className={cn(
          baseStyles,
          outlined ? outlinedVariantStyles[variant] : solidVariantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {/* Icon */}
        {icon && (
          <span className={cn('inline-flex', iconSize[size])} aria-hidden="true">
            {icon}
          </span>
        )}
        
        {/* Badge text */}
        <span>{children}</span>
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;

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
      'inline-flex items-center justify-center gap-1.5',
      'font-medium',
      'whitespace-nowrap',
      'transition-colors duration-base',
      pill ? 'rounded-full' : 'rounded'
    );

    // Variant styles (solid)
    const solidVariantStyles = {
      default: 'bg-neutral-700 text-neutral-200',
      primary: 'bg-primary-500 text-white',
      success: 'bg-success-500 text-white',
      error: 'bg-error-500 text-white',
      warning: 'bg-warning-500 text-white',
      info: 'bg-info-500 text-white',
    };

    // Variant styles (outlined)
    const outlinedVariantStyles = {
      default: 'bg-transparent border border-neutral-700 text-neutral-300',
      primary: 'bg-transparent border border-primary-500 text-primary-400',
      success: 'bg-transparent border border-success-500 text-success-400',
      error: 'bg-transparent border border-error-500 text-error-400',
      warning: 'bg-transparent border border-warning-500 text-warning-400',
      info: 'bg-transparent border border-info-500 text-info-400',
    };

    // Size styles
    const sizeStyles = {
      sm: 'px-2 py-0.5 text-xs min-h-[20px]',
      md: 'px-2.5 py-1 text-sm min-h-[24px]',
      lg: 'px-3 py-1.5 text-base min-h-[32px]',
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

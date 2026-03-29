/**
 * Button Component - Enterprise Design System
 * 
 * Unified button component with variants, sizes, and states.
 * Replaces 10+ different button implementations across the codebase.
 * 
 * @example
 * ```tsx
 * <Button variant="primary">Adaugă Anunț</Button>
 * <Button variant="secondary" size="sm">Anulează</Button>
 * <Button variant="ghost" icon={<PlusIcon />}>Click</Button>
 * ```
 */

import React from 'react';
import { cn } from '@/lib/design/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Visual style variant
   * - primary: Main CTAs (violet background)
   * - secondary: Alternative actions (neutral background)
   * - ghost: Subtle actions (transparent background)
   * - destructive: Dangerous actions (red background)
   * - link: Text-only links
   */
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'link';
  
  /**
   * Size of the button
   * - sm: 32px height (compact)
   * - md: 40px height (default)
   * - lg: 48px height (prominent)
   * - xl: 56px height (hero CTAs)
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  
  /**
   * Icon element to display before text
   */
  icon?: React.ReactNode;
  
  /**
   * Icon element to display after text
   */
  iconRight?: React.ReactNode;
  
  /**
   * Show loading spinner and disable interaction
   */
  loading?: boolean;
  
  /**
   * Full width button (block display)
   */
  fullWidth?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Button content
   */
  children: React.ReactNode;
}

/**
 * Spinner component for loading state
 */
const Spinner = ({ className }: { className?: string }) => (
  <svg
    className={cn('animate-spin', className)}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      icon,
      iconRight,
      loading = false,
      fullWidth = false,
      className,
      disabled,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    // Base styles (always applied)
    const baseStyles = cn(
      // Layout
      'inline-flex items-center justify-center gap-2',
      'font-semibold',
      'rounded-xl',
      'transition-[color,background-color,border-color,box-shadow,transform] duration-normal ease-premium motion-reduce:transition-none',
      'whitespace-nowrap',
      
      // Disabled state
      isDisabled && 'opacity-50 cursor-not-allowed',
      
      // Full width
      fullWidth && 'w-full',
      
      // Focus ring
      !isDisabled &&
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)] focus-visible:transition-shadow'
    );

    // Variant styles
    const variantStyles = {
      primary: cn(
        'bg-primary-600 text-white',
        'border border-primary-500/30',
        'hover:bg-primary-500 active:bg-primary-700',
        'shadow-md shadow-black/25',
        'hover:shadow-lg hover:shadow-primary-500/12 motion-reduce:hover:shadow-md'
      ),
      secondary: cn(
        'bg-[#1C212B] text-white/90',
        'border border-white/10',
        'hover:bg-neutral-850 hover:border-white/15 hover:shadow-md hover:shadow-black/20',
        'active:bg-[#242A34]'
      ),
      ghost: cn(
        'text-white/80',
        'hover:bg-white/5 hover:text-white',
        'active:bg-white/10'
      ),
      destructive: cn(
        'bg-error-600 text-white',
        'hover:bg-error-500 active:bg-error-700',
        'shadow-md shadow-black/20',
        'hover:shadow-lg hover:shadow-error-600/15 motion-reduce:hover:shadow-md'
      ),
      link: cn(
        'text-primary-500',
        'hover:text-primary-400 hover:underline',
        'active:text-primary-600',
        'p-0 h-auto'
      ),
    };

    // Size styles
    const sizeStyles = {
      sm: 'px-3.5 py-2 text-sm min-h-[36px]',
      md: 'px-4 py-2.5 text-base min-h-[44px]',
      lg: 'px-6 py-3 text-base min-h-[48px]',
      xl: 'px-8 py-4 text-xl min-h-[56px]',
    };

    // Icon size based on button size
    const iconSize = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-5 h-5',
      xl: 'w-6 h-6',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={cn(
          baseStyles,
          variantStyles[variant],
          variant !== 'link' && sizeStyles[size],
          className
        )}
        {...props}
      >
        {/* Loading spinner */}
        {loading && (
          <Spinner className={iconSize[size]} />
        )}
        
        {/* Left icon */}
        {!loading && icon && (
          <span className={cn('inline-flex', iconSize[size])} aria-hidden="true">
            {icon}
          </span>
        )}
        
        {/* Button text */}
        <span>{children}</span>
        
        {/* Right icon */}
        {!loading && iconRight && (
          <span className={cn('inline-flex', iconSize[size])} aria-hidden="true">
            {iconRight}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;

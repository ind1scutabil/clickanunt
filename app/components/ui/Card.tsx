/**
 * Card Component - Enterprise Design System
 * 
 * Unified card container with variants and interactive states.
 * Replaces 15+ different card implementations.
 * 
 * @example
 * ```tsx
 * <Card>Basic content</Card>
 * <Card variant="bordered" padding="lg">Enhanced card</Card>
 * <Card interactive onClick={handleClick}>Clickable card</Card>
 * ```
 */

import React from 'react';
import { cn } from '@/lib/design/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Visual style variant
   * - default: Standard card with background
   * - bordered: Card with border emphasis
   * - flat: Minimal card without shadow
   * - elevated: Card with stronger shadow
   */
  variant?: 'default' | 'bordered' | 'flat' | 'elevated';
  
  /**
   * Padding size
   * - none: No padding (custom content)
   * - sm: 16px padding
   * - md: 24px padding (default)
   * - lg: 32px padding
   * - xl: 48px padding
   */
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  
  /**
   * Make card interactive (hover effects, cursor pointer)
   */
  interactive?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Card content
   */
  children: React.ReactNode;
}

const CardComponent = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      padding = 'md',
      interactive = false,
      className,
      children,
      onClick,
      ...props
    },
    ref
  ) => {
    const isClickable = Boolean(onClick) || interactive;

    // Base styles
    const baseStyles = cn(
      'rounded-xl',
      'transition-[box-shadow,transform,border-color,background-color] duration-normal ease-premium motion-reduce:transition-none'
    );

    // Variant styles
    const variantStyles = {
      default: cn(
        'bg-[#1A1D24]',
        'border border-white/[0.06]',
        'shadow-[0_2px_8px_rgba(0,0,0,0.28),0_1px_0_rgba(255,255,255,0.03)_inset]'
      ),
      bordered: cn(
        'bg-[#1A1D24]',
        'border border-white/10',
        'shadow-[0_2px_8px_rgba(0,0,0,0.26)]'
      ),
      flat: cn(
        'bg-[#1A1D24]/70',
        'border border-white/[0.04]'
      ),
      elevated: cn(
        'bg-[#1A1D24]',
        'border border-white/[0.06]',
        'shadow-[0_14px_44px_rgba(0,0,0,0.24),0_1px_0_rgba(255,255,255,0.04)_inset]'
      ),
    };

    // Interactive styles (hover effects)
    const interactiveStyles = isClickable && cn(
      'cursor-pointer',
      'hover:border-white/12',
      'hover:shadow-[0_18px_48px_rgba(0,0,0,0.32)]',
      'active:opacity-[0.98]',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]'
    );

    // Padding styles
    const paddingStyles = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
      xl: 'p-12',
    };

    return (
      <div
        ref={ref}
        onClick={onClick}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onKeyDown={
          isClickable
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>);
                }
              }
            : undefined
        }
        className={cn(
          baseStyles,
          variantStyles[variant],
          interactiveStyles,
          paddingStyles[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardComponent.displayName = 'Card';

/**
 * Card.Header - Header section with optional subtitle
 */
export const CardHeader: React.FC<{
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, action, className }) => (
  <div className={cn('flex items-start justify-between gap-4 mb-4', className)}>
    <div className="flex-1">
      <h3 className="text-xl font-semibold text-neutral-50">{title}</h3>
      {subtitle && <p className="mt-1 text-sm text-neutral-300">{subtitle}</p>}
    </div>
    {action && <div className="flex-shrink-0">{action}</div>}
  </div>
);

CardHeader.displayName = 'Card.Header';

/**
 * Card.Body - Body section with optional spacing
 */
export const CardBody: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div className={cn('text-neutral-100', className)}>{children}</div>
);

CardBody.displayName = 'Card.Body';

/**
 * Card.Footer - Footer section with actions
 */
export const CardFooter: React.FC<{
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}> = ({ children, align = 'right', className }) => (
  <div
    className={cn(
      'mt-6 flex items-center gap-3 border-t border-white/10 pt-4',
      align === 'left' && 'justify-start',
      align === 'center' && 'justify-center',
      align === 'right' && 'justify-end',
      className
    )}
  >
    {children}
  </div>
);

CardFooter.displayName = 'Card.Footer';

// Export Card with subcomponents
export const Card = Object.assign(CardComponent, {
  Header: CardHeader,
  Body: CardBody,
  Footer: CardFooter,
});

export default Card;

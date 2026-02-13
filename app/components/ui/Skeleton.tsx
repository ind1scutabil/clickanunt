/**
 * Skeleton Component - Enterprise Design System
 * 
 * Loading placeholder with pulse animation.
 * 
 * @example
 * ```tsx
 * <Skeleton className="h-12 w-full" />
 * <Skeleton variant="circle" className="w-16 h-16" />
 * <Skeleton variant="text" lines={3} />
 * ```
 */

'use client';

import React from 'react';
import { cn } from '@/lib/design/utils';

export interface SkeletonProps {
  /**
   * Variant type
   */
  variant?: 'default' | 'text' | 'circle' | 'rounded';
  
  /**
   * Number of lines (for text variant)
   */
  lines?: number;
  
  /**
   * Disable pulse animation
   */
  noPulse?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'default',
  lines = 1,
  noPulse = false,
  className,
}) => {
  const baseStyles = cn(
    'bg-neutral-800',
    !noPulse && 'animate-pulse'
  );

  if (variant === 'text') {
    return (
      <div className={cn('space-y-2', className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              baseStyles,
              'h-4 rounded',
              i === lines - 1 && lines > 1 && 'w-4/5'
            )}
          />
        ))}
      </div>
    );
  }

  if (variant === 'circle') {
    return (
      <div
        className={cn(
          baseStyles,
          'rounded-full',
          className
        )}
      />
    );
  }

  if (variant === 'rounded') {
    return (
      <div
        className={cn(
          baseStyles,
          'rounded-lg',
          className
        )}
      />
    );
  }

  // Default variant
  return (
    <div
      className={cn(
        baseStyles,
        'rounded',
        className
      )}
    />
  );
};

Skeleton.displayName = 'Skeleton';

export default Skeleton;

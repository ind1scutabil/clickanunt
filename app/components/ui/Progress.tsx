/**
 * Progress Component - Enterprise Design System
 * 
 * Progress bar with variants and label support.
 * 
 * @example
 * ```tsx
 * <Progress value={65} />
 * <Progress value={80} variant="success" showLabel />
 * ```
 */

'use client';

import React from 'react';
import { cn } from '@/lib/design/utils';

export interface ProgressProps {
  /**
   * Progress value (0-100)
   */
  value: number;
  
  /**
   * Visual variant
   */
  variant?: 'primary' | 'success' | 'error' | 'warning' | 'info';
  
  /**
   * Size of progress bar
   */
  size?: 'sm' | 'md' | 'lg';
  
  /**
   * Show percentage label
   */
  showLabel?: boolean;
  
  /**
   * Custom label
   */
  label?: string;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  variant = 'primary',
  size = 'md',
  showLabel = false,
  label,
  className,
}) => {
  // Clamp value between 0 and 100
  const clampedValue = Math.min(Math.max(value, 0), 100);

  // Variant colors
  const variantStyles = {
    primary: 'bg-primary-500',
    success: 'bg-success-500',
    error: 'bg-error-500',
    warning: 'bg-warning-500',
    info: 'bg-info-500',
  };

  // Size styles
  const sizeStyles = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Label */}
      {(showLabel || label) && (
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="text-neutral-300">
            {label || 'Progress'}
          </span>
          {showLabel && (
            <span className="text-neutral-400 font-medium">
              {clampedValue}%
            </span>
          )}
        </div>
      )}

      {/* Progress bar container */}
      <div
        className={cn(
          'w-full bg-neutral-800 rounded-full overflow-hidden',
          sizeStyles[size]
        )}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {/* Progress bar fill */}
        <div
          className={cn(
            'h-full transition-all duration-slow ease-out',
            variantStyles[variant]
          )}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
};

Progress.displayName = 'Progress';

export default Progress;

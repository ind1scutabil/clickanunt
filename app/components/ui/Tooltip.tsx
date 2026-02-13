/**
 * Tooltip Component - Enterprise Design System
 * 
 * Hover tooltip with positioning options.
 * 
 * @example
 * ```tsx
 * <Tooltip content="This is a tooltip">
 *   <Button>Hover me</Button>
 * </Tooltip>
 * ```
 */

'use client';

import React from 'react';
import { cn } from '@/lib/design/utils';

export interface TooltipProps {
  /**
   * Tooltip content
   */
  content: React.ReactNode;
  
  /**
   * Tooltip position
   */
  position?: 'top' | 'bottom' | 'left' | 'right';
  
  /**
   * Delay before showing (ms)
   */
  delay?: number;
  
  /**
   * Children to trigger tooltip
   */
  children: React.ReactNode;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  position = 'top',
  delay = 200,
  children,
  className,
}) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout | undefined>(undefined);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Position styles
  const positionStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  // Arrow styles
  const arrowStyles = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-neutral-800',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-neutral-800',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-neutral-800',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-neutral-800',
  };

  return (
    <div
      className={cn('relative inline-block', className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {isVisible && (
        <div
          role="tooltip"
          className={cn(
            'absolute z-tooltip whitespace-nowrap',
            'px-3 py-2 text-sm text-white',
            'bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl',
            'animate-fadeIn',
            positionStyles[position]
          )}
        >
          {content}
          
          {/* Arrow */}
          <div
            className={cn(
              'absolute w-0 h-0',
              'border-4 border-transparent',
              arrowStyles[position]
            )}
          />
        </div>
      )}
    </div>
  );
};

Tooltip.displayName = 'Tooltip';

export default Tooltip;

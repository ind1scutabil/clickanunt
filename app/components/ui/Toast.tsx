/**
 * Toast Component - Enterprise Design System
 * 
 * Notification toast with variants and auto-dismiss.
 * Use with useToast hook for easy integration.
 * 
 * @example
 * ```tsx
 * const { showToast } = useToast();
 * 
 * showToast({
 *   title: 'Success',
 *   description: 'Listing created',
 *   variant: 'success'
 * });
 * ```
 */

'use client';

import React from 'react';
import { cn } from '@/lib/design/utils';

export interface ToastProps {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({
  id,
  title,
  description,
  variant = 'default',
  duration = 5000,
  onClose,
}) => {
  const [isLeaving, setIsLeaving] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(() => onClose(id), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => onClose(id), 300);
  };

  // Variant config
  const variantConfig = {
    default: {
      bg: 'bg-neutral-850 border-neutral-700',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      iconColor: 'text-neutral-400',
    },
    success: {
      bg: 'bg-success-500/10 border-success-500/30',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      iconColor: 'text-success-500',
    },
    error: {
      bg: 'bg-error-500/10 border-error-500/30',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      iconColor: 'text-error-500',
    },
    warning: {
      bg: 'bg-warning-500/10 border-warning-500/30',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      iconColor: 'text-warning-500',
    },
    info: {
      bg: 'bg-info-500/10 border-info-500/30',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      iconColor: 'text-info-500',
    },
  };

  const config = variantConfig[variant];

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border shadow-lg',
        'min-w-[320px] max-w-md',
        'transition-all duration-300',
        isLeaving ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0',
        config.bg
      )}
    >
      {/* Icon */}
      <div className={cn('flex-shrink-0', config.iconColor)}>
        {config.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-sm">
          {title}
        </p>
        {description && (
          <p className="text-sm text-neutral-300 mt-1">
            {description}
          </p>
        )}
      </div>

      {/* Close button */}
      <button
        type="button"
        onClick={handleClose}
        className={cn(
          'flex-shrink-0 text-neutral-400 hover:text-white',
          'transition-colors duration-base',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 rounded'
        )}
        aria-label="Close notification"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

Toast.displayName = 'Toast';

/**
 * ToastContainer - Container for toasts (top-right positioning)
 */
export const ToastContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    className="fixed top-4 right-4 z-toast flex flex-col gap-3 pointer-events-none"
    aria-live="polite"
    aria-atomic="true"
  >
    <div className="pointer-events-auto">
      {children}
    </div>
  </div>
);

ToastContainer.displayName = 'ToastContainer';

export default Toast;

/**
 * Modal Component - Enterprise Design System
 * 
 * Full-screen overlay modal with animations and focus trap.
 * 
 * @example
 * ```tsx
 * <Modal open={isOpen} onClose={handleClose}>
 *   <Modal.Header title="Add Listing" />
 *   <Modal.Body>Content here</Modal.Body>
 *   <Modal.Footer>
 *     <Button onClick={handleClose}>Cancel</Button>
 *   </Modal.Footer>
 * </Modal>
 * ```
 */

'use client';

import React from 'react';
import { cn } from '@/lib/design/utils';

export interface ModalProps {
  /**
   * Whether the modal is open
   */
  open: boolean;
  
  /**
   * Callback when modal should close
   */
  onClose: () => void;
  
  /**
   * Size of the modal
   * - sm: 400px
   * - md: 600px (default)
   * - lg: 800px
   * - xl: 1000px
   * - full: 95% of viewport
   */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  
  /**
   * Prevent closing on overlay click
   */
  disableOverlayClose?: boolean;
  
  /**
   * Prevent closing on Escape key
   */
  disableEscapeClose?: boolean;
  
  /**
   * Show close button in header
   */
  showCloseButton?: boolean;
  
  /**
   * Additional CSS classes for modal content
   */
  className?: string;
  
  /**
   * Modal content
   */
  children: React.ReactNode;
}

const ModalComponent: React.FC<ModalProps> = (
  {
    open,
    onClose,
    size = 'md',
    disableOverlayClose = false,
    disableEscapeClose = false,
    showCloseButton = true,
    className,
    children,
  }
) => {
    const [isAnimating, setIsAnimating] = React.useState(false);
    const contentRef = React.useRef<HTMLDivElement>(null);

    // Handle escape key
    React.useEffect(() => {
      if (!open || disableEscapeClose) return;

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }, [open, disableEscapeClose, onClose]);

    // Prevent body scroll when modal is open
    React.useEffect(() => {
      if (open) {
        document.body.style.overflow = 'hidden';
        setIsAnimating(true);
      } else {
        document.body.style.overflow = '';
      }

      return () => {
        document.body.style.overflow = '';
      };
    }, [open]);

    // Focus trap
    React.useEffect(() => {
      if (!open || !contentRef.current) return;

      const focusableElements = contentRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      const handleTab = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      };

      document.addEventListener('keydown', handleTab);
      firstElement?.focus();

      return () => document.removeEventListener('keydown', handleTab);
    }, [open]);

    if (!open && !isAnimating) return null;

    const handleOverlayClick = (e: React.MouseEvent) => {
      if (disableOverlayClose) return;
      if (e.target === e.currentTarget) {
        onClose();
      }
    };

    // Size styles
    const sizeStyles = {
      sm: 'max-w-sm',
      md: 'max-w-2xl',
      lg: 'max-w-4xl',
      xl: 'max-w-6xl',
      full: 'max-w-[95vw] max-h-[95vh]',
    };

    return (
      <div
        className={cn(
          'fixed inset-0 z-modal flex items-center justify-center p-4',
          'transition-opacity duration-normal',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onAnimationEnd={() => !open && setIsAnimating(false)}
      >
        {/* Backdrop */}
        <div
          className={cn(
            'absolute inset-0 bg-black/60 backdrop-blur-sm',
            'transition-opacity duration-normal'
          )}
          onClick={handleOverlayClick}
          aria-hidden="true"
        />

        {/* Modal Content */}
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            'relative w-full bg-neutral-900 rounded-xl',
            'border border-neutral-800 shadow-2xl',
            'max-h-[90vh] overflow-hidden',
            'transition-all duration-normal',
            open ? 'scale-100 opacity-100' : 'scale-95 opacity-0',
            sizeStyles[size],
            className
          )}
        >
          {/* Close button */}
          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              className={cn(
                'absolute top-4 right-4 z-10',
                'w-8 h-8 rounded-lg',
                'flex items-center justify-center',
                'text-neutral-400 hover:text-white',
                'hover:bg-neutral-800',
                'transition-colors duration-base',
                'focus:outline-none focus:ring-2 focus:ring-primary-500'
              )}
              aria-label="Close modal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {/* Content */}
          <div className="overflow-y-auto max-h-[90vh]">
            {children}
          </div>
        </div>
      </div>
    );
  };

ModalComponent.displayName = 'Modal';

/**
 * Modal.Header - Header section with title and subtitle
 */
export const ModalHeader: React.FC<{
  title: string;
  subtitle?: string;
  className?: string;
}> = ({ title, subtitle, className }) => (
  <div className={cn('px-6 py-5 border-b border-neutral-800', className)}>
    <h2 className="text-2xl font-bold text-white">{title}</h2>
    {subtitle && <p className="text-sm text-neutral-400 mt-1">{subtitle}</p>}
  </div>
);

ModalHeader.displayName = 'Modal.Header';

/**
 * Modal.Body - Body section with content
 */
export const ModalBody: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div className={cn('px-6 py-6', className)}>
    {children}
  </div>
);

ModalBody.displayName = 'Modal.Body';

/**
 * Modal.Footer - Footer section with actions
 */
export const ModalFooter: React.FC<{
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}> = ({ children, align = 'right', className }) => (
  <div
    className={cn(
      'px-6 py-4 border-t border-neutral-800',
      'flex items-center gap-3',
      align === 'left' && 'justify-start',
      align === 'center' && 'justify-center',
      align === 'right' && 'justify-end',
      className
    )}
  >
    {children}
  </div>
);

ModalFooter.displayName = 'Modal.Footer';

// Export Modal with subcomponents
export const Modal = Object.assign(ModalComponent, {
  Header: ModalHeader,
  Body: ModalBody,
  Footer: ModalFooter,
});

export default Modal;

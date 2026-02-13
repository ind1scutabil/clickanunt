/**
 * Dialog Component - Enterprise Design System
 * 
 * Confirmation dialog with preset variants (confirm, alert, destructive).
 * 
 * @example
 * ```tsx
 * <Dialog
 *   open={isOpen}
 *   onClose={handleClose}
 *   title="Delete Listing"
 *   description="Are you sure you want to delete this listing?"
 *   variant="destructive"
 *   onConfirm={handleDelete}
 * />
 * ```
 */

'use client';

import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

export interface DialogProps {
  /**
   * Whether the dialog is open
   */
  open: boolean;
  
  /**
   * Callback when dialog should close
   */
  onClose: () => void;
  
  /**
   * Dialog title
   */
  title: string;
  
  /**
   * Dialog description/message
   */
  description?: string;
  
  /**
   * Visual variant
   * - confirm: Blue (default)
   * - alert: Orange warning
   * - destructive: Red danger
   */
  variant?: 'confirm' | 'alert' | 'destructive';
  
  /**
   * Confirm button text
   */
  confirmText?: string;
  
  /**
   * Cancel button text
   */
  cancelText?: string;
  
  /**
   * Callback when confirm is clicked
   */
  onConfirm?: () => void | Promise<void>;
  
  /**
   * Show loading state on confirm button
   */
  loading?: boolean;
  
  /**
   * Icon element to display
   */
  icon?: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  description,
  variant = 'confirm',
  confirmText,
  cancelText = 'Anulează',
  onConfirm,
  loading = false,
  icon,
}) => {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleConfirm = async () => {
    if (!onConfirm) {
      onClose();
      return;
    }

    try {
      setIsLoading(true);
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Dialog confirm error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Variant config
  const variantConfig = {
    confirm: {
      icon: icon || (
        <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      iconColor: 'text-info-500',
      iconBg: 'bg-info-500/10',
      buttonVariant: 'primary' as const,
      confirmText: confirmText || 'Confirmă',
    },
    alert: {
      icon: icon || (
        <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      iconColor: 'text-warning-500',
      iconBg: 'bg-warning-500/10',
      buttonVariant: 'primary' as const,
      confirmText: confirmText || 'Am înțeles',
    },
    destructive: {
      icon: icon || (
        <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      iconColor: 'text-error-500',
      iconBg: 'bg-error-500/10',
      buttonVariant: 'destructive' as const,
      confirmText: confirmText || 'Șterge',
    },
  };

  const config = variantConfig[variant];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      disableOverlayClose={isLoading || loading}
      disableEscapeClose={isLoading || loading}
      showCloseButton={false}
    >
      <Modal.Body className="text-center py-8">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className={`w-16 h-16 rounded-full ${config.iconBg} ${config.iconColor} flex items-center justify-center p-4`}>
            {config.icon}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-white mb-3">
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className="text-neutral-300 mb-6 max-w-sm mx-auto">
            {description}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading || loading}
          >
            {cancelText}
          </Button>
          <Button
            variant={config.buttonVariant}
            onClick={handleConfirm}
            loading={isLoading || loading}
          >
            {config.confirmText}
          </Button>
        </div>
      </Modal.Body>
    </Modal>
  );
};

Dialog.displayName = 'Dialog';

export default Dialog;

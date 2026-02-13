/**
 * Input Component - Enterprise Design System
 * 
 * Unified text input with validation states, icons, and accessibility.
 * 
 * @example
 * ```tsx
 * <Input label="Email" type="email" required />
 * <Input label="Search" icon={<SearchIcon />} />
 * <Input error="Câmpul este obligatoriu" />
 * ```
 */

import React from 'react';
import { cn } from '@/lib/design/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * Input label (displayed above input)
   */
  label?: string;
  
  /**
   * Helper text (displayed below input)
   */
  helperText?: string;
  
  /**
   * Error message (turns input red and shows error)
   */
  error?: string;
  
  /**
   * Icon element to display on the left
   */
  icon?: React.ReactNode;
  
  /**
   * Icon element to display on the right
   */
  iconRight?: React.ReactNode;
  
  /**
   * Full width input (block display)
   */
  fullWidth?: boolean;
  
  /**
   * Additional CSS classes for input container
   */
  containerClassName?: string;
  
  /**
   * Additional CSS classes for input element
   */
  className?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      icon,
      iconRight,
      fullWidth = false,
      containerClassName,
      className,
      disabled,
      required,
      id,
      ...props
    },
    ref
  ) => {
    // Generate unique ID if not provided
    const generatedId = React.useId();
    const inputId = id || `input-${generatedId}`;
    const hasError = Boolean(error);

    return (
      <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full', containerClassName)}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'text-sm font-medium text-neutral-200',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {label}
            {required && <span className="text-error-500 ml-1">*</span>}
          </label>
        )}

        {/* Input wrapper */}
        <div className="relative">
          {/* Left icon */}
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none">
              {icon}
            </div>
          )}

          {/* Input element */}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            required={required}
            className={cn(
              // Base styles
              'w-full px-4 py-2.5 rounded-xl',
              'bg-neutral-850 text-neutral-50',
              'border transition-colors duration-base',
              'placeholder:text-neutral-500',
              
              // Border colors
              hasError
                ? 'border-error-500'
                : 'border-neutral-700 hover:border-neutral-600',
              
              // Focus state
              !disabled && !hasError && cn(
                'focus:border-primary-500',
                'focus:outline-none focus:ring-2 focus:ring-primary-500/20'
              ),
              
              hasError && !disabled && cn(
                'focus:border-error-500',
                'focus:outline-none focus:ring-2 focus:ring-error-500/20'
              ),
              
              // Disabled state
              disabled && 'opacity-50 cursor-not-allowed',
              
              // Icon padding
              icon && 'pl-10',
              iconRight && 'pr-10',
              
              className
            )}
            {...props}
          />

          {/* Right icon */}
          {iconRight && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none">
              {iconRight}
            </div>
          )}
        </div>

        {/* Helper text or error message */}
        {(helperText || error) && (
          <p
            className={cn(
              'text-sm',
              hasError ? 'text-error-500' : 'text-neutral-400'
            )}
            role={hasError ? 'alert' : undefined}
            aria-live={hasError ? 'polite' : undefined}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;

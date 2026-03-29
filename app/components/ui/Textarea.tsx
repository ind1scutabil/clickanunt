/**
 * Textarea Component - Enterprise Design System
 * 
 * Unified textarea with validation states, character counter, and accessibility.
 * 
 * @example
 * ```tsx
 * <Textarea label="Descriere" rows={4} />
 * <Textarea maxLength={500} showCount />
 * <Textarea error="Descrierea este prea scurtă" />
 * ```
 */

import React from 'react';
import { cn } from '@/lib/design/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /**
   * Textarea label (displayed above textarea)
   */
  label?: string;
  
  /**
   * Helper text (displayed below textarea)
   */
  helperText?: string;
  
  /**
   * Error message (turns textarea red and shows error)
   */
  error?: string;
  
  /**
   * Show character counter (requires maxLength)
   */
  showCount?: boolean;
  
  /**
   * Full width textarea (block display)
   */
  fullWidth?: boolean;
  
  /**
   * Additional CSS classes for textarea container
   */
  containerClassName?: string;
  
  /**
   * Additional CSS classes for textarea element
   */
  className?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      helperText,
      error,
      showCount,
      fullWidth = false,
      containerClassName,
      className,
      disabled,
      required,
      id,
      maxLength,
      value,
      defaultValue,
      ...props
    },
    ref
  ) => {
    // Generate unique ID if not provided
    const generatedId = React.useId();
    const textareaId = id || `textarea-${generatedId}`;
    const hasError = Boolean(error);
    
    // Track character count
    const [charCount, setCharCount] = React.useState(0);
    
    React.useEffect(() => {
      if (value !== undefined) {
        setCharCount(String(value).length);
      } else if (defaultValue !== undefined) {
        setCharCount(String(defaultValue).length);
      }
    }, [value, defaultValue]);
    
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCharCount(e.target.value.length);
      props.onChange?.(e);
    };

    return (
      <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full', containerClassName)}>
        {/* Label */}
        {label && (
          <label
            htmlFor={textareaId}
            className={cn(
              'text-sm font-medium text-neutral-200',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {label}
            {required && <span className="text-error-500 ml-1">*</span>}
          </label>
        )}

        {/* Textarea element */}
        <textarea
          ref={ref}
          id={textareaId}
          disabled={disabled}
          required={required}
          maxLength={maxLength}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          className={cn(
            // Base styles
            'w-full px-4 py-2.5 rounded-xl',
            'bg-neutral-850 text-neutral-50',
            'border transition-colors duration-normal ease-premium motion-reduce:transition-none',
            'placeholder:text-neutral-500',
            'resize-y', // Allow vertical resize only
            
            // Border colors
            hasError
              ? 'border-error-500'
              : 'border-neutral-700 hover:border-neutral-600',
            
            // Focus state
            !disabled && !hasError && cn(
              'focus:border-primary-500',
              'focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:ring-offset-2 focus:ring-offset-[var(--bg-primary)]'
            ),
            
            hasError && !disabled && cn(
              'focus:border-error-500',
              'focus:outline-none focus:ring-2 focus:ring-error-500/25 focus:ring-offset-2 focus:ring-offset-[var(--bg-primary)]'
            ),
            
            // Disabled state
            disabled && 'opacity-50 cursor-not-allowed',
            
            className
          )}
          {...props}
        />

        {/* Footer: Helper text/error + character count */}
        <div className="flex items-center justify-between gap-2">
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
          
          {/* Character counter */}
          {showCount && maxLength && (
            <p
              className={cn(
                'text-sm tabular-nums',
                charCount > maxLength * 0.9
                  ? 'text-warning-500'
                  : 'text-neutral-400'
              )}
              aria-label={`${charCount} din ${maxLength} caractere`}
            >
              {charCount} / {maxLength}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;

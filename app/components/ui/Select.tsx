/**
 * Select Component - Enterprise Design System
 * 
 * Unified select dropdown with validation states and accessibility.
 * 
 * @example
 * ```tsx
 * <Select label="Categorie" options={categories} />
 * <Select error="Selectați o categorie" />
 * ```
 */

import React from 'react';
import { cn } from '@/lib/design/utils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /**
   * Select label (displayed above select)
   */
  label?: string;
  
  /**
   * Helper text (displayed below select)
   */
  helperText?: string;
  
  /**
   * Error message (turns select red and shows error)
   */
  error?: string;
  
  /**
   * Options array
   */
  options: SelectOption[];
  
  /**
   * Placeholder text (shown when no option is selected)
   */
  placeholder?: string;
  
  /**
   * Full width select (block display)
   */
  fullWidth?: boolean;
  
  /**
   * Additional CSS classes for select container
   */
  containerClassName?: string;
  
  /**
   * Additional CSS classes for select element
   */
  className?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      helperText,
      error,
      options,
      placeholder,
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
    const selectId = id || `select-${generatedId}`;
    const hasError = Boolean(error);

    return (
      <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full', containerClassName)}>
        {/* Label */}
        {label && (
          <label
            htmlFor={selectId}
            className={cn(
              'text-sm font-medium text-neutral-200',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {label}
            {required && <span className="text-error-500 ml-1">*</span>}
          </label>
        )}

        {/* Select wrapper */}
        <div className="relative">
          {/* Select element */}
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            required={required}
            className={cn(
              // Base styles
              'w-full px-4 py-2.5 rounded-xl',
              'bg-neutral-850 text-neutral-50',
              'border transition-colors duration-base',
              'cursor-pointer',
              'appearance-none', // Remove default arrow
              
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
              
              // Padding for arrow
              'pr-10',
              
              className
            )}
            {...props}
          >
            {/* Placeholder option */}
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            
            {/* Options */}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>

          {/* Custom dropdown arrow */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none">
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
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

Select.displayName = 'Select';

export default Select;

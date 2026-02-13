/**
 * Accordion Component - Enterprise Design System
 * 
 * Collapsible content sections with smooth animations.
 * 
 * @example
 * ```tsx
 * <Accordion type="single" collapsible>
 *   <Accordion.Item value="item1">
 *     <Accordion.Trigger>Question 1?</Accordion.Trigger>
 *     <Accordion.Content>Answer 1</Accordion.Content>
 *   </Accordion.Item>
 * </Accordion>
 * ```
 */

'use client';

import React from 'react';
import { cn } from '@/lib/design/utils';

export interface AccordionProps {
  children: React.ReactNode;
  type?: 'single' | 'multiple';
  collapsible?: boolean;
  defaultValue?: string | string[];
  className?: string;
}

export interface AccordionItemProps {
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export interface AccordionTriggerProps {
  children: React.ReactNode;
  className?: string;
}

export interface AccordionContentProps {
  children: React.ReactNode;
  className?: string;
}

interface AccordionContextValue {
  type: 'single' | 'multiple';
  value: string[];
  onValueChange: (value: string) => void;
}

const AccordionContext = React.createContext<AccordionContextValue | null>(null);

const AccordionItemContext = React.createContext<{
  value: string;
  isOpen: boolean;
  disabled: boolean;
} | null>(null);

const AccordionComponent: React.FC<AccordionProps> = ({
  children,
  type = 'single',
  collapsible = false,
  defaultValue,
  className,
}) => {
  const [openItems, setOpenItems] = React.useState<string[]>(() => {
    if (defaultValue) {
      return Array.isArray(defaultValue) ? defaultValue : [defaultValue];
    }
    return [];
  });

  const handleValueChange = React.useCallback(
    (value: string) => {
      setOpenItems((prev) => {
        if (type === 'single') {
          // Single mode: only one item open at a time
          if (prev.includes(value)) {
            return collapsible ? [] : prev;
          }
          return [value];
        } else {
          // Multiple mode: toggle item
          if (prev.includes(value)) {
            return prev.filter((item) => item !== value);
          }
          return [...prev, value];
        }
      });
    },
    [type, collapsible]
  );

  return (
    <AccordionContext.Provider
      value={{ type, value: openItems, onValueChange: handleValueChange }}
    >
      <div className={cn('space-y-2', className)}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
};

AccordionComponent.displayName = 'Accordion';

/**
 * Accordion.Item - Individual accordion item
 */
export const AccordionItem: React.FC<AccordionItemProps> = ({
  value,
  children,
  disabled = false,
  className,
}) => {
  const context = React.useContext(AccordionContext);

  if (!context) {
    throw new Error('Accordion.Item must be used within Accordion');
  }

  const isOpen = context.value.includes(value);

  return (
    <AccordionItemContext.Provider value={{ value, isOpen, disabled }}>
      <div
        className={cn(
          'border border-neutral-800 rounded-lg overflow-hidden',
          'bg-neutral-900',
          disabled && 'opacity-60',
          className
        )}
      >
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
};

AccordionItem.displayName = 'Accordion.Item';

/**
 * Accordion.Trigger - Clickable header to toggle content
 */
export const AccordionTrigger: React.FC<AccordionTriggerProps> = ({
  children,
  className,
}) => {
  const accordionContext = React.useContext(AccordionContext);
  const itemContext = React.useContext(AccordionItemContext);

  if (!accordionContext || !itemContext) {
    throw new Error('Accordion.Trigger must be used within Accordion.Item');
  }

  const { value, isOpen, disabled } = itemContext;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && accordionContext.onValueChange(value)}
      className={cn(
        'w-full flex items-center justify-between',
        'px-5 py-4 text-left',
        'text-white font-medium',
        'hover:bg-neutral-850 transition-colors duration-base',
        'focus:outline-none focus:ring-2 focus:ring-primary-500',
        disabled && 'cursor-not-allowed',
        className
      )}
      aria-expanded={isOpen}
      aria-controls={`accordion-content-${value}`}
    >
      <span>{children}</span>
      <svg
        className={cn(
          'w-5 h-5 text-neutral-400 transition-transform duration-normal',
          isOpen && 'rotate-180'
        )}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </button>
  );
};

AccordionTrigger.displayName = 'Accordion.Trigger';

/**
 * Accordion.Content - Collapsible content area
 */
export const AccordionContent: React.FC<AccordionContentProps> = ({
  children,
  className,
}) => {
  const itemContext = React.useContext(AccordionItemContext);

  if (!itemContext) {
    throw new Error('Accordion.Content must be used within Accordion.Item');
  }

  const { value, isOpen } = itemContext;
  const contentRef = React.useRef<HTMLDivElement>(null);

  return (
    <div
      id={`accordion-content-${value}`}
      ref={contentRef}
      role="region"
      aria-labelledby={`accordion-trigger-${value}`}
      className={cn(
        'overflow-hidden transition-all duration-normal',
        isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
      )}
    >
      <div className={cn('px-5 py-4 border-t border-neutral-800', className)}>
        {children}
      </div>
    </div>
  );
};

AccordionContent.displayName = 'Accordion.Content';

// Export Accordion with subcomponents
export const Accordion = Object.assign(AccordionComponent, {
  Item: AccordionItem,
  Trigger: AccordionTrigger,
  Content: AccordionContent,
});

export default Accordion;

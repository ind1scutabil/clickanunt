/**
 * Tabs Component - Enterprise Design System
 * 
 * Tabbed interface with keyboard navigation.
 * 
 * @example
 * ```tsx
 * <Tabs defaultValue="tab1">
 *   <Tabs.List>
 *     <Tabs.Trigger value="tab1">Tab 1</Tabs.Trigger>
 *     <Tabs.Trigger value="tab2">Tab 2</Tabs.Trigger>
 *   </Tabs.List>
 *   <Tabs.Content value="tab1">Content 1</Tabs.Content>
 *   <Tabs.Content value="tab2">Content 2</Tabs.Content>
 * </Tabs>
 * ```
 */

'use client';

import React from 'react';
import { cn } from '@/lib/design/utils';

export interface TabsProps {
  children: React.ReactNode;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

export interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

export interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

const TabsComponent: React.FC<TabsProps> = ({
  children,
  defaultValue,
  value: controlledValue,
  onValueChange,
  className,
}) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue || '');
  
  const value = controlledValue ?? internalValue;
  
  const handleValueChange = React.useCallback(
    (newValue: string) => {
      if (controlledValue === undefined) {
        setInternalValue(newValue);
      }
      onValueChange?.(newValue);
    },
    [controlledValue, onValueChange]
  );

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
      <div className={className}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

TabsComponent.displayName = 'Tabs';

/**
 * Tabs.List - Container for tab triggers
 */
export const TabsList: React.FC<TabsListProps> = ({ children, className }) => (
  <div
    role="tablist"
    className={cn(
      'flex items-center gap-1 p-1',
      'bg-neutral-900 rounded-lg border border-neutral-800',
      className
    )}
  >
    {children}
  </div>
);

TabsList.displayName = 'Tabs.List';

/**
 * Tabs.Trigger - Tab button
 */
export const TabsTrigger: React.FC<TabsTriggerProps> = ({
  value,
  children,
  disabled = false,
  className,
}) => {
  const context = React.useContext(TabsContext);
  
  if (!context) {
    throw new Error('Tabs.Trigger must be used within Tabs');
  }

  const isActive = context.value === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls={`tabpanel-${value}`}
      disabled={disabled}
      onClick={() => !disabled && context.onValueChange(value)}
      className={cn(
        'px-4 py-2 text-sm font-medium rounded-md',
        'transition-all duration-base',
        'focus:outline-none focus:ring-2 focus:ring-primary-500',
        isActive
          ? 'bg-neutral-800 text-white shadow-sm'
          : 'text-neutral-400 hover:text-white hover:bg-neutral-850',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {children}
    </button>
  );
};

TabsTrigger.displayName = 'Tabs.Trigger';

/**
 * Tabs.Content - Tab panel content
 */
export const TabsContent: React.FC<TabsContentProps> = ({
  value,
  children,
  className,
}) => {
  const context = React.useContext(TabsContext);
  
  if (!context) {
    throw new Error('Tabs.Content must be used within Tabs');
  }

  if (context.value !== value) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${value}`}
      aria-labelledby={`tab-${value}`}
      className={cn('mt-4 focus:outline-none', className)}
      tabIndex={0}
    >
      {children}
    </div>
  );
};

TabsContent.displayName = 'Tabs.Content';

// Export Tabs with subcomponents
export const Tabs = Object.assign(TabsComponent, {
  List: TabsList,
  Trigger: TabsTrigger,
  Content: TabsContent,
});

export default Tabs;

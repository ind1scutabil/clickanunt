/**
 * Dropdown Component - Enterprise Design System
 * 
 * Dropdown menu with keyboard navigation and positioning.
 * 
 * @example
 * ```tsx
 * <Dropdown>
 *   <Dropdown.Trigger>
 *     <Button>Menu</Button>
 *   </Dropdown.Trigger>
 *   <Dropdown.Menu>
 *     <Dropdown.Item onClick={handleEdit}>Edit</Dropdown.Item>
 *     <Dropdown.Item onClick={handleDelete} danger>Delete</Dropdown.Item>
 *   </Dropdown.Menu>
 * </Dropdown>
 * ```
 */

'use client';

import React from 'react';
import { cn } from '@/lib/design/utils';

export interface DropdownProps {
  children: React.ReactNode;
  className?: string;
}

export interface DropdownMenuProps {
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

export interface DropdownItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  icon?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  className?: string;
}

const DropdownContext = React.createContext<{
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}>({
  isOpen: false,
  setIsOpen: () => {},
});

const DropdownComponent: React.FC<DropdownProps> = ({ children, className }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  React.useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  return (
    <DropdownContext.Provider value={{ isOpen, setIsOpen }}>
      <div ref={dropdownRef} className={cn('relative inline-block', className)}>
        {children}
      </div>
    </DropdownContext.Provider>
  );
};

DropdownComponent.displayName = 'Dropdown';

/**
 * Dropdown.Trigger - Trigger element to open dropdown
 */
export const DropdownTrigger: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isOpen, setIsOpen } = React.useContext(DropdownContext);

  const handleClick = () => {
    setIsOpen(!isOpen);
  };

  // Clone child and pass aria attributes via spread
  const childWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child as React.ReactElement<{onClick?: () => void}>, {
        onClick: handleClick,
      });
    }
    return child;
  });

  return <>{childWithProps}</>;
};

DropdownTrigger.displayName = 'Dropdown.Trigger';

/**
 * Dropdown.Menu - Menu container
 */
export const DropdownMenu: React.FC<DropdownMenuProps> = ({ 
  children, 
  align = 'left',
  className 
}) => {
  const { isOpen } = React.useContext(DropdownContext);

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'absolute z-dropdown mt-2 min-w-[200px]',
        'rounded-xl border border-white/10 bg-neutral-850 shadow-lg shadow-black/40',
        'py-1',
        'animate-fadeIn',
        align === 'left' ? 'left-0' : 'right-0',
        className
      )}
      role="menu"
    >
      {children}
    </div>
  );
};

DropdownMenu.displayName = 'Dropdown.Menu';

/**
 * Dropdown.Item - Menu item
 */
export const DropdownItem: React.FC<DropdownItemProps> = ({
  children,
  onClick,
  icon,
  danger = false,
  disabled = false,
  className,
}) => {
  const { setIsOpen } = React.useContext(DropdownContext);

  const handleClick = () => {
    if (disabled) return;
    onClick?.();
    setIsOpen(false);
  };

  return (
    <button
      type="button"
      role="menuitem"
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        'w-full px-4 py-2.5 text-left',
        'flex items-center gap-3',
        'transition-colors duration-normal ease-premium',
        danger
          ? 'text-error-400 hover:bg-error-500/10'
          : 'text-neutral-200 hover:bg-neutral-800',
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && 'hover:text-white',
        className
      )}
    >
      {icon && (
        <span className="w-5 h-5 flex-shrink-0" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="flex-1">{children}</span>
    </button>
  );
};

DropdownItem.displayName = 'Dropdown.Item';

/**
 * Dropdown.Divider - Visual separator
 */
export const DropdownDivider: React.FC = () => (
  <div className="h-px bg-neutral-800 my-1" role="separator" />
);

DropdownDivider.displayName = 'Dropdown.Divider';

// Export Dropdown with subcomponents
export const Dropdown = Object.assign(DropdownComponent, {
  Trigger: DropdownTrigger,
  Menu: DropdownMenu,
  Item: DropdownItem,
  Divider: DropdownDivider,
});

export default Dropdown;

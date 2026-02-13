/**
 * Avatar Component - Enterprise Design System
 * 
 * User avatar with image, initials fallback, and status indicator.
 * 
 * @example
 * ```tsx
 * <Avatar src="/user.jpg" alt="John Doe" />
 * <Avatar initials="JD" status="online" />
 * ```
 */

'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/design/utils';

export interface AvatarProps {
  /**
   * Image source URL
   */
  src?: string;
  
  /**
   * Alt text for image
   */
  alt?: string;
  
  /**
   * Initials to display if no image
   */
  initials?: string;
  
  /**
   * Size of avatar
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  
  /**
   * Online status indicator
   */
  status?: 'online' | 'offline' | 'away' | 'busy';
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = 'Avatar',
  initials,
  size = 'md',
  status,
  className,
}) => {
  const [imageError, setImageError] = React.useState(false);

  // Size styles
  const sizeStyles = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-2xl',
  };

  // Status indicator styles
  const statusStyles = {
    online: 'bg-success-500',
    offline: 'bg-neutral-500',
    away: 'bg-warning-500',
    busy: 'bg-error-500',
  };

  const statusSizes = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-4 h-4',
  };

  const showImage = src && !imageError;
  const showInitials = !showImage && initials;

  return (
    <div className={cn('relative inline-block', className)}>
      <div
        className={cn(
          'relative flex items-center justify-center rounded-full overflow-hidden',
          'bg-neutral-800 text-neutral-300 font-semibold',
          sizeStyles[size]
        )}
      >
        {showImage ? (
          <Image
            src={src}
            alt={alt}
            fill
            sizes="100%"
            onError={() => setImageError(true)}
            className="object-cover"
            unoptimized
          />
        ) : showInitials ? (
          <span>{initials}</span>
        ) : (
          // Default user icon
          <svg className="w-3/5 h-3/5 text-neutral-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        )}
      </div>

      {/* Status indicator */}
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 block rounded-full',
            'ring-2 ring-neutral-900',
            statusStyles[status],
            statusSizes[size]
          )}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  );
};

Avatar.displayName = 'Avatar';

/**
 * Avatar.Group - Group multiple avatars with overlap
 */
export const AvatarGroup: React.FC<{
  children: React.ReactNode;
  max?: number;
  className?: string;
}> = ({ children, max = 5, className }) => {
  const childrenArray = React.Children.toArray(children);
  const displayChildren = max ? childrenArray.slice(0, max) : childrenArray;
  const excess = childrenArray.length - max;

  return (
    <div className={cn('flex items-center -space-x-2', className)}>
      {displayChildren.map((child, index) => (
        <div key={index} className="ring-2 ring-neutral-900 rounded-full">
          {child}
        </div>
      ))}
      {excess > 0 && (
        <div
          className={cn(
            'flex items-center justify-center rounded-full',
            'bg-neutral-800 text-neutral-300 text-sm font-medium',
            'w-10 h-10 ring-2 ring-neutral-900'
          )}
        >
          +{excess}
        </div>
      )}
    </div>
  );
};

AvatarGroup.displayName = 'Avatar.Group';

// Export with subcomponents
export default Object.assign(Avatar, {
  Group: AvatarGroup,
});

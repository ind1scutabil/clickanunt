/**
 * UserMenu Component - Composite Component
 * 
 * User avatar with dropdown menu for navigation.
 * 
 * @example
 * ```tsx
 * <UserMenu
 *   user={{ name: "John Doe", avatar: "/avatar.jpg" }}
 *   onLogout={handleLogout}
 * />
 * ```
 */

'use client';

import React from 'react';
import { Avatar, Dropdown, Badge } from '@/app/components/ui';
import { useRouter } from 'next/navigation';

export interface UserMenuProps {
  /**
   * User data
   */
  user?: {
    name: string;
    email?: string;
    avatar?: string;
    verified?: boolean;
    isPremium?: boolean;
    unreadMessages?: number;
  } | null;
  
  /**
   * Logout callback
   */
  onLogout?: () => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const UserMenu: React.FC<UserMenuProps> = ({
  user,
  onLogout,
  className,
}) => {
  const router = useRouter();

  if (!user) {
    return null;
  }

  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className={className}>
      <Dropdown>
        <Dropdown.Trigger>
          <button className="relative focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-full">
            <Avatar
              src={user.avatar}
              initials={initials}
              size="md"
              status={user.verified ? 'online' : undefined}
            />
            {user.unreadMessages && user.unreadMessages > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-error-500 text-xs font-bold text-white">
                {user.unreadMessages > 9 ? '9+' : user.unreadMessages}
              </span>
            )}
          </button>
        </Dropdown.Trigger>

        <Dropdown.Menu align="right">
          {/* User Info Header */}
          <div className="px-4 py-3 border-b border-neutral-800">
            <p className="text-sm font-semibold text-white">{user.name}</p>
            {user.email && (
              <p className="text-xs text-neutral-400 truncate">{user.email}</p>
            )}
            {user.isPremium && (
              <Badge variant="primary" size="sm" className="mt-2">
                Premium
              </Badge>
            )}
          </div>

          {/* Menu Items */}
          <Dropdown.Item
            icon={
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
            onClick={() => router.push('/dashboard')}
          >
            Contul meu
          </Dropdown.Item>

          <Dropdown.Item
            icon={
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
            onClick={() => router.push('/dashboard/listings')}
          >
            Anunțurile mele
          </Dropdown.Item>

          <Dropdown.Item
            icon={
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            }
            onClick={() => router.push('/dashboard/messages')}
          >
            <span className="flex items-center justify-between w-full">
              Mesaje
              {user.unreadMessages && user.unreadMessages > 0 && (
                <Badge variant="error" size="sm">
                  {user.unreadMessages}
                </Badge>
              )}
            </span>
          </Dropdown.Item>

          <Dropdown.Item
            icon={
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            }
            onClick={() => router.push('/dashboard/favorites')}
          >
            Favorite
          </Dropdown.Item>

          <Dropdown.Divider />

          <Dropdown.Item
            icon={
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
            onClick={() => router.push('/dashboard/account')}
          >
            Setări
          </Dropdown.Item>

          <Dropdown.Divider />

          <Dropdown.Item
            danger
            icon={
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            }
            onClick={onLogout}
          >
            Deconectare
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
};

UserMenu.displayName = 'UserMenu';

export default UserMenu;

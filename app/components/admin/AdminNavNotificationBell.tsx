'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { fetchWithAuthRefresh } from '@/lib/admin-fetch';

let sharedCache: {
  at: number;
  unread: number;
  critical: number;
} = { at: 0, unread: 0, critical: 0 };

const CACHE_MS = 20_000;

async function loadCounts(): Promise<{ unread: number; critical: number }> {
  const now = Date.now();
  if (now - sharedCache.at < CACHE_MS) {
    return { unread: sharedCache.unread, critical: sharedCache.critical };
  }
  const res = await fetchWithAuthRefresh('/api/admin/notifications?countsOnly=1');
  const data = await res.json();
  if (!res.ok) {
    return { unread: sharedCache.unread, critical: sharedCache.critical };
  }
  const unread = typeof data.unreadCount === 'number' ? data.unreadCount : 0;
  const critical =
    typeof data.criticalUnreadCount === 'number' ? data.criticalUnreadCount : 0;
  sharedCache = { at: now, unread, critical };
  return { unread, critical };
}

type Props = { variant: 'desktop' | 'mobile' };

export default function AdminNavNotificationBell({ variant }: Props) {
  const pathname = usePathname() || '/';
  const [isStaff, setIsStaff] = useState(false);
  const [unread, setUnread] = useState(0);
  const [critical, setCritical] = useState(0);

  useEffect(() => {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (!userStr) {
      setIsStaff(false);
      return;
    }
    try {
      const u = JSON.parse(userStr) as { role?: string };
      const r = String(u.role || '').toLowerCase();
      setIsStaff(
        ['admin', 'owner', 'moderator', 'support', 'finance'].includes(r)
      );
    } catch {
      setIsStaff(false);
    }
  }, []);

  useEffect(() => {
    if (!isStaff || !pathname.startsWith('/admin')) return;

    let cancelled = false;
    const tick = async () => {
      try {
        const { unread: u, critical: c } = await loadCounts();
        if (cancelled) return;
        setUnread(u);
        setCritical(c);
      } catch {
        /* ignore */
      }
    };

    void tick();
    const id = setInterval(tick, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isStaff, pathname]);

  if (!isStaff || !pathname.startsWith('/admin')) {
    return null;
  }

  const href =
    pathname.includes('moderation')
      ? '#admin-alert-center-heading'
      : '/admin/moderation#admin-alert-center-heading';

  const cls =
    'hit-target relative flex items-center justify-center rounded-lg p-2 text-zinc-300 transition-smooth hover:bg-white/[0.06]';

  const wrap =
    variant === 'desktop'
      ? 'hidden md:inline-flex'
      : 'inline-flex md:hidden navbar-mobile-icon-btn';

  return (
    <Link
      href={href}
      className={`${cls} ${wrap}`}
      aria-label={`Alerte admin${unread ? `, ${unread} necitite` : ''}`}
      title="Alerte admin"
    >
      <svg
        className={variant === 'mobile' ? 'h-[18px] w-[18px] text-zinc-200' : 'h-5 w-5'}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      {unread > 0 && (
        <span
          className={`absolute right-1 top-1 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full px-0.5 text-[9px] font-bold text-white ring-2 ring-[#12151a] ${
            critical > 0 ? 'bg-red-600' : 'bg-violet-600'
          } ${variant === 'mobile' ? 'right-0 top-0' : ''}`}
        >
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  );
}

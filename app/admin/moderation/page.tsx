'use client';
import { useState, useEffect, useCallback, Suspense, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';
import { memoryStorage } from '@/lib/memory-storage';
import { useAdminAuth } from '@/lib/hooks/useAdminAuth';
import {
  fetchWithAuthRefresh,
  jsonMutationWithAuthRefresh,
  postJsonWithAuthRefresh,
  putJsonWithAuthRefresh,
} from '@/lib/admin-fetch';
import { clearCsrfTokenCache, getCsrfToken } from '@/lib/security/csrf-client';
import UserModerationEnterprise, {
  type EnterpriseModerationUser as ModerationUser,
} from '@/app/components/admin/UserModerationEnterprise';
import { isModerationSuspensionActive } from '@/lib/user-moderation-status';

type PromotionType = 'top' | 'urgent' | 'featured' | 'refresh';

type ModerationOwner = {
  accountType?: string;
  avatar?: string;
  averageRating?: number;
  banReason?: string;
  bannedAt?: string;
  bannedBy?: string;
  businessCUI?: string;
  businessDescription?: string;
  businessEmail?: string;
  businessLocation?: string;
  businessLogo?: string;
  businessName?: string;
  businessPhone?: string;
  businessRegCom?: string;
  businessWebsite?: string;
  createdAt?: string;
  creditsBalance?: number;
  email?: string;
  emailVerified?: boolean;
  failedLoginAttempts?: number;
  freeBoostsRemaining?: number;
  id?: string;
  isBanned?: boolean;
  lastActiveAt?: string;
  lastLoginAt?: string;
  lastLoginIp?: string;
  lockedUntil?: string;
  name?: string;
  phone?: string;
  phoneVerified?: boolean;
  promotionBenefits?: unknown;
  promotionDiscountPercent?: number;
  responseRate?: number;
  role?: string;
  subscriptionExpiresAt?: string;
  subscriptionRenewsAt?: string;
  subscriptionTier?: string;
  totalListings?: number;
  totalSales?: number;
  trustScore?: number;
  twoFactorEnabled?: boolean;
  updatedAt?: string;
  verificationLevel?: string;
};

type ModerationListing = {
  id: string;
  category?: string;
  ownerUser?: ModerationOwner | null;
  ownerUserId?: string;
  priceCurrency?: string;
  title?: string;
  price?: number;
  photos?: number;
  owner?: string;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  reason?: string;
  flagged?: boolean;
  flagReason?: string;
  views?: number;
  favorites?: number;
  /** Status afișat (coadă sau DB) */
  status?: string;
  /** Status din DB — pentru acțiuni admin */
  listingStatus?: string;
  isFeatured?: boolean;
  subcategory?: string;
  [key: string]: string | number | boolean | undefined | null | ModerationOwner;
};

type ModerationReport = {
  id: string;
  listingId: string;
  listing?: { id: string; title: string; category: string; ownerUserId: string };
  reporterId: string;
  reporter?: { id: string; email: string; role: string };
  reason: string;
  description?: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: string;
};

type ModerationAppeal = {
  id: string;
  userId: string;
  user?: { id: string; email: string };
  reason: string;
  evidence: string[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  response?: string;
};

const MODERATION_TABS = [
  'pending',
  'approved',
  'rejected',
  'users',
  'reports',
  'appeals',
  'invoices',
] as const;
type ModerationTab = (typeof MODERATION_TABS)[number];

function AdminModerationPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthorized, isLoading } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<ModerationTab>(() => {
    const t = searchParams.get('tab');
    if (t && (MODERATION_TABS as readonly string[]).includes(t)) return t as ModerationTab;
    return 'pending';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Clean database - no mock data
  const [pendingListings, setPendingListings] = useState<ModerationListing[]>([]);
  const [approvedListings, setApprovedListings] = useState<ModerationListing[]>([]);
  const [rejectedListings, setRejectedListings] = useState<ModerationListing[]>([]);
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [appeals, setAppeals] = useState<ModerationAppeal[]>([]);

  const [users, setUsers] = useState<ModerationUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [reportsLoading, setReportsLoading] = useState(false);
  const [appealsLoading, setAppealsLoading] = useState(false);

  const [queueTotals, setQueueTotals] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [modToday, setModToday] = useState({ approved: 0, rejected: 0 });
  const [reportsPendingTotal, setReportsPendingTotal] = useState(0);

  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ModerationUser | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const notificationIsError = notificationMessage.trim().startsWith('❌');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [userListings, setUserListings] = useState<ModerationListing[]>([]);
  const [userListingsLoading, setUserListingsLoading] = useState(false);
  const [isSavingBenefits, setIsSavingBenefits] = useState(false);
  const [creditsForm, setCreditsForm] = useState({
    credits: '',
    discount: '',
    freePromotions: '',
    promotionType: 'top' as PromotionType,
    expiryDays: 30
  });

  const setModerationTab = useCallback(
    (tab: ModerationTab) => {
      setActiveTab(tab);
      router.replace(`/admin/moderation?tab=${tab}`, { scroll: false });
    },
    [router]
  );

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && (MODERATION_TABS as readonly string[]).includes(tab)) {
      setActiveTab(tab as ModerationTab);
    }
  }, [searchParams]);

  const stats = {
    totalListings: queueTotals.pending + queueTotals.approved + queueTotals.rejected,
    pendingReview: queueTotals.pending,
    approvedToday: modToday.approved,
    rejectedToday: modToday.rejected,
    totalUsers: users.length,
    bannedUsers: users.filter((u) => u.status === 'banned').length,
    reportedListings: reportsPendingTotal,
  };

  const formatOwnerValue = (value: unknown) => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'Da' : 'Nu';
    if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '—';
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return '[object]';
      }
    }
    return String(value);
  };

  const getOwnerFields = (owner?: ModerationOwner | null) => {
    if (!owner) return [] as Array<{ key: string; value: string }>;
    return Object.entries(owner)
      .filter(([, value]) => value !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => ({ key, value: formatOwnerValue(value) }));
  };

  const groupListingsByCategoryAndUser = (listings: ModerationListing[]) => {
    const grouped: Record<string, Record<string, { owner: ModerationOwner | null; listings: ModerationListing[] }>> = {};

    listings.forEach((listing) => {
      const category = listing.category || 'Fara categorie';
      const owner = listing.ownerUser ?? null;
      const ownerKey = owner?.id || listing.owner || 'utilizator-necunoscut';

      if (!grouped[category]) grouped[category] = {};
      if (!grouped[category][ownerKey]) {
        grouped[category][ownerKey] = { owner, listings: [] };
      }
      grouped[category][ownerKey].listings.push(listing);
    });

    return grouped;
  };

  // Fetch users from API
  const fetchUsers = useCallback(async () => {
    try {
      setUsersLoading(true);
      setUsersError('');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetchWithAuthRefresh(
        '/api/admin/users?limit=1000&sort=activity',
        {
          signal: controller.signal,
          cache: 'no-store',
        }
      );

      clearTimeout(timeoutId);
      if (!response.ok) {
        const errorData = await response.text();

        if (response.status === 403) {
          setUsersError('Acces interzis - verificați autentificarea admin');
        } else if (response.status === 401) {
          setUsersError('Neautorizat - token expirat sau invalid');
        } else if (response.status >= 500) {
          setUsersError('Eroare server - contactați administratorul');
        } else {
          setUsersError(`Eroare API: ${response.status} - ${errorData}`);
        }

        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }

      const data = await response.json();
      const rawList = Array.isArray(data.users) ? data.users : [];
      if (data.success === false && typeof data.error === 'string') {
        setUsersError(data.error);
        return;
      }
      const mappedUsers: ModerationUser[] = rawList.map((user: Record<string, unknown>) => {
        const until = user.moderationSuspendedUntil as string | null | undefined;
        let status: ModerationUser['status'] = 'active';
        if (user.isBanned) status = 'banned';
        else if (until && isModerationSuspensionActive(until)) status = 'suspended';

        const count = user as { _count?: { listings?: number; reports?: number } };
        return {
          id: String(user.id ?? ''),
          email: String(user.email ?? ''),
          name: user.name != null && user.name !== '' ? String(user.name) : null,
          role: String(user.role ?? 'user'),
          status,
          listings:
            typeof count._count?.listings === 'number' ? count._count.listings : 0,
          credits: Number(user.creditsBalance) || 0,
          freePromotions: Number(user.freeBoostsRemaining) || 0,
          discount: Number(user.promotionDiscountPercent) || 0,
          trustScore: Number(user.trustScore) || 50,
          accountType: String(user.accountType ?? 'private'),
          phone: user.phone != null ? String(user.phone) : null,
          phoneVerified: Boolean(user.phoneVerified),
          emailVerified: Boolean(user.emailVerified),
          createdAt:
            user.createdAt != null
              ? new Date(user.createdAt as string).toISOString()
              : new Date().toISOString(),
          lastLoginAt:
            user.lastLoginAt != null ? new Date(user.lastLoginAt as string).toISOString() : null,
          lastActiveAt:
            user.lastActiveAt != null ? new Date(user.lastActiveAt as string).toISOString() : null,
          lastLoginIp: user.lastLoginIp != null ? String(user.lastLoginIp) : null,
          reportsCount:
            typeof count._count?.reports === 'number' ? count._count.reports : 0,
          moderationSuspendedUntil: until ? String(until) : null,
          moderationSuspensionReason:
            user.moderationSuspensionReason != null
              ? String(user.moderationSuspensionReason)
              : null,
        };
      });
      setUsers(mappedUsers.filter((u) => u.id && u.email));
    } catch (error) {
      console.error('Error fetching users:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        setUsersError('Request timeout - please try again');
      } else if (!(error instanceof Error && error.message.startsWith('HTTP'))) {
        setUsersError('Failed to load users');
      }
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // Fetch listings for a specific user
  const fetchUserListings = async (userId: string) => {
    try {
      setUserListingsLoading(true);
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetchWithAuthRefresh(`/api/admin/users/${userId}/listings`, {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      console.log('[FETCH] Response status:', response.status);
      
      if (!response.ok) {
        console.error('[FETCH] Failed - status:', response.status);
        setUserListings([]);
        return;
      }

      const data = await response.json();
      console.log('[FETCH] Response data:', data);
      
      if (data.success && Array.isArray(data.listings)) {
        const transformedListings = data.listings
          .filter((listing: any) => listing?.id)
          .map((listing: any) => ({
            id: listing.id,
            title: listing.title,
            category: listing.category,
            subcategory: listing.subcategory,
            price: listing.price,
            priceCurrency: listing.priceCurrency,
            listingStatus: typeof listing.status === 'string' ? listing.status : '',
            status: listing.queueStatus || listing.status,
            photos: Array.isArray(listing.photos) ? listing.photos.length : listing.photos ? 1 : 0,
            owner: listing.owner,
            ownerUserId: listing.ownerUserId,
            submittedAt: listing.createdAt ? new Date(listing.createdAt).toLocaleDateString('ro-RO') : '—',
            notes: listing.notes,
            queueId: listing.queueId,
            moderator: listing.moderator,
            isFeatured: !!listing.isFeatured,
            views: typeof listing.views === 'number' ? listing.views : 0,
          }));
        setUserListings(transformedListings);
      } else {
        setUserListings([]);
      }
    } catch (error) {
      console.error('Error fetching user listings:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Request timeout for user listings');
      }
      setUserListings([]);
    } finally {
      setUserListingsLoading(false);
    }
  };

  // Fetch reports from API
  const fetchReports = async () => {
    try {
      setReportsLoading(true);
      const token = localStorage.getItem('accessToken');
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch('/api/admin/reports?status=pending', {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error('Failed to fetch reports');
      
      const data = await response.json();
      setReports(data.reports || []);
      setReportsPendingTotal(
        typeof data.total === 'number' ? data.total : Array.isArray(data.reports) ? data.reports.length : 0
      );
    } catch (error) {
      console.error('Error fetching reports:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Request timeout for reports');
      }
    } finally {
      setReportsLoading(false);
    }
  };

  // Fetch appeals from API
  const fetchAppeals = async () => {
    try {
      setAppealsLoading(true);
      const token = localStorage.getItem('accessToken');
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch('/api/admin/appeals?status=pending', {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error('Failed to fetch appeals');
      
      const data = await response.json();
      setAppeals(data.appeals || []);
    } catch (error) {
      console.error('Error fetching appeals:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Request timeout for appeals');
      }
    } finally {
      setAppealsLoading(false);
    }
  };

  // Report action handlers
  const resolveReport = async (reportId: string, resolution: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/admin/reports/${reportId}/resolve`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'resolved', resolution }),
      });

      if (!response.ok) throw new Error('Failed to resolve report');

      setReports(reports.filter(r => r.id !== reportId));
      setNotificationMessage('✅ Raportare rezolvată');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    } catch (error) {
      console.error('Error resolving report:', error);
      setNotificationMessage('❌ Eroare la rezolvare');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    }
  };

  const dismissReport = async (reportId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/admin/reports/${reportId}/resolve`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'dismissed', resolution: 'Dismissed by admin' }),
      });

      if (!response.ok) throw new Error('Failed to dismiss report');

      setReports(reports.filter(r => r.id !== reportId));
      setNotificationMessage('❌ Raportare respinsă');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    } catch (error) {
      console.error('Error dismissing report:', error);
      setNotificationMessage('❌ Eroare la respingere');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    }
  };

  // Appeal action handlers
  const approveAppeal = async (appealId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/admin/appeals/${appealId}/resolve`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'approved', response: 'Apelul a fost aprobat' }),
      });

      if (!response.ok) throw new Error('Failed to approve appeal');

      setAppeals(appeals.filter(a => a.id !== appealId));
      setNotificationMessage('✅ Apel aprobat');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    } catch (error) {
      console.error('Error approving appeal:', error);
      setNotificationMessage('❌ Eroare la aprobare');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    }
  };

  const rejectAppeal = async (appealId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/admin/appeals/${appealId}/resolve`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'rejected', response: 'Apelul a fost respins' }),
      });

      if (!response.ok) throw new Error('Failed to reject appeal');

      setAppeals(appeals.filter(a => a.id !== appealId));
      setNotificationMessage('❌ Apel respins');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    } catch (error) {
      console.error('Error rejecting appeal:', error);
      setNotificationMessage('❌ Eroare la respingere');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    }
  };

  useEffect(() => {
    if (!isLoading && !isAuthorized) {
      router.push('/');
    }
  }, [router, isAuthorized, isLoading]);

  // Fetch listings from API
  const fetchListings = async (opts?: { throwOnError?: boolean }) => {
    const { throwOnError = false } = opts || {};
    try {
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const [pendingResponse, approvedResponse, rejectedResponse] = await Promise.all([
        fetchWithAuthRefresh('/api/admin/moderation/queue?status=pending', {
          cache: 'no-store',
          signal: controller.signal,
        }),
        fetchWithAuthRefresh('/api/admin/moderation/queue?status=approved', {
          cache: 'no-store',
          signal: controller.signal,
        }),
        fetchWithAuthRefresh('/api/admin/moderation/queue?status=rejected', {
          cache: 'no-store',
          signal: controller.signal,
        }),
      ]);

      clearTimeout(timeoutId);

      const responses = [pendingResponse, approvedResponse, rejectedResponse];
      const failedResponse = responses.find((response) => !response.ok);

      if (failedResponse) {
        console.error('Failed to fetch moderation queue:', failedResponse.status);
        throw new Error('Failed to fetch moderation queue');
      }

      const [pendingData, approvedData, rejectedData] = await Promise.all([
        pendingResponse.json(),
        approvedResponse.json(),
        rejectedResponse.json(),
      ]);

      const transformItems = (items: any[]) => items.map((queueItem: any) => ({
        // Queue identifiers
        id: queueItem.listing?.id || queueItem.id,
        queueId: queueItem.id,
        status: queueItem.status,

        // Listing data
        category: queueItem.listing?.category,
        owner: queueItem.listing?.owner?.email || 'Utilizator necunoscut',
        ownerUser: queueItem.listing?.owner || null,
        ownerUserId: queueItem.listing?.ownerUserId,
        photos: queueItem.listing?.photos?.length || 0,
        price: queueItem.listing?.priceAmount,
        priceCurrency: queueItem.listing?.priceCurrency || 'RON',
        subcategory: queueItem.listing?.subcategory,
        submittedAt: queueItem.createdAt ? new Date(queueItem.createdAt).toLocaleDateString('ro-RO') : '—',
        title: queueItem.listing?.title || 'Anunț fără titlu',

        // Moderation queue data
        approvedAt: queueItem.status === 'approved' && queueItem.updatedAt
          ? new Date(queueItem.updatedAt).toLocaleDateString('ro-RO')
          : undefined,
        rejectedAt: queueItem.status === 'rejected' && queueItem.updatedAt
          ? new Date(queueItem.updatedAt).toLocaleDateString('ro-RO')
          : undefined,
        assignedTo: queueItem.assignedTo,
        moderator: queueItem.moderator?.email,
        notes: queueItem.notes,
        priority: queueItem.priority,
      }));

      setPendingListings(transformItems(pendingData.items || []));
      setApprovedListings(transformItems(approvedData.items || []));
      setRejectedListings(transformItems(rejectedData.items || []));
      setQueueTotals({
        pending: typeof pendingData.total === 'number' ? pendingData.total : 0,
        approved: typeof approvedData.total === 'number' ? approvedData.total : 0,
        rejected: typeof rejectedData.total === 'number' ? rejectedData.total : 0,
      });
    } catch (error) {
      console.error('Error fetching listings:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Request timeout for listings');
      }
      // Fallback: still allow viewing even if queue is empty
      setPendingListings([]);
      setApprovedListings([]);
      setRejectedListings([]);

      if (throwOnError) throw error;
    }
  };

  // Listări, rapoarte, apeluri la încărcare
  useEffect(() => {
    if (!isLoading && isAuthorized) {
      fetchListings();
      fetchReports();
      fetchAppeals();
    }
  }, [isAuthorized, isLoading]);

  useEffect(() => {
    if (!isAuthorized || isLoading) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetchWithAuthRefresh('/api/admin/analytics/summary');
        if (cancelled || !r.ok) return;
        const d = await r.json();
        if (!d.success) return;
        setModToday({
          approved: typeof d.listings?.moderatedApprovedToday === 'number' ? d.listings.moderatedApprovedToday : 0,
          rejected: typeof d.listings?.moderatedRejectedToday === 'number' ? d.listings.moderatedRejectedToday : 0,
        });
      } catch {
        if (!cancelled) setModToday({ approved: 0, rejected: 0 });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthorized, isLoading]);

  /** Preload users so "Utilizatori (N)" is correct without tab click. */
  useEffect(() => {
    if (isLoading || !isAuthorized) return;
    if (users.length > 0 && activeTab !== 'users') return;
    fetchUsers();
  }, [activeTab, isAuthorized, isLoading, fetchUsers, users.length]);

  const renderGroupedListings = (
    listings: ModerationListing[],
    emptyMessage: string,
    actionsRenderer: (listing: ModerationListing) => ReactNode
  ) => {
    if (listings.length === 0) {
      return (
        <div className="py-12 text-center">
          <p className="text-lg text-[var(--text-tertiary)]">{emptyMessage}</p>
        </div>
      );
    }

    const grouped = groupListingsByCategoryAndUser(listings);
    const categories = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

    return (
      <div className="space-y-6">
        {categories.map((category) => {
          const usersGroup = grouped[category];
          const userKeys = Object.keys(usersGroup).sort((a, b) => a.localeCompare(b));
          const categoryCount = userKeys.reduce((sum, key) => sum + usersGroup[key].listings.length, 0);

          return (
            <div
              key={category}
              className="rounded-2xl border border-white/[0.08] bg-[var(--bg-elevated)]/95 p-5 shadow-[var(--shadow-md)]"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">{category}</h3>
                <span className="rounded-full border border-white/[0.08] bg-[var(--bg-primary)]/50 px-3 py-1 text-xs text-[var(--text-secondary)]">
                  {categoryCount} anunțuri
                </span>
              </div>

              <div className="space-y-4">
                {userKeys.map((userKey) => {
                  const group = usersGroup[userKey];
                  const owner = group.owner;
                  const ownerFields = getOwnerFields(owner);
                  const ownerId = owner?.id || group.listings[0]?.ownerUserId || '—';

                  return (
                    <div
                      key={userKey}
                      className="rounded-xl border border-white/[0.06] bg-[var(--bg-primary)]/45 p-4"
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-lg font-semibold text-[var(--text-primary)]">
                            {owner?.email || 'Utilizator necunoscut'}
                          </div>
                          <div className="text-sm text-[var(--text-tertiary)]">ID: {ownerId}</div>
                        </div>
                        <span className="rounded-full border border-white/[0.08] bg-[var(--bg-elevated)]/80 px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
                          {group.listings.length} anunțuri
                        </span>
                      </div>

                      <details className="mb-4">
                        <summary className="cursor-pointer text-sm font-medium text-[var(--text-secondary)]">
                          Detalii utilizator
                        </summary>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {ownerFields.length === 0 ? (
                            <div className="text-sm text-[var(--text-muted)]">Detalii indisponibile</div>
                          ) : (
                            ownerFields.map((field) => (
                              <div
                                key={field.key}
                                className="rounded-lg border border-white/[0.06] bg-[var(--bg-elevated)]/50 px-3 py-2 text-xs"
                              >
                                <div className="text-[var(--text-muted)]">{field.key}</div>
                                <div className="break-words text-[var(--text-secondary)]">{field.value}</div>
                              </div>
                            ))
                          )}
                        </div>
                      </details>

                      <div className="space-y-3">
                        {group.listings.map((listing) => (
                          <div
                            key={listing.id}
                            className={`rounded-xl border bg-[var(--bg-elevated)]/80 p-4 ${
                              listing.flagged ? 'border-red-500/40' : 'border-white/[0.08]'
                            }`}
                          >
                            {listing.flagged && (
                              <div className="mb-3 rounded-lg border border-red-500/40 bg-red-500/15 p-2 text-sm">
                                <span className="font-medium text-red-300">Semnalat: {listing.flagReason}</span>
                              </div>
                            )}

                            <div className="grid items-start gap-4 md:grid-cols-5">
                              <div className="md:col-span-3">
                                <h3 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">
                                  {listing.title}
                                </h3>
                                <div className="mb-2 flex flex-wrap items-center gap-3">
                                  <span className="text-xl font-semibold text-[var(--text-primary)]">
                                    {listing.price != null
                                      ? `${listing.price.toLocaleString()} ${listing.priceCurrency}`
                                      : '—'}
                                  </span>
                                  <span className="rounded border border-white/[0.06] bg-[var(--bg-primary)]/50 px-2 py-1 text-xs text-[var(--text-tertiary)]">
                                    {listing.photos} foto
                                  </span>
                                  {listing.subcategory ? (
                                    <span className="rounded border border-white/[0.06] bg-[var(--bg-primary)]/50 px-2 py-1 text-xs text-[var(--text-tertiary)]">
                                      {listing.subcategory}
                                    </span>
                                  ) : null}
                                </div>
                                <div className="text-sm text-[var(--text-tertiary)]">
                                  <p>{listing.owner}</p>
                                  <p>Trimis: {listing.submittedAt}</p>
                                  {listing.approvedAt ? <p>Aprobat: {listing.approvedAt}</p> : null}
                                  {listing.rejectedAt ? <p>Respins: {listing.rejectedAt}</p> : null}
                                </div>
                              </div>

                              <div className="md:col-span-2 flex flex-col gap-2">
                                {actionsRenderer(listing)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const approveListing = async (id: string) => {
    const listing = pendingListings.find(l => l.id === id);
    if (!listing) return;

    // IMPORTANT: endpointul cere id-ul din `moderation_queue` (queueId), nu `listingId`.
    const queueId = listing.queueId || id;
    const previousPending = pendingListings;
    const previousApproved = approvedListings;

    try {
      // Optimistic UI, dar adevărul vine din backend.
      setPendingListings(previousPending.filter(l => l.id !== id));
      setApprovedListings([
        ...previousApproved,
        {
          ...listing,
          status: 'approved',
          approvedAt: new Date().toISOString(),
          views: 0,
          favorites: 0,
        },
      ]);

      const approveRes = await postJsonWithAuthRefresh(`/api/admin/moderation/${queueId}/approve`, {});
      if (!approveRes.ok) {
        const text = await approveRes.text().catch(() => '');
        let message = `Eroare la aprobare (${approveRes.status})`;
        try {
          const payload = text ? JSON.parse(text) : null;
          if (payload?.error) message = String(payload.error);
          else if (typeof payload === 'string') message = payload;
          else if (text) message = text;
        } catch {
          if (text) message = text;
        }
        throw new Error(message);
      }

      // Re-sincronizează din backend ca userul să vadă instant `status=active`.
      await fetchListings({ throwOnError: true });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Eroare la aprobare';
      setNotificationMessage(`❌ ${msg}`);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3500);

      // Rollback optimist.
      setPendingListings(previousPending);
      setApprovedListings(previousApproved);
    }
  };

  const rejectListing = async (id: string) => {
    const reason = prompt('Motivul respingerii:');
    if (!reason) return;

    const listing = pendingListings.find(l => l.id === id);
    if (!listing) return;

    const queueId = listing.queueId || id;
    const previousPending = pendingListings;
    const previousRejected = rejectedListings;

    try {
      setPendingListings(previousPending.filter(l => l.id !== id));
      setRejectedListings([
        ...previousRejected,
        {
          ...listing,
          status: 'rejected',
          rejectedAt: new Date().toISOString(),
          reason,
        },
      ]);

      const rejectRes = await postJsonWithAuthRefresh(`/api/admin/moderation/${queueId}/reject`, { reason });
      if (!rejectRes.ok) {
        const text = await rejectRes.text().catch(() => '');
        let message = `Eroare la respingere (${rejectRes.status})`;
        try {
          const payload = text ? JSON.parse(text) : null;
          if (payload?.error) message = String(payload.error);
          else if (text) message = text;
        } catch {
          if (text) message = text;
        }
        throw new Error(message);
      }

      await fetchListings({ throwOnError: true });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Eroare la respingere';
      setNotificationMessage(`❌ ${msg}`);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3500);

      setPendingListings(previousPending);
      setRejectedListings(previousRejected);
    }
  };

  const runListingModeration = async (
    listingId: string,
    body: { status?: string; isFeatured?: boolean; moderationNotes?: string }
  ) => {
    try {
      const res = await jsonMutationWithAuthRefresh(`/api/admin/listings/${listingId}`, 'PATCH', body as Record<string, unknown>);
      const text = await res.text();
      let payload: { error?: string } | null = null;
      try {
        payload = text ? JSON.parse(text) : null;
      } catch {
        payload = null;
      }
      if (!res.ok) {
        throw new Error(payload?.error || `Eroare API (${res.status})`);
      }
      setNotificationMessage('✅ Anunț actualizat');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 2800);
      if (expandedUserId) {
        fetchUserListings(expandedUserId);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Eroare';
      setNotificationMessage(`❌ ${msg}`);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 4000);
    }
  };

  const deleteListing = async (listingId: string) => {
    if (!confirm('Ștergi definitiv acest anunț din baza de date?')) return;
    try {
      const res = await jsonMutationWithAuthRefresh(`/api/admin/listings/${listingId}`, 'DELETE');
      const text = await res.text();
      let payload: { error?: string } | null = null;
      try {
        payload = text ? JSON.parse(text) : null;
      } catch {
        payload = null;
      }
      if (!res.ok) {
        throw new Error(payload?.error || `Eroare API (${res.status})`);
      }
      setNotificationMessage('✅ Anunț șters');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 2800);
      if (expandedUserId) {
        fetchUserListings(expandedUserId);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Eroare la ștergere';
      setNotificationMessage(`❌ ${msg}`);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 4000);
    }
  };

  const banUser = async (userId: string) => {
    const reason = prompt('Motivul blocării (opcional):');
    if (reason === null) return; // User cancelled
    
    if (!confirm('Blochezi acest utilizator?')) return;
    
    try {
      const response = await postJsonWithAuthRefresh(`/api/admin/users/${userId}/ban`, {
        reason: reason || 'Admin action',
      });

      if (!response.ok) {
        const t = await response.text();
        let err = 'Failed to ban user';
        try {
          const j = t ? JSON.parse(t) : null;
          if (j?.error) err = String(j.error);
        } catch {
          /* ignore */
        }
        throw new Error(err);
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                status: 'banned',
                moderationSuspendedUntil: null,
                moderationSuspensionReason: null,
              }
            : u
        )
      );
      
      setNotificationMessage('✅ Utilizator blocat cu succes');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    } catch (error) {
      console.error('Error banning user:', error);
      setNotificationMessage('❌ Eroare la blocarea utilizatorului');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    }
  };

  const unbanUser = async (userId: string) => {
    if (!confirm('Deblochezi acest utilizator?')) return;
    
    try {
      const response = await postJsonWithAuthRefresh(`/api/admin/users/${userId}/unban`, {});

      if (!response.ok) {
        const t = await response.text();
        let err = 'Failed to unban user';
        try {
          const j = t ? JSON.parse(t) : null;
          if (j?.error) err = String(j.error);
        } catch {
          /* ignore */
        }
        throw new Error(err);
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: 'active' } : u))
      );

      setNotificationMessage('✅ Utilizator deblocat cu succes');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    } catch (error) {
      console.error('Error unbanning user:', error);
      setNotificationMessage('❌ Eroare la deblocarea utilizatorului');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    }
  };

  const makeAdmin = async (userId: string) => {
    if (!confirm('Faci acest utilizator administrator?')) return;
    
    try {
      const response = await putJsonWithAuthRefresh(`/api/admin/users/${userId}/role`, {
        role: 'admin',
      });

      if (!response.ok) {
        const t = await response.text();
        let err = 'Failed to promote user';
        try {
          const j = t ? JSON.parse(t) : null;
          if (j?.error) err = String(j.error);
        } catch {
          /* ignore */
        }
        throw new Error(err);
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: 'admin' } : u))
      );

      setNotificationMessage('✅ Utilizator promovat la admin');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    } catch (error) {
      console.error('Error promoting user:', error);
      setNotificationMessage('❌ Eroare la promovarea utilizatorului');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    }
  };

  const suspendUserApi = async (userId: string, durationHours: number, reason: string) => {
    const response = await postJsonWithAuthRefresh(`/api/admin/users/${userId}/suspend`, {
      durationHours,
      reason,
    });
    if (!response.ok) {
      const t = await response.text();
      let err = 'Eroare la suspendare';
      try {
        const j = t ? JSON.parse(t) : null;
        if (j?.error) err = String(j.error);
      } catch {
        /* ignore */
      }
      throw new Error(err);
    }
    const until = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              status: 'suspended',
              moderationSuspendedUntil: until,
              moderationSuspensionReason: reason,
            }
          : u
      )
    );
    setNotificationMessage('✅ Suspendare temporară aplicată');
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  const unsuspendUserApi = async (userId: string) => {
    const response = await postJsonWithAuthRefresh(`/api/admin/users/${userId}/unsuspend`, {});
    if (!response.ok) {
      const t = await response.text();
      let err = 'Eroare';
      try {
        const j = t ? JSON.parse(t) : null;
        if (j?.error) err = String(j.error);
      } catch {
        /* ignore */
      }
      throw new Error(err);
    }
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              status: 'active',
              moderationSuspendedUntil: null,
              moderationSuspensionReason: null,
            }
          : u
      )
    );
    setNotificationMessage('✅ Suspendarea a fost ridicată');
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  const toggleUserRow = (userId: string) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      setUserListings([]);
    } else {
      setExpandedUserId(userId);
      setUserListings([]);
      fetchUserListings(userId);
    }
  };

  const openCreditsModal = (user: ModerationUser) => {
    setSelectedUser(user);
    setCreditsForm({
      credits: (user.credits || '').toString(),
      discount: (user.discount || '').toString(),
      freePromotions: (user.freePromotions || '').toString(),
      promotionType: 'top',
      expiryDays: 30
    });
    setShowCreditsModal(true);
  };

  const handleSaveCredits = async () => {
    if (!selectedUser || isSavingBenefits) return;

    const credits = creditsForm.credits ? parseInt(creditsForm.credits, 10) : 0;
    const discount = creditsForm.discount ? parseInt(creditsForm.discount, 10) : 0;
    const freePromotions = creditsForm.freePromotions ? parseInt(creditsForm.freePromotions, 10) : 0;

    if ([credits, discount, freePromotions].some((value) => Number.isNaN(value))) {
      setNotificationMessage('❌ Valorile introduse sunt invalide');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
      return;
    }

    setIsSavingBenefits(true);

    try {
      // Always refresh CSRF token before privileged writes (avoids stale cached token mismatch).
      clearCsrfTokenCache();

      // Avoid leaving the UI stuck if `/api/csrf` stalls.
      const csrfToken = await Promise.race<string>([
        getCsrfToken(),
        new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout: CSRF token fetch')), 5000)
        ),
      ]);
      let bearerToken = localStorage.getItem('accessToken');

      // If backend stalls (DB/prisma issues), fail fast so `finally` resets loading.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const doRequest = async (tokenToUse: string) => {
        return fetch(`/api/admin/users/${selectedUser.id}/benefits`, {
          method: 'POST',
          credentials: 'include',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': tokenToUse,
            ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
          },
          body: JSON.stringify({
            creditsBonus: credits,
            globalDiscount: discount,
            freePromotions,
            promotionType: creditsForm.promotionType,
            expiryDays: creditsForm.expiryDays,
          }),
        });
      };

      const fetchCsrfTokenFresh = async () => {
        clearCsrfTokenCache();
        return Promise.race<string>([
          getCsrfToken(),
          new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout: CSRF token fetch')), 5000)
          ),
        ]);
      };

      let response = await doRequest(csrfToken);
      if (response.status === 403) {
        // Read body once to decide if it's CSRF-related or auth-related.
        const firstText = await response.text();
        let firstPayload: any = null;
        try {
          firstPayload = firstText ? JSON.parse(firstText) : null;
        } catch {
          firstPayload = null;
        }

        // Refresh: body sau cookie httpOnly (localStorage poate să nu mai aibă refreshToken).
        if (firstPayload?.error === 'Acces interzis') {
          const rt = (localStorage.getItem('refreshToken') || '').trim();
          const csrfForRefresh = await fetchCsrfTokenFresh();
          const refreshResp = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              'x-csrf-token': csrfForRefresh,
            },
            body: JSON.stringify(rt ? { refreshToken: rt } : {}),
          });

          if (refreshResp.ok) {
            const refreshJson: any = await refreshResp.json();
            const newAccess = refreshJson?.accessToken as string | undefined;
            if (newAccess) {
              bearerToken = newAccess;
              localStorage.setItem('accessToken', newAccess);
            }
            if (refreshJson?.user) {
              localStorage.setItem('user', JSON.stringify(refreshJson.user));
            }
          }
        }

        // Retry once with freshly fetched CSRF (covers rotated cookies / stale token cache).
        const freshCsrfToken = await fetchCsrfTokenFresh();
        response = await doRequest(freshCsrfToken);
      }

      clearTimeout(timeoutId);

      const responseText = await response.text();
      let payload: any = null;

      if (responseText) {
        try {
          payload = JSON.parse(responseText);
        } catch {
          payload = null;
        }
      }

      if (!response.ok) {
        const msg = payload?.error || `Eroare API (${response.status})`;
        if (response.status === 403 && msg === 'Acces interzis') {
          throw new Error(
            'Sesiune expirată sau lipsă refresh token. Deloghează-te și autentifică-te din nou, apoi reîncearcă.'
          );
        }
        throw new Error(msg);
      }

      const updatedUser = payload?.user;

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === selectedUser.id
            ? {
                ...user,
                credits: updatedUser?.creditsBalance ?? user.credits + credits,
                discount: updatedUser?.promotionDiscountPercent ?? discount,
                freePromotions,
              }
            : user
        )
      );

      setNotificationMessage(`✅ Beneficii actualizate pentru ${selectedUser.email}`);
      setShowNotification(true);
      setShowCreditsModal(false);

      setTimeout(() => {
        setShowNotification(false);
      }, 3000);
    } catch (error: any) {
      console.error('Error saving benefits:', error);
      if (error?.name === 'AbortError') {
        setNotificationMessage('❌ Timeout la salvarea beneficiilor. Reîncearcă.');
      } else if (typeof error?.message === 'string' && error.message.startsWith('Timeout: CSRF')) {
        setNotificationMessage('❌ Nu am putut obține CSRF token. Reîncearcă.');
      } else {
        setNotificationMessage(`❌ ${error?.message || 'Eroare la salvarea beneficiilor'}`);
      }
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    } finally {
      setIsSavingBenefits(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center">
          <div
            className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-white/15 border-t-[var(--accent-primary)]"
            aria-hidden
          />
          <p className="text-sm text-[var(--text-tertiary)]">Verificare acces admin…</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] px-4">
        <div className="max-w-md rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <p className="text-lg font-semibold text-red-300">Acces respins</p>
          <p className="mt-2 text-sm text-[var(--text-tertiary)]">Nu ai permisiunea pentru această pagină.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      
      {/* Notificare modernă */}
      {showNotification && (
        <div className="animate-slideDown fixed right-4 top-20 z-[200] max-w-md">
          <div
            className={`flex items-center gap-3 rounded-2xl border px-5 py-4 shadow-[var(--shadow-xl)] backdrop-blur-md ${
              notificationIsError
                ? 'border-red-500/35 bg-red-950/90 text-red-50'
                : 'border-emerald-500/35 bg-emerald-950/90 text-emerald-50'
            }`}
          >
            <div className="shrink-0">
              {notificationIsError ? (
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-10.293a1 1 0 00-1.414-1.414L10 8.586 7.707 6.293a1 1 0 00-1.414 1.414L8.586 10l-2.293 2.293a1 1 0 001.414 1.414L10 11.414l2.293 2.293a1 1 0 001.414-1.414L11.414 10l2.293-2.293z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
            <p className="min-w-0 flex-1 text-sm font-medium leading-snug">{notificationMessage}</p>
          </div>
        </div>
      )}
      
      <main className="min-h-screen bg-[var(--bg-primary)] pb-14 pt-20">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <header className="mb-10 flex flex-col gap-4 border-b border-[var(--border-primary)] pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Conținut
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-4xl">
                Moderare
              </h1>
              <p className="mt-2 max-w-xl text-sm text-[var(--text-tertiary)]">
                Anunțuri, utilizatori, raportări și fluxuri conexe.
              </p>
            </div>
            <Link
              href="/admin/dashboard"
              className="inline-flex shrink-0 items-center justify-center rounded-xl border border-white/[0.1] bg-[var(--bg-elevated)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-focus)] hover:text-[var(--text-primary)]"
            >
              ← Dashboard
            </Link>
          </header>

          <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <button
              type="button"
              onClick={() => setModerationTab('pending')}
              className="rounded-2xl border border-white/[0.08] bg-[var(--bg-elevated)] p-5 text-left shadow-[var(--shadow-sm)] transition hover:border-[var(--border-focus)]"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">În așteptare</p>
              <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-[var(--text-primary)]">
                {stats.pendingReview}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setModerationTab('approved')}
              className="rounded-2xl border border-white/[0.08] bg-[var(--bg-elevated)] p-5 text-left shadow-[var(--shadow-sm)] transition hover:border-[var(--border-focus)]"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Aprobate azi</p>
              <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-[var(--text-primary)]">
                {stats.approvedToday}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setModerationTab('rejected')}
              className="rounded-2xl border border-white/[0.08] bg-[var(--bg-elevated)] p-5 text-left shadow-[var(--shadow-sm)] transition hover:border-[var(--border-focus)]"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Respinse azi</p>
              <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-[var(--text-primary)]">
                {stats.rejectedToday}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setModerationTab('users')}
              className="rounded-2xl border border-white/[0.08] bg-[var(--bg-elevated)] p-5 text-left shadow-[var(--shadow-sm)] transition hover:border-[var(--border-focus)]"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Utilizatori (listă)</p>
              <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-[var(--text-primary)]">
                {stats.totalUsers}
              </p>
            </button>
          </div>

          <div className="mb-6">
            <input
              type="search"
              placeholder="Caută anunț sau utilizator…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="enterprise-input w-full rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
          </div>

          <div
            className="mb-8 flex gap-2 overflow-x-auto pb-1 text-sm"
            role="tablist"
            aria-label="Secțiuni moderare"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'pending'}
              onClick={() => setModerationTab('pending')}
              className={`shrink-0 rounded-xl px-4 py-2.5 font-medium whitespace-nowrap transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] ${
                activeTab === 'pending'
                  ? 'bg-white/[0.1] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                  : 'text-[var(--text-tertiary)] hover:bg-white/[0.05] hover:text-[var(--text-primary)]'
              }`}
            >
              Așteptare ({pendingListings.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'approved'}
              onClick={() => setModerationTab('approved')}
              className={`shrink-0 rounded-xl px-4 py-2.5 font-medium whitespace-nowrap transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] ${
                activeTab === 'approved'
                  ? 'bg-white/[0.1] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                  : 'text-[var(--text-tertiary)] hover:bg-white/[0.05] hover:text-[var(--text-primary)]'
              }`}
            >
              Aprobate ({approvedListings.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'rejected'}
              onClick={() => setModerationTab('rejected')}
              className={`shrink-0 rounded-xl px-4 py-2.5 font-medium whitespace-nowrap transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] ${
                activeTab === 'rejected'
                  ? 'bg-white/[0.1] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                  : 'text-[var(--text-tertiary)] hover:bg-white/[0.05] hover:text-[var(--text-primary)]'
              }`}
            >
              Respinse ({rejectedListings.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'users'}
              onClick={() => setModerationTab('users')}
              className={`shrink-0 rounded-xl px-4 py-2.5 font-medium whitespace-nowrap transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] ${
                activeTab === 'users'
                  ? 'bg-white/[0.1] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                  : 'text-[var(--text-tertiary)] hover:bg-white/[0.05] hover:text-[var(--text-primary)]'
              }`}
            >
              Utilizatori ({users.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'reports'}
              onClick={() => setModerationTab('reports')}
              className={`shrink-0 rounded-xl px-4 py-2.5 font-medium whitespace-nowrap transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] ${
                activeTab === 'reports'
                  ? 'bg-white/[0.1] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                  : 'text-[var(--text-tertiary)] hover:bg-white/[0.05] hover:text-[var(--text-primary)]'
              }`}
            >
              Raportări ({reports.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'appeals'}
              onClick={() => setModerationTab('appeals')}
              className={`shrink-0 rounded-xl px-4 py-2.5 font-medium whitespace-nowrap transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] ${
                activeTab === 'appeals'
                  ? 'bg-white/[0.1] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                  : 'text-[var(--text-tertiary)] hover:bg-white/[0.05] hover:text-[var(--text-primary)]'
              }`}
            >
              Apeluri ({appeals.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'invoices'}
              onClick={() => setModerationTab('invoices')}
              className={`shrink-0 rounded-xl px-4 py-2.5 font-medium whitespace-nowrap transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] ${
                activeTab === 'invoices'
                  ? 'bg-white/[0.1] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                  : 'text-[var(--text-tertiary)] hover:bg-white/[0.05] hover:text-[var(--text-primary)]'
              }`}
            >
              Facturi
            </button>
          </div>

          {/* Reports Management */}
          {activeTab === 'reports' && (
            <div className="space-y-4">
              {reportsLoading ? (
                <div className="py-12 text-center">
                  <div
                    className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-[var(--accent-primary)]"
                    aria-hidden
                  />
                  <p className="text-sm text-[var(--text-tertiary)]">Se încarcă raportările…</p>
                </div>
              ) : reports.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-lg text-[var(--text-tertiary)]">Nu există raportări în așteptare</p>
                </div>
              ) : (
                reports.map(report => (
                  <div
                    key={report.id}
                    className="rounded-2xl border border-white/[0.08] bg-[var(--bg-elevated)]/95 p-6 shadow-[var(--shadow-md)]"
                  >
                    <div className="grid gap-6 md:grid-cols-3">
                      <div>
                        <h3 className="mb-3 text-lg font-semibold text-[var(--text-primary)]">
                          Raportare #{report.id.substring(0, 8)}
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-[var(--text-muted)]">Raportator:</span>
                            <p className="font-medium text-[var(--text-primary)]">
                              {report.reporter?.email || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <span className="text-[var(--text-muted)]">Motiv:</span>
                            <p className="font-medium text-[var(--text-primary)]">{report.reason}</p>
                          </div>
                          {report.description && (
                            <div>
                              <span className="text-[var(--text-muted)]">Descriere:</span>
                              <p className="text-[var(--text-secondary)]">{report.description}</p>
                            </div>
                          )}
                          <div>
                            <span className="text-[var(--text-muted)]">Data:</span>
                            <p className="text-[var(--text-secondary)]">
                              {new Date(report.createdAt).toLocaleDateString('ro-RO')}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-xl border border-white/[0.06] bg-[var(--bg-primary)]/50 p-4">
                        <h4 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Anunț</h4>
                        <div className="space-y-2 text-sm">
                          <p>
                            <span className="text-[var(--text-muted)]">Titlu:</span>
                            <br />
                            <span className="font-medium text-[var(--text-primary)]">
                              {report.listing?.title || 'N/A'}
                            </span>
                          </p>
                          <button
                            type="button"
                            onClick={() => router.push(`/listings/${report.listingId}`)}
                            className="mt-3 w-full rounded-lg border border-white/[0.1] bg-[var(--bg-secondary)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-focus)] hover:text-[var(--text-primary)]"
                          >
                            Vezi anunțul
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('Rezolvă raportarea?')) resolveReport(report.id, 'Approved by admin');
                          }}
                          className="rounded-lg border border-emerald-500/35 bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/25"
                        >
                          Rezolvă
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('Respinge?')) dismissReport(report.id);
                          }}
                          className="rounded-lg border border-white/[0.1] bg-[var(--bg-secondary)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-white/[0.05]"
                        >
                          Respinge
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Appeals Management */}
          {activeTab === 'appeals' && (
            <div className="space-y-4">
              {appealsLoading ? (
                <div className="py-12 text-center">
                  <div
                    className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-[var(--accent-primary)]"
                    aria-hidden
                  />
                  <p className="text-sm text-[var(--text-tertiary)]">Se încarcă apelurile…</p>
                </div>
              ) : appeals.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-lg text-[var(--text-tertiary)]">Nu există apeluri în așteptare</p>
                </div>
              ) : (
                appeals.map(appeal => (
                  <div
                    key={appeal.id}
                    className="rounded-2xl border border-white/[0.08] bg-[var(--bg-elevated)]/95 p-6 shadow-[var(--shadow-md)]"
                  >
                    <div className="grid gap-6 md:grid-cols-3">
                      <div>
                        <h3 className="mb-3 text-lg font-semibold text-[var(--text-primary)]">
                          Apel #{appeal.id.substring(0, 8)}
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-[var(--text-muted)]">Utilizator:</span>
                            <p className="font-medium text-[var(--text-primary)]">{appeal.user?.email || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-[var(--text-muted)]">Motiv:</span>
                            <p className="text-[var(--text-secondary)]">{appeal.reason}</p>
                          </div>
                          <div>
                            <span className="text-[var(--text-muted)]">Data:</span>
                            <p className="text-[var(--text-secondary)]">
                              {new Date(appeal.createdAt).toLocaleDateString('ro-RO')}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-xl border border-white/[0.06] bg-[var(--bg-primary)]/50 p-4">
                        <h4 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Detalii</h4>
                        <p className="text-xs text-[var(--text-secondary)]">
                          Status:{' '}
                          <span className="font-medium text-amber-300/90">În așteptare</span>
                        </p>
                        <p className="mt-2 text-xs text-[var(--text-tertiary)]">
                          Utilizatorul contestă o acțiune.
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('Aprobă apelul?')) approveAppeal(appeal.id);
                          }}
                          className="rounded-lg border border-emerald-500/35 bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/25"
                        >
                          Aprobă
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('Respinge?')) rejectAppeal(appeal.id);
                          }}
                          className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/20"
                        >
                          Respinge
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Invoices & Accounting */}
          {activeTab === 'invoices' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-white/[0.08] bg-[var(--bg-elevated)]/95 p-6 shadow-[var(--shadow-md)]">
                <h2 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">Facturi & contabilitate</h2>
                <p className="mb-6 text-sm text-[var(--text-tertiary)]">
                  Modul complet de facturare, export și ANAF este pe pagina dedicată.
                </p>

                <div className="mb-6 grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-white/[0.06] bg-[var(--bg-primary)]/50 px-4 py-3">
                    <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">Listă</div>
                    <div className="text-sm font-medium text-[var(--text-primary)]">Facturi & filtre</div>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-[var(--bg-primary)]/50 px-4 py-3">
                    <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">Export</div>
                    <div className="text-sm font-medium text-[var(--text-primary)]">CSV / batch</div>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-[var(--bg-primary)]/50 px-4 py-3">
                    <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">ANAF</div>
                    <div className="text-sm font-medium text-[var(--text-primary)]">Flux SPV</div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => router.push('/admin/invoices')}
                    className="rounded-xl bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-dark)] px-6 py-3 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition hover:brightness-110"
                  >
                    Deschide facturi
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/admin/invoices')}
                    className="rounded-xl border border-white/[0.1] bg-[var(--bg-secondary)] px-6 py-3 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-focus)] hover:text-[var(--text-primary)]"
                  >
                    Spre export (din aceeași pagină)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Pending Listings */}
          {activeTab === 'pending' && (
            renderGroupedListings(
              pendingListings,
              'Nu sunt anunțuri în așteptare',
              (listing) => (
                <>
                  <button
                    type="button"
                    onClick={() => router.push(`/listings/${listing.id}`)}
                    className="w-full rounded-lg border border-white/[0.1] bg-[var(--bg-secondary)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-focus)] hover:text-[var(--text-primary)]"
                  >
                    Vezi
                  </button>
                  <button
                    type="button"
                    onClick={() => approveListing(listing.id)}
                    className="w-full rounded-lg border border-emerald-500/35 bg-emerald-500/15 px-3 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/25"
                  >
                    Aprobă
                  </button>
                  <button
                    type="button"
                    onClick={() => rejectListing(listing.id)}
                    className="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/20"
                  >
                    Respinge
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Ești sigur că vrei să suspezi acest anunț?')) {
                        setApprovedListings(approvedListings.filter(l => l.id !== listing.id));
                        setPendingListings(pendingListings.filter(l => l.id !== listing.id));
                        setNotificationMessage('Anunț suspendat');
                        setShowNotification(true);
                        setTimeout(() => setShowNotification(false), 3000);
                      }
                    }}
                    className="w-full rounded-lg border border-amber-500/35 bg-amber-500/12 px-3 py-2 text-sm font-medium text-amber-200 transition hover:bg-amber-500/22"
                  >
                    Suspendă
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Ești sigur că vrei să ștergi PERMANENT acest anunț?')) {
                        setPendingListings(pendingListings.filter(l => l.id !== listing.id));
                        setNotificationMessage('Anunț șters permanent');
                        setShowNotification(true);
                        setTimeout(() => setShowNotification(false), 3000);
                      }
                    }}
                    className="w-full rounded-lg border border-red-700/50 bg-red-950/30 px-3 py-2 text-sm font-medium text-red-300 transition hover:bg-red-950/50"
                  >
                    Șterge permanent
                  </button>
                </>
              )
            )
          )}

          {/* Approved Listings */}
          {activeTab === 'approved' && (
            renderGroupedListings(
              approvedListings,
              'Nu sunt anunțuri aprobate',
              (listing) => (
                <>
                  <button
                    type="button"
                    onClick={() => router.push(`/listings/${listing.id}`)}
                    className="w-full rounded-lg border border-white/[0.1] bg-[var(--bg-secondary)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-focus)] hover:text-[var(--text-primary)]"
                  >
                    Vezi
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Ești sigur că vrei să suspezi acest anunț?')) {
                        setApprovedListings(approvedListings.filter(l => l.id !== listing.id));
                        setNotificationMessage('Anunț suspendat');
                        setShowNotification(true);
                        setTimeout(() => setShowNotification(false), 3000);
                      }
                    }}
                    className="w-full rounded-lg border border-amber-500/35 bg-amber-500/12 px-3 py-2 text-sm font-medium text-amber-200 transition hover:bg-amber-500/22"
                  >
                    Suspendă
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Ești sigur că vrei să ștergi PERMANENT acest anunț?')) {
                        setApprovedListings(approvedListings.filter(l => l.id !== listing.id));
                        setNotificationMessage('Anunț șters permanent');
                        setShowNotification(true);
                        setTimeout(() => setShowNotification(false), 3000);
                      }
                    }}
                    className="w-full rounded-lg border border-red-700/50 bg-red-950/30 px-3 py-2 text-sm font-medium text-red-300 transition hover:bg-red-950/50"
                  >
                    Șterge
                  </button>
                </>
              )
            )
          )}

          {/* Rejected Listings */}
          {activeTab === 'rejected' && (
            renderGroupedListings(
              rejectedListings,
              'Nu sunt anunțuri respinse',
              (listing) => (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Ești sigur că vrei să ștergi PERMANENT acest anunț?')) {
                        setRejectedListings(rejectedListings.filter(l => l.id !== listing.id));
                        setNotificationMessage('Anunț șters permanent');
                        setShowNotification(true);
                        setTimeout(() => setShowNotification(false), 3000);
                      }
                    }}
                    className="w-full rounded-lg border border-red-700/50 bg-red-950/30 px-3 py-2 text-sm font-medium text-red-300 transition hover:bg-red-950/50"
                  >
                    Șterge permanent
                  </button>
                </>
              )
            )
          )}

          {/* Users Management */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <UserModerationEnterprise
                users={users}
                loading={usersLoading}
                error={usersError}
                onRetry={fetchUsers}
                searchQuery={userSearchQuery}
                onSearchChange={setUserSearchQuery}
                expandedUserId={expandedUserId}
                onToggleRow={toggleUserRow}
                onOpenCredits={openCreditsModal}
                onBan={banUser}
                onUnban={unbanUser}
                onMakeAdmin={makeAdmin}
                onSuspend={suspendUserApi}
                onUnsuspend={unsuspendUserApi}
              />
              {expandedUserId &&
                !usersLoading &&
                !usersError &&
                (() => {
                  const detailUser = users.find((u) => u.id === expandedUserId);
                  if (!detailUser) return null;
                  const fmt = (iso: string | null | undefined) => {
                    if (!iso) return '—';
                    try {
                      return new Date(iso).toLocaleString('ro-RO', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      });
                    } catch {
                      return '—';
                    }
                  };
                  const labelClass =
                    'text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]';
                  return (
                    <div className="space-y-6 rounded-2xl border border-white/[0.08] bg-[var(--bg-elevated)]/95 p-6 shadow-[var(--shadow-md)]">
                      <div className="flex flex-col gap-3 border-b border-white/[0.06] pb-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
                            Detalii utilizator
                          </h3>
                          <p className="mt-1 font-mono text-xs text-[var(--text-muted)]">{detailUser.id}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleUserRow(detailUser.id)}
                          className="self-start rounded-xl border border-white/[0.1] bg-[var(--bg-secondary)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-white/[0.05]"
                        >
                          Închide panoul
                        </button>
                      </div>
                      <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-xl border border-white/[0.06] bg-[var(--bg-primary)]/40 p-4">
                          <dt className={labelClass}>Email</dt>
                          <dd className="mt-1 font-semibold text-[var(--text-primary)]">{detailUser.email}</dd>
                        </div>
                        <div className="rounded-xl border border-white/[0.06] bg-[var(--bg-primary)]/40 p-4">
                          <dt className={labelClass}>Nume</dt>
                          <dd className="mt-1 text-[var(--text-secondary)]">{detailUser.name ?? '—'}</dd>
                        </div>
                        <div className="rounded-xl border border-white/[0.06] bg-[var(--bg-primary)]/40 p-4">
                          <dt className={labelClass}>Telefon</dt>
                          <dd className="mt-1 text-[var(--text-secondary)]">
                            {detailUser.phone ?? '—'}
                            {detailUser.phoneVerified ? (
                              <span className="ml-2 text-xs text-emerald-400">(verificat)</span>
                            ) : null}
                          </dd>
                        </div>
                        <div className="rounded-xl border border-white/[0.06] bg-[var(--bg-primary)]/40 p-4">
                          <dt className={labelClass}>Cont</dt>
                          <dd className="mt-1 text-[var(--text-secondary)]">
                            {detailUser.accountType} <span className="text-[var(--text-muted)]">·</span> încredere{' '}
                            {detailUser.trustScore}
                          </dd>
                        </div>
                        <div className="rounded-xl border border-white/[0.06] bg-[var(--bg-primary)]/40 p-4">
                          <dt className={labelClass}>Verificări</dt>
                          <dd className="mt-1 text-[var(--text-secondary)]">
                            email {detailUser.emailVerified ? 'da' : 'nu'} · telefon{' '}
                            {detailUser.phoneVerified ? 'da' : 'nu'}
                          </dd>
                        </div>
                        <div className="rounded-xl border border-white/[0.06] bg-[var(--bg-primary)]/40 p-4">
                          <dt className={labelClass}>Raportări</dt>
                          <dd className="mt-1 tabular-nums text-[var(--text-secondary)]">
                            {detailUser.reportsCount}
                          </dd>
                        </div>
                        <div className="rounded-xl border border-white/[0.06] bg-[var(--bg-primary)]/40 p-4">
                          <dt className={labelClass}>Înregistrat</dt>
                          <dd className="mt-1 text-[var(--text-secondary)]">{fmt(detailUser.createdAt)}</dd>
                        </div>
                        <div className="rounded-xl border border-white/[0.06] bg-[var(--bg-primary)]/40 p-4">
                          <dt className={labelClass}>Ultima autentificare</dt>
                          <dd className="mt-1 text-[var(--text-secondary)]">{fmt(detailUser.lastLoginAt)}</dd>
                        </div>
                        <div className="rounded-xl border border-white/[0.06] bg-[var(--bg-primary)]/40 p-4">
                          <dt className={labelClass}>Ultima activitate</dt>
                          <dd className="mt-1 text-[var(--text-secondary)]">{fmt(detailUser.lastActiveAt)}</dd>
                        </div>
                        <div className="rounded-xl border border-white/[0.06] bg-[var(--bg-primary)]/40 p-4">
                          <dt className={labelClass}>IP la login</dt>
                          <dd className="mt-1 font-mono text-xs text-[var(--text-secondary)]">
                            {detailUser.lastLoginIp ?? '—'}
                          </dd>
                        </div>
                        <div className="rounded-xl border border-white/[0.06] bg-[var(--bg-primary)]/40 p-4 sm:col-span-2 xl:col-span-3">
                          <dt className={labelClass}>Beneficii</dt>
                          <dd className="mt-1 text-[var(--text-secondary)]">
                            {detailUser.credits} credite · {detailUser.discount}% discount ·{' '}
                            {detailUser.freePromotions} promoții gratuite
                          </dd>
                        </div>
                        {(detailUser.moderationSuspensionReason || detailUser.moderationSuspendedUntil) && (
                          <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 sm:col-span-2 xl:col-span-3">
                            <dt className={labelClass}>Suspendare moderare</dt>
                            <dd className="mt-1 text-sm text-amber-100/90">
                              {detailUser.moderationSuspensionReason ? (
                                <span className="block">{detailUser.moderationSuspensionReason}</span>
                              ) : null}
                              {detailUser.moderationSuspendedUntil ? (
                                <span className="mt-1 block font-mono text-xs text-amber-200/80">
                                  până la {fmt(detailUser.moderationSuspendedUntil)}
                                </span>
                              ) : null}
                            </dd>
                          </div>
                        )}
                      </dl>
                      <div className="border-t border-white/[0.06] pt-2">
                        <h4 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
                          Anunțuri utilizator
                          {userListingsLoading ? (
                            <span className="ml-2 font-normal text-[var(--text-muted)]">(se încarcă…)</span>
                          ) : (
                            <span className="ml-2 font-normal text-[var(--text-muted)]">
                              ({userListings.length})
                            </span>
                          )}
                        </h4>
                        {userListingsLoading ? (
                          <div className="py-8 text-center">
                            <div
                              className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-[var(--accent-primary)]"
                              aria-hidden
                            />
                            <p className="text-sm text-[var(--text-tertiary)]">Se încarcă anunțurile…</p>
                          </div>
                        ) : userListings.length === 0 ? (
                          <p className="py-4 text-center text-[var(--text-tertiary)]">Niciun anunț</p>
                        ) : (
                          <div className="space-y-3">
                            {userListings.map((listing) => {
                              const st = (listing.listingStatus || listing.status || '').toString();
                              const btn =
                                'rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs font-medium transition-colors';
                              return (
                                <div
                                  key={listing.id}
                                  className="rounded-xl border border-white/[0.08] bg-[var(--bg-elevated)]/60 p-4 transition-colors hover:border-white/[0.12]"
                                >
                                  <div className="flex flex-col gap-3">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                      <div className="min-w-0 flex-1">
                                        <h5 className="break-words text-sm font-semibold text-[var(--text-primary)]">
                                          {listing.title}
                                        </h5>
                                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                                          <span className="text-[var(--text-tertiary)]">{listing.category}</span>
                                          {listing.price != null && (
                                            <span className="font-medium text-emerald-300/90">
                                              {listing.price.toLocaleString('ro-RO')} RON
                                            </span>
                                          )}
                                          <span className="text-[var(--text-muted)]">
                                            {listing.views ?? 0} vizualizări
                                          </span>
                                          {listing.isFeatured ? (
                                            <span className="font-medium text-amber-300/90">Evidențiat</span>
                                          ) : null}
                                          <span
                                            className={`rounded px-2 py-1 ${
                                              listing.status === 'pending'
                                                ? 'bg-yellow-500/15 text-yellow-300'
                                                : listing.status === 'approved' || listing.status === 'active'
                                                  ? 'bg-emerald-500/15 text-emerald-300'
                                                  : listing.status === 'paused' || listing.status === 'draft'
                                                    ? 'bg-white/[0.06] text-[var(--text-tertiary)]'
                                                    : 'bg-red-500/15 text-red-300'
                                            }`}
                                          >
                                            {listing.status}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="flex flex-wrap justify-end gap-2">
                                        <a
                                          href={`/listings/${listing.id}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className={`${btn} border-cyan-500/25 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/18`}
                                        >
                                          Vezi
                                        </a>
                                        <a
                                          href={`/listings/${listing.id}/edit`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className={`${btn} border-indigo-500/25 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/18`}
                                        >
                                          Editează
                                        </a>
                                        {listing.queueId ? (
                                          <>
                                            {listing.status !== 'approved' && (
                                              <button
                                                type="button"
                                                onClick={() => approveListing(listing.id)}
                                                className={`${btn} border-emerald-500/35 bg-emerald-500/12 text-emerald-200 hover:bg-emerald-500/22`}
                                              >
                                                Aprobă
                                              </button>
                                            )}
                                            {listing.status !== 'rejected' && (
                                              <button
                                                type="button"
                                                onClick={() => rejectListing(listing.id)}
                                                className={`${btn} border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/18`}
                                              >
                                                Respinge
                                              </button>
                                            )}
                                          </>
                                        ) : (
                                          <>
                                            {st === 'active' && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const notes = prompt('Motiv suspendare (vizibil utilizatorului):');
                                                  if (notes === null) return;
                                                  runListingModeration(listing.id, {
                                                    status: 'paused',
                                                    moderationNotes: notes || undefined,
                                                  });
                                                }}
                                                className={`${btn} border-amber-500/35 bg-amber-500/12 text-amber-200 hover:bg-amber-500/22`}
                                              >
                                                Suspendă
                                              </button>
                                            )}
                                            {(st === 'active' || st === 'paused') && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const notes = prompt('Motiv ascundere (vizibil utilizatorului):');
                                                  if (notes === null) return;
                                                  runListingModeration(listing.id, {
                                                    status: 'hidden',
                                                    moderationNotes: notes || undefined,
                                                  });
                                                }}
                                                className={`${btn} border-white/[0.1] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-white/[0.06]`}
                                              >
                                                Ascunde
                                              </button>
                                            )}
                                            {(st === 'paused' || st === 'hidden') && (
                                              <button
                                                type="button"
                                                onClick={() => runListingModeration(listing.id, { status: 'active' })}
                                                className={`${btn} border-emerald-500/35 bg-emerald-500/12 text-emerald-200 hover:bg-emerald-500/22`}
                                              >
                                                Reactivează
                                              </button>
                                            )}
                                            {(st === 'active' || st === 'paused') && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const notes = prompt('Motiv respingere (opțional):');
                                                  if (notes === null) return;
                                                  runListingModeration(listing.id, {
                                                    status: 'rejected',
                                                    moderationNotes: notes || undefined,
                                                  });
                                                }}
                                                className={`${btn} border-rose-500/35 bg-rose-500/12 text-rose-200 hover:bg-rose-500/22`}
                                              >
                                                Respinge
                                              </button>
                                            )}
                                            <button
                                              type="button"
                                              onClick={() =>
                                                runListingModeration(listing.id, { isFeatured: !listing.isFeatured })
                                              }
                                              className={`${btn} border-violet-500/35 bg-violet-500/12 text-violet-200 hover:bg-violet-500/22`}
                                            >
                                              {listing.isFeatured ? 'Fără evidențiere' : 'Evidențiază'}
                                            </button>
                                          </>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => deleteListing(listing.id)}
                                          className={`${btn} border-red-800/45 bg-red-950/35 text-red-300 hover:bg-red-950/50`}
                                        >
                                          Șterge
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
            </div>
          )}
        </div>

        {/* Credits Modal */}
        {showCreditsModal && selectedUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/[0.1] bg-[var(--bg-elevated)] shadow-[var(--shadow-xl)]">
              <button
                type="button"
                onClick={() => setShowCreditsModal(false)}
                className="absolute top-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-[var(--bg-primary)] text-[var(--text-tertiary)] transition hover:border-red-500/30 hover:text-red-300"
                aria-label="Închide"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="border-b border-white/[0.08] px-6 py-6 sm:px-8">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Beneficii utilizator</h2>
                <p className="mt-1 text-sm text-[var(--text-tertiary)]">{selectedUser.email}</p>
              </div>

              <div className="space-y-5 p-6 sm:p-8">
                <div className="rounded-2xl border border-white/[0.08] bg-[var(--bg-primary)]/50 p-5">
                  <label className="mb-2 block text-xs font-medium text-[var(--text-tertiary)]">Credite (RON)</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      value={creditsForm.credits}
                      onChange={(e) => setCreditsForm({ ...creditsForm, credits: e.target.value })}
                      placeholder="0"
                      className="enterprise-input flex-1 rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)]"
                    />
                  </div>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">Folosite la promovări plătite.</p>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-[var(--bg-primary)]/50 p-5">
                  <label className="mb-2 block text-xs font-medium text-[var(--text-tertiary)]">Discount global (%)</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={creditsForm.discount}
                      onChange={(e) => setCreditsForm({ ...creditsForm, discount: e.target.value })}
                      placeholder="0"
                      className="enterprise-input flex-1 rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)]"
                    />
                  </div>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">{creditsForm.discount || 0}% reducere la promovări</p>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-[var(--bg-primary)]/50 p-5">
                  <label className="mb-3 block text-xs font-medium text-[var(--text-tertiary)]">Promovări gratuite</label>

                  <div className="mb-4 space-y-3">
                    <div>
                      <label className="mb-1.5 block text-xs text-[var(--text-muted)]">Tip</label>
                      <select
                        value={creditsForm.promotionType}
                        onChange={(e) => setCreditsForm({ ...creditsForm, promotionType: e.target.value as PromotionType })}
                        className="enterprise-input w-full rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)]"
                      >
                        <option value="top">TOP</option>
                        <option value="urgent">URGENT</option>
                        <option value="featured">Evidențiat</option>
                        <option value="refresh">Reîmprospătare</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs text-[var(--text-muted)]">Număr</label>
                      <input
                        type="number"
                        min="0"
                        value={creditsForm.freePromotions}
                        onChange={(e) => setCreditsForm({ ...creditsForm, freePromotions: e.target.value })}
                        placeholder="0"
                        className="enterprise-input w-full rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)]"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs text-[var(--text-muted)]">Expirare (zile)</label>
                      <input
                        type="number"
                        min="1"
                        value={creditsForm.expiryDays}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setCreditsForm({ ...creditsForm, expiryDays: Number.isNaN(val) ? 30 : val });
                        }}
                        placeholder="30"
                        className="enterprise-input w-full rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)]"
                      />
                    </div>
                  </div>

                  <p className="text-xs text-[var(--text-muted)]">
                    {creditsForm.freePromotions || 0} × {creditsForm.promotionType} · {creditsForm.expiryDays} zile
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-[var(--bg-primary)]/40 p-5">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Rezumat</p>
                  <div className="space-y-1.5 text-sm text-[var(--text-tertiary)]">
                    <p>
                      Credite: <span className="font-medium text-[var(--text-primary)]">{creditsForm.credits} RON</span>
                    </p>
                    <p>
                      Discount: <span className="font-medium text-[var(--text-primary)]">{creditsForm.discount}%</span>
                    </p>
                    <p>
                      Promoții:{' '}
                      <span className="font-medium text-[var(--text-primary)]">
                        {creditsForm.freePromotions} × {creditsForm.promotionType}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreditsModal(false)}
                    className="flex-1 rounded-xl border border-white/[0.1] bg-[var(--bg-secondary)] py-3 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-white/[0.05]"
                  >
                    Anulează
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCredits}
                    disabled={isSavingBenefits}
                    className="flex-1 rounded-xl bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-dark)] py-3 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSavingBenefits ? 'Se salvează…' : 'Salvează'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

export default function AdminModerationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
          <div className="text-center">
            <div
              className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-white/15 border-t-[var(--accent-primary)]"
              aria-hidden
            />
            <p className="text-sm text-[var(--text-tertiary)]">Se încarcă moderarea…</p>
          </div>
        </div>
      }
    >
      <AdminModerationPageInner />
    </Suspense>
  );
}
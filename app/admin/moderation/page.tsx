'use client';
import { useState, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';
import { memoryStorage } from '@/lib/memory-storage';
import { useAdminAuth } from '@/lib/hooks/useAdminAuth';
import { getCsrfToken } from '@/lib/security/csrf-client';

type UserRole = 'admin' | 'user';
type UserStatus = 'active' | 'banned';
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

type ModerationUser = {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  listings: number;
  credits: number;
  freePromotions: number;
  discount: number;
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
  status?: string;
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

export default function AdminModerationPage() {
  const router = useRouter();
  const { isAuthorized, isLoading } = useAdminAuth();
  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  
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

  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ModerationUser | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [userListings, setUserListings] = useState<ModerationListing[]>([]);
  const [userListingsLoading, setUserListingsLoading] = useState(false);
  const [creditsForm, setCreditsForm] = useState({
    credits: '',
    discount: '',
    freePromotions: '',
    promotionType: 'top' as PromotionType,
    expiryDays: 30
  });

  const stats = {
    totalListings: 0,
    pendingReview: 0,
    approvedToday: 0,
    rejectedToday: 0,
    totalUsers: users.length,
    bannedUsers: users.filter(u => u.status === 'banned').length,
    reportedListings: 0
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
  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      setUsersError('');
      const token = localStorage.getItem('accessToken');
      console.log('[DEBUG] fetchUsers - token exists:', !!token, 'length:', token?.length);
      console.log('[DEBUG] fetchUsers - token preview:', token?.substring(0, 20) + '...');
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch('/api/admin/users', {
        credentials: 'include',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      console.log('[DEBUG] fetchUsers - response status:', response.status);
      if (!response.ok) {
        const errorData = await response.text();
        console.log('[DEBUG] fetchUsers - error response:', errorData);
        
        // Show specific error messages
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
      
      if (data.success && data.users) {
        const mappedUsers = data.users.map((user: any) => ({
          id: user.id,
          email: user.email,
          role: user.role as UserRole,
          status: user.isBanned ? 'banned' : 'active' as UserStatus,
          listings: 0, // Temporarily set to 0 since _count is removed
          credits: user.creditsBalance || 0,
          freePromotions: user.freeBoostsRemaining || 0,
          discount: user.promotionDiscountPercent || 0,
        }));
        setUsers(mappedUsers);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        setUsersError('Request timeout - please try again');
      } else {
        setUsersError('Failed to load users');
      }
    } finally {
      setUsersLoading(false);
    }
  };

  // Fetch listings for a specific user
  const fetchUserListings = async (userId: string) => {
    try {
      console.log('[FETCH] Started for userId:', userId);
      setUserListingsLoading(true);
      
      const token = localStorage.getItem('accessToken');
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`/api/admin/users/${userId}/listings`, {
        credentials: 'include',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
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
      
      if (data.success && data.listings) {
        const transformedListings = data.listings
          .filter((listing: any) => listing.ownerUserId === userId)
          .map((listing: any) => ({
          id: listing.id,
          title: listing.title,
          category: listing.category,
          subcategory: listing.subcategory,
          price: listing.price,
          priceCurrency: listing.priceCurrency,
          status: listing.queueStatus || listing.status,
          photos: listing.photos ? 1 : 0,
          owner: listing.owner,
          ownerUserId: listing.ownerUserId,
          submittedAt: listing.createdAt ? new Date(listing.createdAt).toLocaleDateString('ro-RO') : '—',
          notes: listing.notes,
          queueId: listing.queueId,
          moderator: listing.moderator,
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
  const fetchListings = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const headers = {
        'Authorization': `Bearer ${token}`,
      };

      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const [pendingResponse, approvedResponse, rejectedResponse] = await Promise.all([
        fetch('/api/admin/moderation/queue?status=pending', { headers, credentials: 'include', signal: controller.signal }),
        fetch('/api/admin/moderation/queue?status=approved', { headers, credentials: 'include', signal: controller.signal }),
        fetch('/api/admin/moderation/queue?status=rejected', { headers, credentials: 'include', signal: controller.signal }),
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
    } catch (error) {
      console.error('Error fetching listings:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Request timeout for listings');
      }
      // Fallback: still allow viewing even if queue is empty
      setPendingListings([]);
      setApprovedListings([]);
      setRejectedListings([]);
    }
  };

  // Fetch users on mount and when authorized
  useEffect(() => {
    if (!isLoading && isAuthorized) {
      fetchUsers();
      fetchListings();
      fetchReports();
      fetchAppeals();
    }
  }, [isAuthorized, isLoading]);

  const renderGroupedListings = (
    listings: ModerationListing[],
    emptyMessage: string,
    actionsRenderer: (listing: ModerationListing) => ReactNode
  ) => {
    if (listings.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎉</div>
          <p className="text-gray-400 text-lg">{emptyMessage}</p>
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
              className="bg-gradient-to-br from-gray-800/70 to-gray-900/70 backdrop-blur-xl rounded-2xl p-5 border border-gray-700/60"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-black text-white">📁 {category}</h3>
                <span className="text-xs bg-gray-700/60 px-3 py-1 rounded-full text-gray-200">
                  {categoryCount} anunturi
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
                      className="bg-gradient-to-br from-gray-900/70 to-black/50 rounded-xl p-4 border border-gray-700/60"
                    >
                      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                        <div>
                          <div className="text-lg font-black text-white">
                            👤 {owner?.email || 'Utilizator necunoscut'}
                          </div>
                          <div className="text-sm text-gray-400">
                            ID: {ownerId}
                          </div>
                        </div>
                        <span className="text-xs bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full font-bold">
                          {group.listings.length} anunturi
                        </span>
                      </div>

                      <details className="mb-4">
                        <summary className="cursor-pointer text-sm text-gray-300 font-bold">
                          Detalii utilizator
                        </summary>
                        <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {ownerFields.length === 0 ? (
                            <div className="text-gray-500 text-sm">Detalii indisponibile</div>
                          ) : (
                            ownerFields.map((field) => (
                              <div
                                key={field.key}
                                className="bg-gray-900/60 border border-gray-700/40 rounded-lg px-3 py-2 text-xs"
                              >
                                <div className="text-gray-500">{field.key}</div>
                                <div className="text-gray-200 break-words">{field.value}</div>
                              </div>
                            ))
                          )}
                        </div>
                      </details>

                      <div className="space-y-3">
                        {group.listings.map((listing) => (
                          <div
                            key={listing.id}
                            className={`bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-xl p-4 border ${
                              listing.flagged ? 'border-red-500/50' : 'border-gray-700/50'
                            }`}
                          >
                            {listing.flagged && (
                              <div className="mb-3 p-2 bg-red-500/20 border border-red-500/50 rounded-lg text-sm">
                                <span className="text-red-400 font-bold">🚨 Semnalat: {listing.flagReason}</span>
                              </div>
                            )}

                            <div className="grid md:grid-cols-5 gap-4 items-start">
                              <div className="md:col-span-3">
                                <h3 className="text-lg font-black text-white mb-2">{listing.title}</h3>
                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                  <span className="text-xl font-black bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] bg-clip-text text-transparent">
                                    {listing.price != null
                                      ? `${listing.price.toLocaleString()} ${listing.priceCurrency}`
                                      : '—'}
                                  </span>
                                  <span className="text-xs bg-gray-700/50 px-2 py-1 rounded text-gray-300">📸 {listing.photos}</span>
                                  {listing.subcategory ? (
                                    <span className="text-xs bg-gray-700/50 px-2 py-1 rounded text-gray-300">{listing.subcategory}</span>
                                  ) : null}
                                </div>
                                <div className="text-sm text-gray-400">
                                  <p>👤 {listing.owner}</p>
                                  <p>🕒 {listing.submittedAt}</p>
                                  {listing.approvedAt ? <p>✅ {listing.approvedAt}</p> : null}
                                  {listing.rejectedAt ? <p>❌ {listing.rejectedAt}</p> : null}
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

  const approveListing = (id: string) => {
    const listing = pendingListings.find(l => l.id === id);
    if (listing) {
      setPendingListings(pendingListings.filter(l => l.id !== id));
      setApprovedListings([...approvedListings, { 
        ...listing, 
        status: 'approved', 
        approvedAt: new Date().toISOString(),
        views: 0,
        favorites: 0
      }]);
      
      // Update în memory storage
      const listingData = memoryStorage.get(id);
      if (listingData) {
        memoryStorage.set(id, { ...listingData, status: 'active', moderationStatus: 'approved' });
      }
    }
  };

  const rejectListing = (id: string) => {
    const reason = prompt('Motivul respingerii:');
    if (!reason) return;
    
    const listing = pendingListings.find(l => l.id === id);
    if (listing) {
      setPendingListings(pendingListings.filter(l => l.id !== id));
      setRejectedListings([...rejectedListings, { 
        ...listing, 
        status: 'rejected', 
        rejectedAt: new Date().toISOString(),
        reason 
      }]);
      
      // Update în memory storage
      const listingData = memoryStorage.get(id);
      if (listingData) {
        memoryStorage.set(id, { ...listingData, status: 'rejected', moderationStatus: 'rejected', rejectionReason: reason });
      }
    }
  };

  const deleteListing = (id: string) => {
    if (!confirm('Ștergi definitiv acest anunț?')) return;
    
    setApprovedListings(approvedListings.filter(l => l.id !== id));
    memoryStorage.delete(id);
  };

  const banUser = async (userId: string) => {
    const reason = prompt('Motivul blocării (opcional):');
    if (reason === null) return; // User cancelled
    
    if (!confirm('Blochezi acest utilizator?')) return;
    
    try {
      const csrfToken = await getCsrfToken();
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          reason: reason || 'Admin action',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to ban user');
      }

      setUsers(users.map(u => 
        u.id === userId ? { ...u, status: 'banned' } : u
      ));
      
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
      const csrfToken = await getCsrfToken();
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`/api/admin/users/${userId}/unban`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to unban user');
      }

      setUsers(users.map(u => 
        u.id === userId ? { ...u, status: 'active' } : u
      ));
      
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
      const csrfToken = await getCsrfToken();
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          role: 'admin',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to promote user');
      }

      setUsers(users.map(u => 
        u.id === userId ? { ...u, role: 'admin' } : u
      ));
      
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
    if (!selectedUser) return;

    const credits = creditsForm.credits ? parseInt(creditsForm.credits) : 0;
    const discount = creditsForm.discount ? parseInt(creditsForm.discount) : 0;
    const freePromotions = creditsForm.freePromotions ? parseInt(creditsForm.freePromotions) : 0;

    try {
      const csrfToken = await getCsrfToken();
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`/api/admin/users/${selectedUser.id}/benefits`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          creditsBonus: credits,
          globalDiscount: discount,
          freePromotions: freePromotions,
          promotionType: creditsForm.promotionType,
          expiryDays: creditsForm.expiryDays,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save benefits');
      }

      const result = await response.json();

      setUsers(users.map(u => 
        u.id === selectedUser.id 
          ? { 
              ...u, 
              credits,
              discount,
              freePromotions
            } 
          : u
      ));

      setNotificationMessage(`✅ Beneficii actualizate pentru ${selectedUser.email}`);
      setShowNotification(true);
      setShowCreditsModal(false);

      setTimeout(() => {
        setShowNotification(false);
      }, 3000);
    } catch (error: any) {
      console.error('Error saving benefits:', error);
      setNotificationMessage(`❌ ${error.message || 'Eroare la salvarea beneficiilor'}`);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#6D5BFF] to-[#00D4FF] rounded-full mb-4 animate-spin">
            <div className="w-14 h-14 bg-gray-900 rounded-full"></div>
          </div>
          <p className="text-gray-400 text-lg">Verificare acces admin...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="bg-red-900/30 border border-red-500/50 rounded-2xl p-8 text-center">
          <p className="text-red-400 text-xl font-bold">🔒 Acces respins</p>
          <p className="text-gray-400 mt-2">Nu ai permisiunea să accesezi această pagină.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      
      {/* Notificare modernă */}
      {showNotification && (
        <div className="fixed top-20 right-4 z-50 animate-slideDown">
          <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-green-500 rounded-2xl px-6 py-4 shadow-2xl shadow-green-500/50 border border-green-400/50 backdrop-blur-xl flex items-center gap-3 max-w-md">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold">{notificationMessage}</p>
            </div>
          </div>
        </div>
      )}
      
      <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-5xl font-black mb-4 bg-gradient-to-r from-[#6D5BFF] via-[#00D4FF] to-[#4E3CFF] bg-clip-text text-transparent">
                🛡️ Admin - Moderare
              </h1>
              <p className="text-gray-400 text-lg">Control complet asupra anunțurilor și utilizatorilor</p>
            </div>
            <Link
              href="/admin/dashboard"
              className="px-4 py-2 bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] hover:from-[#4E3CFF] hover:to-[#6D5BFF] text-white rounded-lg transition-all shadow-lg hover:shadow-[#6D5BFF]/50 font-semibold whitespace-nowrap"
            >
              ← Înapoi la Dashboard
            </Link>
          </div>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-yellow-500/20 to-orange-600/20 backdrop-blur-xl rounded-2xl p-6 border border-yellow-500/30">
              <div className="text-3xl mb-2">⏳</div>
              <div className="text-3xl font-black text-white">{stats.pendingReview}</div>
              <div className="text-yellow-400 text-sm">În Așteptare</div>
            </div>
            
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 backdrop-blur-xl rounded-2xl p-6 border border-green-500/30">
              <div className="text-3xl mb-2">✅</div>
              <div className="text-3xl font-black text-white">{stats.approvedToday}</div>
              <div className="text-green-400 text-sm">Aprobate Azi</div>
            </div>
            
            <div className="bg-gradient-to-br from-red-500/20 to-pink-600/20 backdrop-blur-xl rounded-2xl p-6 border border-red-500/30">
              <div className="text-3xl mb-2">❌</div>
              <div className="text-3xl font-black text-white">{stats.rejectedToday}</div>
              <div className="text-red-400 text-sm">Respinse Azi</div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-500/20 to-cyan-600/20 backdrop-blur-xl rounded-2xl p-6 border border-blue-500/30">
              <div className="text-3xl mb-2">👥</div>
              <div className="text-3xl font-black text-white">{stats.totalUsers}</div>
              <div className="text-blue-400 text-sm">Utilizatori Activi</div>
            </div>
          </div>

          {/* Search */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="🔍 Caută anunț sau utilizator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-6 py-4 text-white placeholder-gray-500 focus:ring-2 focus:ring-[#6D5BFF] focus:border-transparent"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1 text-sm">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-all ${
                activeTab === 'pending'
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
              }`}
            >
              ⏳ În Așteptare ({pendingListings.length})
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-all ${
                activeTab === 'approved'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
              }`}
            >
              ✅ Aprobate ({approvedListings.length})
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-all ${
                activeTab === 'rejected'
                  ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
              }`}
            >
              ❌ Respinse ({rejectedListings.length})
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-all ${
                activeTab === 'users'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
              }`}
            >
              👥 Utilizatori ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-all ${
                activeTab === 'reports'
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
              }`}
            >
              🚨 Raportări ({reports.length})
            </button>
            <button
              onClick={() => setActiveTab('appeals')}
              className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-all ${
                activeTab === 'appeals'
                  ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
              }`}
            >
              ⚖️ Apeluri ({appeals.length})
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-all ${
                activeTab === 'invoices'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
              }`}
            >
              💰 Facturi
            </button>
          </div>

          {/* Reports Management */}
          {activeTab === 'reports' && (
            <div className="space-y-4">
              {reportsLoading ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-full mb-4 animate-spin">
                    <div className="w-14 h-14 bg-gray-900 rounded-full"></div>
                  </div>
                  <p className="text-gray-400 text-lg">Se încarcă raportările...</p>
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🎉</div>
                  <p className="text-gray-400 text-lg">Nu sunt raportări pendinente</p>
                </div>
              ) : (
                reports.map(report => (
                  <div key={report.id} className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-2xl p-6 border border-red-500/30">
                    <div className="grid md:grid-cols-3 gap-6">
                      <div>
                        <h3 className="text-xl font-black text-white mb-3">🚨 Raportare #{report.id.substring(0, 8)}</h3>
                        <div className="space-y-2 text-sm">
                          <div><span className="text-gray-400">Raportator:</span><p className="text-white font-bold">{report.reporter?.email || 'N/A'}</p></div>
                          <div><span className="text-gray-400">Motiv:</span><p className="text-white font-bold">{report.reason}</p></div>
                          {report.description && <div><span className="text-gray-400">Descriere:</span><p className="text-gray-300">{report.description}</p></div>}
                          <div><span className="text-gray-400">Data:</span><p className="text-white">{new Date(report.createdAt).toLocaleDateString('ro-RO')}</p></div>
                        </div>
                      </div>
                      <div className="bg-blue-900/20 rounded-xl p-4 border border-blue-500/30">
                        <h4 className="text-white font-black mb-3">📋 Anunț</h4>
                        <div className="space-y-2 text-sm">
                          <p><span className="text-gray-400">Titlu:</span><br/><span className="text-white font-bold">{report.listing?.title || 'N/A'}</span></p>
                          <button onClick={() => router.push(`/listings/${report.listingId}`)} className="w-full mt-3 px-4 py-2 bg-blue-500/30 text-blue-400 rounded-lg font-bold hover:bg-blue-500/50 text-xs">👁️ Vezi</button>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button onClick={() => {if(confirm('Rezolvă raportarea?')) resolveReport(report.id, 'Approved by admin');}} className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg font-bold hover:bg-green-500/30 text-sm">✅ Rezolvă</button>
                        <button onClick={() => {if(confirm('Respinge?')) dismissReport(report.id);}} className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg font-bold hover:bg-gray-600 text-sm">❌ Respinge</button>
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
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-500 rounded-full mb-4 animate-spin">
                    <div className="w-14 h-14 bg-gray-900 rounded-full"></div>
                  </div>
                  <p className="text-gray-400 text-lg">Se încarcă apelurile...</p>
                </div>
              ) : appeals.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">⚖️</div>
                  <p className="text-gray-400 text-lg">Nu sunt apeluri pendinente</p>
                </div>
              ) : (
                appeals.map(appeal => (
                  <div key={appeal.id} className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30">
                    <div className="grid md:grid-cols-3 gap-6">
                      <div>
                        <h3 className="text-xl font-black text-white mb-3">⚖️ Apel #{appeal.id.substring(0, 8)}</h3>
                        <div className="space-y-2 text-sm">
                          <div><span className="text-gray-400">Utilizator:</span><p className="text-white font-bold">{appeal.user?.email || 'N/A'}</p></div>
                          <div><span className="text-gray-400">Motiv:</span><p className="text-gray-300">{appeal.reason}</p></div>
                          <div><span className="text-gray-400">Data:</span><p className="text-white">{new Date(appeal.createdAt).toLocaleDateString('ro-RO')}</p></div>
                        </div>
                      </div>
                      <div className="bg-purple-900/20 rounded-xl p-4 border border-purple-500/30">
                        <h4 className="text-white font-black mb-3">📝 Detalii</h4>
                        <p className="text-gray-300 text-xs">Status: <span className="text-yellow-400 font-bold">Așteptare</span></p>
                        <p className="text-gray-400 text-xs mt-2">Utilizatorul contestă o acțiune.</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button onClick={() => {if(confirm('Aprobă apelul?')) approveAppeal(appeal.id);}} className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg font-bold hover:bg-green-500/30 text-sm">✅ Aprobă</button>
                        <button onClick={() => {if(confirm('Respinge?')) rejectAppeal(appeal.id);}} className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg font-bold hover:bg-red-500/30 text-sm">❌ Respinge</button>
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
              <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30">
                <h2 className="text-2xl font-black text-white mb-2">💰 Facturi & Contabilitate</h2>
                <p className="text-gray-400 mb-6">
                  Gestionează facturile emise, exportă CSV pentru contabilitate și trimite la ANAF.
                </p>

                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-purple-900/20 border border-purple-700/40 rounded-xl p-4">
                    <div className="text-sm text-purple-300">Acces rapid</div>
                    <div className="text-white font-semibold">Listă facturi</div>
                  </div>
                  <div className="bg-blue-900/20 border border-blue-700/40 rounded-xl p-4">
                    <div className="text-sm text-blue-300">Export</div>
                    <div className="text-white font-semibold">CSV contabilitate</div>
                  </div>
                  <div className="bg-green-900/20 border border-green-700/40 rounded-xl p-4">
                    <div className="text-sm text-green-300">ANAF</div>
                    <div className="text-white font-semibold">Trimitere SPV</div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => router.push('/admin/invoices')}
                    className="px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 transition"
                  >
                    📋 Deschide Facturi
                  </button>
                  <button
                    onClick={() => router.push('/admin/invoices?tab=export')}
                    className="px-6 py-3 rounded-xl font-bold bg-gray-800/70 text-gray-200 hover:bg-gray-700/70 transition"
                  >
                    📊 Export Contabilitate
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Pending Listings */}
          {activeTab === 'pending' && (
            renderGroupedListings(
              pendingListings,
              'Nu sunt anunturi in asteptare',
              (listing) => (
                <>
                  <button
                    onClick={() => router.push(`/listings/${listing.id}`)}
                    className="w-full px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg font-bold hover:bg-blue-500/30 transition-all text-sm"
                  >
                    👁️ Vezi
                  </button>
                  <button
                    onClick={() => approveListing(listing.id)}
                    className="w-full px-3 py-2 bg-green-500/20 text-green-400 rounded-lg font-bold hover:bg-green-500/30 transition-all text-sm"
                  >
                    ✅ Aprobă
                  </button>
                  <button
                    onClick={() => rejectListing(listing.id)}
                    className="w-full px-3 py-2 bg-red-500/20 text-red-400 rounded-lg font-bold hover:bg-red-500/30 transition-all text-sm"
                  >
                    ❌ Respinge
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Ești sigur că vrei să suspezi acest anunț?')) {
                        setApprovedListings(approvedListings.filter(l => l.id !== listing.id));
                        setPendingListings(pendingListings.filter(l => l.id !== listing.id));
                        setNotificationMessage('⏸️ Anunț suspendat');
                        setShowNotification(true);
                        setTimeout(() => setShowNotification(false), 3000);
                      }
                    }}
                    className="w-full px-3 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg font-bold hover:bg-yellow-500/30 transition-all text-sm"
                  >
                    ⏸️ Suspendă
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Ești sigur că vrei să ștergi PERMANENT acest anunț?')) {
                        setPendingListings(pendingListings.filter(l => l.id !== listing.id));
                        setNotificationMessage('🗑️ Anunț șters permanent');
                        setShowNotification(true);
                        setTimeout(() => setShowNotification(false), 3000);
                      }
                    }}
                    className="w-full px-3 py-2 bg-red-900/40 text-red-300 rounded-lg font-bold hover:bg-red-900/60 transition-all text-sm border border-red-700/50"
                  >
                    🗑️ Șterge Permanent
                  </button>
                </>
              )
            )
          )}

          {/* Approved Listings */}
          {activeTab === 'approved' && (
            renderGroupedListings(
              approvedListings,
              'Nu sunt anunturi aprobate',
              (listing) => (
                <>
                  <button
                    onClick={() => router.push(`/listings/${listing.id}`)}
                    className="w-full px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg font-bold hover:bg-blue-500/30 transition-all text-sm"
                  >
                    👁️ Vezi
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Ești sigur că vrei să suspezi acest anunț?')) {
                        setApprovedListings(approvedListings.filter(l => l.id !== listing.id));
                        setNotificationMessage('⏸️ Anunț suspendat');
                        setShowNotification(true);
                        setTimeout(() => setShowNotification(false), 3000);
                      }
                    }}
                    className="w-full px-3 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg font-bold hover:bg-yellow-500/30 transition-all text-sm"
                  >
                    ⏸️ Suspendă
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Ești sigur că vrei să ștergi PERMANENT acest anunț?')) {
                        setApprovedListings(approvedListings.filter(l => l.id !== listing.id));
                        setNotificationMessage('🗑️ Anunț șters permanent');
                        setShowNotification(true);
                        setTimeout(() => setShowNotification(false), 3000);
                      }
                    }}
                    className="w-full px-3 py-2 bg-red-900/40 text-red-300 rounded-lg font-bold hover:bg-red-900/60 transition-all text-sm border border-red-700/50"
                  >
                    🗑️ Șterge
                  </button>
                </>
              )
            )
          )}

          {/* Rejected Listings */}
          {activeTab === 'rejected' && (
            renderGroupedListings(
              rejectedListings,
              'Nu sunt anunturi respinse',
              (listing) => (
                <>
                  <button
                    onClick={() => {
                      if (confirm('Ești sigur că vrei să ștergi PERMANENT acest anunț?')) {
                        setRejectedListings(rejectedListings.filter(l => l.id !== listing.id));
                        setNotificationMessage('🗑️ Anunț șters permanent');
                        setShowNotification(true);
                        setTimeout(() => setShowNotification(false), 3000);
                      }
                    }}
                    className="w-full px-3 py-2 bg-red-900/40 text-red-300 rounded-lg font-bold hover:bg-red-900/60 transition-all text-sm border border-red-700/50"
                  >
                    🗑️ Șterge Permanent
                  </button>
                </>
              )
            )
          )}

          {/* Users Management */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              {usersLoading ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#6D5BFF] to-[#00D4FF] rounded-full mb-4 animate-spin">
                    <div className="w-14 h-14 bg-gray-900 rounded-full"></div>
                  </div>
                  <p className="text-gray-400 text-lg">Se încarcă utilizatorii...</p>
                </div>
              ) : usersError ? (
                <div className="text-center py-12">
                  <p className="text-red-400 text-lg">❌ {usersError}</p>
                  <button
                    onClick={fetchUsers}
                    className="mt-4 px-6 py-2 bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] text-white rounded-lg font-bold hover:opacity-90"
                  >
                    🔄 Încearcă Din Nou
                  </button>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">👥</div>
                  <p className="text-gray-400 text-lg">Nu sunt utilizatori în sistem</p>
                </div>
              ) : (
                users.map(user => (
                  <div key={user.id} className="space-y-2">
                    {/* User Card */}
                    <div
                      onClick={() => {
                        if (expandedUserId === user.id) {
                          setExpandedUserId(null);
                          setUserListings([]); // Clear listings when collapsing
                        } else {
                          console.log('[CLICK HANDLER] Expanding user:', user.email, 'ID:', user.id);
                          setExpandedUserId(user.id);
                          setUserListings([]); // Clear old listings before fetching new ones
                          console.log('[CLICK HANDLER] Calling fetchUserListings with:', user.id);
                          fetchUserListings(user.id);
                        }
                      }}
                      className={`bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-2xl p-6 border cursor-pointer transition-all ${
                        user.status === 'banned' ? 'border-red-500/50' : 'border-gray-700/50'
                      } ${expandedUserId === user.id ? 'ring-2 ring-cyan-400/50 border-cyan-400/50' : 'hover:border-cyan-400/30'}`}
                    >
                      <div className="flex items-center gap-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-black text-white">{user.email}</h3>
                            {user.role === 'admin' && (
                              <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs font-bold">
                                👑 ADMIN
                              </span>
                            )}
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              user.status === 'active' 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {user.status === 'active' ? '✓ Activ' : '🚫 Blocat'}
                            </span>
                            {expandedUserId === user.id && (
                              <span className="text-cyan-400 text-lg">▼</span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mb-3 text-sm">
                            <span className="text-gray-400">📝 {user.listings} anunțuri</span>
                            {user.credits > 0 && <span className="text-green-400 font-bold">💰 {user.credits} credite</span>}
                            {user.discount > 0 && <span className="text-blue-400 font-bold">🎟️ {user.discount}% discount</span>}
                            {user.freePromotions > 0 && <span className="text-yellow-400 font-bold">🎁 {user.freePromotions} promovări gratuite</span>}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openCreditsModal(user);
                            }}
                            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold hover:shadow-lg transition-all"
                          >
                            💳 Credite & Beneficii
                          </button>
                          {user.role !== 'admin' && user.status === 'active' && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  makeAdmin(user.id);
                                }}
                                className="px-6 py-3 bg-purple-500/20 text-purple-400 rounded-xl font-bold hover:bg-purple-500/30 transition-all"
                              >
                                👑 Fă Admin
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  banUser(user.id);
                                }}
                                className="px-6 py-3 bg-red-500/20 text-red-400 rounded-xl font-bold hover:bg-red-500/30 transition-all"
                              >
                                🚫 Blochează
                              </button>
                            </>
                          )}
                          {user.status === 'banned' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                unbanUser(user.id);
                              }}
                              className="px-6 py-3 bg-green-500/20 text-green-400 rounded-xl font-bold hover:bg-green-500/30 transition-all"
                            >
                              ✅ Deblochează
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded User Listings */}
                    {expandedUserId === user.id && (
                      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-cyan-400/30 ml-4 space-y-3">
                        {userListingsLoading ? (
                          <div className="text-center py-8">
                            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-[#6D5BFF] to-[#00D4FF] rounded-full animate-spin mb-3">
                              <div className="w-10 h-10 bg-gray-800 rounded-full"></div>
                            </div>
                            <p className="text-gray-400">Se încarcă anunțurile...</p>
                          </div>
                        ) : userListings.length === 0 ? (
                          <p className="text-gray-400 text-center py-4">📭 Nici un anunț</p>
                        ) : (
                          <div className="space-y-3">
                            <h4 className="text-gray-300 font-bold text-sm">🎯 Anunțurile utilizatorului ({userListings.length}):</h4>
                            {userListings.map(listing => (
                              <div
                                key={listing.id}
                                className="bg-gray-900/70 rounded-xl p-4 border border-gray-700/50 hover:border-cyan-400/50 transition-all"
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex-1">
                                    <h5 className="font-bold text-white text-sm">{listing.title}</h5>
                                    <div className="flex items-center gap-3 mt-1 text-xs">
                                      <span className="text-gray-400">📂 {listing.category}</span>
                                      {listing.price && <span className="text-green-400 font-bold">💵 {listing.price.toLocaleString('ro-RO')} RON</span>}
                                      <span className={`px-2 py-1 rounded ${
                                        listing.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                        listing.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                                        'bg-red-500/20 text-red-400'
                                      }`}>
                                        {listing.status}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    {listing.queueId && (
                                      <>
                                        {listing.status !== 'approved' && (
                                          <button
                                            onClick={() => approveListing(listing.id)}
                                            className="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded font-bold hover:bg-green-500/30 transition-all"
                                          >
                                            ✓ Aprobă
                                          </button>
                                        )}
                                        {listing.status !== 'rejected' && (
                                          <button
                                            onClick={() => rejectListing(listing.id)}
                                            className="px-3 py-1 bg-red-500/20 text-red-400 text-xs rounded font-bold hover:bg-red-500/30 transition-all"
                                          >
                                            ✗ Respinge
                                          </button>
                                        )}
                                      </>
                                    )}
                                    {!listing.queueId && listing.status === 'active' && (
                                      <span className="text-xs text-green-400 font-bold">✅ Activ</span>
                                    )}
                                    <button
                                      onClick={() => {
                                        if (confirm('Ești sigur că vrei să ștergi PERMANENT acest anunț?')) {
                                          deleteListing(listing.id);
                                        }
                                      }}
                                      className="px-3 py-1 bg-red-900/20 text-red-300 text-xs rounded font-bold hover:bg-red-900/30 transition-all"
                                    >
                                      🗑️ Șterge
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Credits Modal */}
        {showCreditsModal && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="relative bg-gradient-to-br from-gray-800 via-gray-900 to-black rounded-3xl shadow-2xl border border-gray-700/50 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Close Button */}
              <button
                onClick={() => setShowCreditsModal(false)}
                className="absolute top-4 right-4 w-10 h-10 bg-gray-800/80 hover:bg-red-500/20 rounded-full flex items-center justify-center text-gray-400 hover:text-red-400 transition-all z-10"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Header */}
              <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-8 rounded-t-3xl">
                <h2 className="text-3xl font-black text-white mb-2">💳 Gestiune Beneficii</h2>
                <p className="text-white/90">{selectedUser.email}</p>
              </div>

              {/* Content */}
              <div className="p-8 space-y-6">
                {/* Credits */}
                <div className="bg-gradient-to-br from-green-500/10 to-emerald-600/10 rounded-2xl p-6 border border-green-500/30">
                  <label className="block text-white font-black mb-3">💰 Adaugă Credite</label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="number"
                      min="0"
                      value={creditsForm.credits}
                      onChange={(e) => setCreditsForm({ ...creditsForm, credits: e.target.value })}
                      placeholder="0"
                      className="flex-1 bg-gray-900/50 border-2 border-green-600/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                    />
                    <span className="text-gray-400">RON</span>
                  </div>
                  <p className="text-sm text-gray-400 mt-2">Utilizatorul va putea folosi acești credite pentru a plăti promovări</p>
                </div>

                {/* Discount */}
                <div className="bg-gradient-to-br from-blue-500/10 to-cyan-600/10 rounded-2xl p-6 border border-blue-500/30">
                  <label className="block text-white font-black mb-3">🎟️ Aplică Discount Global</label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={creditsForm.discount}
                      onChange={(e) => setCreditsForm({ ...creditsForm, discount: e.target.value })}
                      placeholder="0"
                      className="flex-1 bg-gray-900/50 border-2 border-blue-600/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                    <span className="text-gray-400">%</span>
                  </div>
                  <p className="text-sm text-gray-400 mt-2">{creditsForm.discount || 0}% reducere la toate promovările</p>
                </div>

                {/* Free Promotions */}
                <div className="bg-gradient-to-br from-yellow-500/10 to-orange-600/10 rounded-2xl p-6 border border-yellow-500/30">
                  <label className="block text-white font-black mb-3">🎁 Promovări Gratuite</label>
                  
                  <div className="space-y-3 mb-4">
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">Tip Promovare</label>
                      <select
                        value={creditsForm.promotionType}
                        onChange={(e) => setCreditsForm({ ...creditsForm, promotionType: e.target.value as PromotionType })}
                        className="w-full bg-gray-900/50 border-2 border-yellow-600/50 rounded-xl px-4 py-2 text-white focus:border-yellow-500"
                      >
                        <option value="top">🔝 TOP Anunț</option>
                        <option value="urgent">🔥 URGENT</option>
                        <option value="featured">✨ Evidențiat</option>
                        <option value="refresh">🔄 Reîmprospătare</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-300 text-sm mb-2">Număr de Promovări Gratuite</label>
                      <input
                        type="number"
                        min="0"
                        value={creditsForm.freePromotions}
                        onChange={(e) => setCreditsForm({ ...creditsForm, freePromotions: e.target.value })}
                        placeholder="0"
                        className="w-full bg-gray-900/50 border-2 border-yellow-600/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-300 text-sm mb-2">Expirare (zile)</label>
                      <input
                        type="number"
                        min="1"
                        value={creditsForm.expiryDays}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setCreditsForm({ ...creditsForm, expiryDays: isNaN(val) ? 30 : val });
                        }}
                        placeholder="30"
                        className="w-full bg-gray-900/50 border-2 border-yellow-600/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20"
                      />
                    </div>
                  </div>

                  <p className="text-sm text-gray-400">
                    {creditsForm.freePromotions || 0} × {creditsForm.promotionType} - Expirează în {creditsForm.expiryDays} zile
                  </p>
                </div>

                {/* Summary */}
                <div className="bg-gradient-to-br from-purple-500/20 to-pink-600/20 rounded-2xl p-6 border border-purple-500/30">
                  <p className="text-white font-bold mb-3">📊 Rezumat Beneficii</p>
                  <div className="space-y-2 text-sm text-gray-300">
                    <p>✓ Credite: <span className="font-bold text-green-400">{creditsForm.credits} RON</span></p>
                    <p>✓ Discount Global: <span className="font-bold text-blue-400">{creditsForm.discount}%</span></p>
                    <p>✓ Promovări Gratuite: <span className="font-bold text-yellow-400">{creditsForm.freePromotions} × {creditsForm.promotionType}</span></p>
                    <p>✓ Valabil: <span className="font-bold text-gray-300">{creditsForm.expiryDays} zile</span></p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => setShowCreditsModal(false)}
                    className="flex-1 py-4 bg-gray-800 border-2 border-gray-700 text-white rounded-xl font-bold hover:bg-gray-700 transition-all"
                  >
                    Anulează
                  </button>
                  <button
                    onClick={handleSaveCredits}
                    className="flex-1 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-black text-lg hover:shadow-2xl hover:shadow-amber-500/50 transition-all transform hover:scale-105 active:scale-95"
                  >
                    ✅ Salvează Beneficii
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
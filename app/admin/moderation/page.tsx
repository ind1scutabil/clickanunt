'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';
import { memoryStorage } from '@/lib/memory-storage';

type StoredUser = {
  email?: string;
  role?: string;
};

type UserRole = 'admin' | 'user';
type UserStatus = 'active' | 'banned';
type PromotionType = 'top' | 'urgent' | 'featured' | 'refresh';

type ModerationUser = {
  id: number;
  email: string;
  role: UserRole;
  status: UserStatus;
  listings: number;
  credits: number;
  freePromotions: number;
  discount: number;
};

const getStoredUser = (): StoredUser | null => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
};

export default function AdminModerationPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const storedUser = getStoredUser();
  const isAdmin =
    !!storedUser && (storedUser.email === 'owner@autoplatform.ro' || storedUser.role === 'admin');
  
  // Mock data pentru demonstrație
  const [pendingListings, setPendingListings] = useState([
    {
      id: 'listing-1',
      title: 'Mercedes-Benz S-Class 2021',
      price: 85000,
      owner: 'ionpopescu@email.com',
      status: 'pending',
      submittedAt: '2026-02-08 14:23',
      photos: 5,
      flagged: false
    },
    {
      id: 'listing-2',
      title: 'Audi A8 Quattro',
      price: 65000,
      owner: 'maria.ionescu@email.com',
      status: 'pending',
      submittedAt: '2026-02-08 13:45',
      photos: 8,
      flagged: true,
      flagReason: 'Preț suspect de mic'
    }
  ]);

  const [approvedListings, setApprovedListings] = useState([
    {
      id: 'listing-sample-bmw7',
      title: 'BMW Seria 7',
      price: 70000,
      owner: 'owner@autoplatform.ro',
      status: 'approved',
      approvedAt: '2026-02-07 10:15',
      views: 234,
      favorites: 45
    }
  ]);

  const [rejectedListings, setRejectedListings] = useState([
    {
      id: 'listing-3',
      title: 'BMW X5 IEFTIN!!!',
      price: 5000,
      owner: 'scammer@fake.com',
      status: 'rejected',
      rejectedAt: '2026-02-07 16:30',
      reason: 'Conținut suspect, preț nerealist'
    }
  ]);

  const [users, setUsers] = useState<ModerationUser[]>([
    { id: 1, email: 'owner@autoplatform.ro', role: 'admin', status: 'active', listings: 1, credits: 0, freePromotions: 0, discount: 0 },
    { id: 2, email: 'ionpopescu@email.com', role: 'user', status: 'active', listings: 3, credits: 0, freePromotions: 0, discount: 0 },
    { id: 3, email: 'maria.ionescu@email.com', role: 'user', status: 'active', listings: 2, credits: 0, freePromotions: 0, discount: 0 },
    { id: 4, email: 'scammer@fake.com', role: 'user', status: 'banned', listings: 5, credits: 0, freePromotions: 0, discount: 0 }
  ]);

  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ModerationUser | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [creditsForm, setCreditsForm] = useState({
    credits: '',
    discount: '',
    freePromotions: '',
    promotionType: 'top' as PromotionType,
    expiryDays: 30
  });

  const stats = {
    totalListings: 156,
    pendingReview: 12,
    approvedToday: 8,
    rejectedToday: 2,
    totalUsers: 342,
    bannedUsers: 5,
    reportedListings: 3
  };

  useEffect(() => {
    if (!storedUser) {
      alert('🔒 Trebuie să fii autentificat ca administrator pentru a accesa această pagină.');
      router.push('/auth/login');
      return;
    }

    if (!isAdmin) {
      alert('⛔ Acces interzis! Această secțiune este rezervată doar administratorilor.');
      router.push('/dashboard');
    }
  }, [router, storedUser, isAdmin]);

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

  const banUser = (userId: number) => {
    if (!confirm('Blochezi acest utilizator?')) return;
    
    setUsers(users.map(u => 
      u.id === userId ? { ...u, status: 'banned' } : u
    ));
  };

  const unbanUser = (userId: number) => {
    setUsers(users.map(u => 
      u.id === userId ? { ...u, status: 'active' } : u
    ));
  };

  const makeAdmin = (userId: number) => {
    if (!confirm('Faci acest utilizator administrator?')) return;
    
    setUsers(users.map(u => 
      u.id === userId ? { ...u, role: 'admin' } : u
    ));
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

  const handleSaveCredits = () => {
    if (!selectedUser) return;

    const credits = creditsForm.credits ? parseInt(creditsForm.credits) : 0;
    const discount = creditsForm.discount ? parseInt(creditsForm.discount) : 0;
    const freePromotions = creditsForm.freePromotions ? parseInt(creditsForm.freePromotions) : 0;

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
  };

  if (!storedUser || !isAdmin) {
    return null;
  }

  if (!isAdmin) {
    return null;
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
          <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all ${
                activeTab === 'pending'
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
              }`}
            >
              ⏳ În Așteptare ({pendingListings.length})
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all ${
                activeTab === 'approved'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
              }`}
            >
              ✅ Aprobate ({approvedListings.length})
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={`px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all ${
                activeTab === 'rejected'
                  ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
              }`}
            >
              ❌ Respinse ({rejectedListings.length})
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all ${
                activeTab === 'users'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
              }`}
            >
              👥 Utilizatori ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all ${
                activeTab === 'invoices'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
              }`}
            >
              💰 Facturi & Contabilitate
            </button>
          </div>

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
            <div className="space-y-4">
              {pendingListings.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🎉</div>
                  <p className="text-gray-400 text-lg">Nu sunt anunțuri în așteptare</p>
                </div>
              ) : (
                pendingListings.map(listing => (
                  <div
                    key={listing.id}
                    className={`bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-2xl p-6 border ${
                      listing.flagged ? 'border-red-500/50' : 'border-gray-700/50'
                    }`}
                  >
                    {listing.flagged && (
                      <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                        <span className="text-red-400 font-bold">🚨 Semnalat: {listing.flagReason}</span>
                      </div>
                    )}
                    
                    <div className="flex items-start gap-6">
                      <div className="flex-1">
                        <h3 className="text-2xl font-black text-white mb-2">{listing.title}</h3>
                        <div className="flex items-center gap-4 mb-3">
                          <span className="text-2xl font-black bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] bg-clip-text text-transparent">
                            {listing.price.toLocaleString()} RON
                          </span>
                          <span className="text-gray-400">📸 {listing.photos} poze</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span>👤 {listing.owner}</span>
                          <span>🕒 {listing.submittedAt}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => router.push(`/listings/${listing.id}`)}
                          className="px-6 py-3 bg-blue-500/20 text-blue-400 rounded-xl font-bold hover:bg-blue-500/30 transition-all"
                        >
                          👁️ Vezi
                        </button>
                        <button
                          onClick={() => approveListing(listing.id)}
                          className="px-6 py-3 bg-green-500/20 text-green-400 rounded-xl font-bold hover:bg-green-500/30 transition-all"
                        >
                          ✅ Aprobă
                        </button>
                        <button
                          onClick={() => rejectListing(listing.id)}
                          className="px-6 py-3 bg-red-500/20 text-red-400 rounded-xl font-bold hover:bg-red-500/30 transition-all"
                        >
                          ❌ Respinge
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Approved Listings */}
          {activeTab === 'approved' && (
            <div className="space-y-4">
              {approvedListings.map(listing => (
                <div
                  key={listing.id}
                  className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-2xl p-6 border border-green-500/30"
                >
                  <div className="flex items-start gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-2xl font-black text-white">{listing.title}</h3>
                        <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold">
                          ✓ APROBAT
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mb-3">
                        <span className="text-2xl font-black bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] bg-clip-text text-transparent">
                          {listing.price.toLocaleString()} RON
                        </span>
                        <span className="text-gray-400">👁️ {listing.views} vizualizări</span>
                        <span className="text-gray-400">❤️ {listing.favorites} favorite</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span>👤 {listing.owner}</span>
                        <span>✅ {listing.approvedAt}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/listings/${listing.id}`)}
                        className="px-6 py-3 bg-blue-500/20 text-blue-400 rounded-xl font-bold hover:bg-blue-500/30 transition-all"
                      >
                        👁️ Vezi
                      </button>
                      <button
                        onClick={() => deleteListing(listing.id)}
                        className="px-6 py-3 bg-red-500/20 text-red-400 rounded-xl font-bold hover:bg-red-500/30 transition-all"
                      >
                        🗑️ Șterge
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Rejected Listings */}
          {activeTab === 'rejected' && (
            <div className="space-y-4">
              {rejectedListings.map(listing => (
                <div
                  key={listing.id}
                  className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-2xl p-6 border border-red-500/30"
                >
                  <div className="flex items-start gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-2xl font-black text-white">{listing.title}</h3>
                        <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-bold">
                          ✗ RESPINS
                        </span>
                      </div>
                      <div className="mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <span className="text-red-400">Motiv: {listing.reason}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span>👤 {listing.owner}</span>
                        <span>❌ {listing.rejectedAt}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => deleteListing(listing.id)}
                      className="px-6 py-3 bg-red-500/20 text-red-400 rounded-xl font-bold hover:bg-red-500/30 transition-all"
                    >
                      🗑️ Șterge Permanent
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Users Management */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              {users.map(user => (
                <div
                  key={user.id}
                  className={`bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-2xl p-6 border ${
                    user.status === 'banned' ? 'border-red-500/50' : 'border-gray-700/50'
                  }`}
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
                        onClick={() => openCreditsModal(user)}
                        className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold hover:shadow-lg transition-all"
                      >
                        💳 Credite & Beneficii
                      </button>
                      {user.role !== 'admin' && user.status === 'active' && (
                        <>
                          <button
                            onClick={() => makeAdmin(user.id)}
                            className="px-6 py-3 bg-purple-500/20 text-purple-400 rounded-xl font-bold hover:bg-purple-500/30 transition-all"
                          >
                            👑 Fă Admin
                          </button>
                          <button
                            onClick={() => banUser(user.id)}
                            className="px-6 py-3 bg-red-500/20 text-red-400 rounded-xl font-bold hover:bg-red-500/30 transition-all"
                          >
                            🚫 Blochează
                          </button>
                        </>
                      )}
                      {user.status === 'banned' && (
                        <button
                          onClick={() => unbanUser(user.id)}
                          className="px-6 py-3 bg-green-500/20 text-green-400 rounded-xl font-bold hover:bg-green-500/30 transition-all"
                        >
                          ✅ Deblochează
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
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
                        onChange={(e) => setCreditsForm({ ...creditsForm, expiryDays: parseInt(e.target.value) || 30 })}
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
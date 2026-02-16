"use client";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { memoryStorage } from "@/lib/memory-storage";

export default function MyListingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"active" | "pending" | "expired" | "draft">("active");
  const [listings, setListings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isPromoting, setIsPromoting] = useState<string | null>(null);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/auth/login?redirect=/dashboard/listings');
      return;
    }

    fetchListings();
  }, [router]);

  const fetchListings = async () => {
    try {
      // Check if we're in in-memory mode
      const useInMemory = process.env.NEXT_PUBLIC_USE_IN_MEMORY_DB === 'true';
      
      if (useInMemory) {
        // Get all listings from memory storage
        const allListings = memoryStorage.getAll();
        console.log('📋 Loaded listings from memory:', allListings);
        
        // Filter by current user
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const currentUser = JSON.parse(userStr);
          const userListings = allListings.filter((listing: any) => {
            return listing.owner?.id === currentUser.id || 
                   listing.owner?.email === currentUser.email ||
                   listing.ownerUserId === currentUser.id;
          });
          setListings(userListings);
        } else {
          setListings(allListings);
        }
      } else {
        // Production: fetch from API
        const token = localStorage.getItem('accessToken');
        const response = await fetch('/api/listings?userId=me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch listings');
        }

        const data = await response.json();
        setListings(Array.isArray(data) ? data : data.data || data.listings || []);
      }
    } catch (err) {
      console.error('Error fetching listings:', err);
      setListings([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Ești sigur că vrei să ștergi acest anunț?')) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/listings/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete');
      }

      setMessage({ type: 'success', text: 'Anunț șters cu succes' });
      setListings(listings.filter(l => l.id !== id));
    } catch (err) {
      setMessage({ type: 'error', text: 'Eroare la ștergere' });
    }
  };

  const getCsrfToken = async () => {
    try {
      const response = await fetch('/api/csrf-token');
      const data = await response.json();
      return data.token;
    } catch (err) {
      console.error('Error getting CSRF token:', err);
      return null;
    }
  };

  const handlePromote = async (id: string, packageId: string) => {
    try {
      setIsPromoting(id);
      const token = localStorage.getItem('accessToken');
      const csrfToken = await getCsrfToken();

      const response = await fetch(`/api/listings/${id}/promote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ packageId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to promote');
      }

      const data = await response.json();
      setMessage({ type: 'success', text: 'Anunț promovat cu succes!' });
      
      // Update listing in local state
      setListings(listings.map(l => 
        l.id === id 
          ? { ...l, isPromoted: true, promotionType: packageId, promotionExpiresAt: data.listing.promotionExpiresAt }
          : l
      ));
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Eroare la promovare' });
    } finally {
      setIsPromoting(null);
    }
  };

  const handleRemovePromotion = async (id: string) => {
    try {
      setIsPromoting(id);
      const token = localStorage.getItem('accessToken');
      const csrfToken = await getCsrfToken();

      const response = await fetch(`/api/listings/${id}/promote`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove promotion');
      }

      setMessage({ type: 'success', text: 'Promovarea anunțului a fost anulată' });
      
      // Update listing in local state
      setListings(listings.map(l => 
        l.id === id 
          ? { ...l, isPromoted: false, promotionType: null, promotionExpiresAt: null }
          : l
      ));
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Eroare la anularea promovării' });
    } finally {
      setIsPromoting(null);
    }
  };

  const filteredListings = listings.filter((listing) => {
    const status = (listing.status || 'active').toLowerCase();
    return status === activeTab;
  });

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-5xl font-black mb-4">
              <span className="text-white">Anunțurile </span>
              <span className="neon-text bg-clip-text text-transparent bg-gradient-to-r from-[#6366F1] to-[#8B5CF6]">
                mele
              </span>
            </h1>
            <p className="text-gray-400 text-lg">
              Gestionează și editează anunțurile tale publicate
            </p>
          </div>
          <Link
            href="/listings/new"
            className="inline-flex items-center gap-3 bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6366F1] text-white px-8 py-4 rounded-xl font-black text-lg transition-all shadow-[0_0_30px_rgba(99,102,241,0.5)]"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Adaugă anunț nou
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-slate-700/50">
          {(['active', 'pending', 'expired', 'draft'] as const).map((tab) => {
            const count = listings.filter(l => ((l.status || 'active').toLowerCase()) === tab).length;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-4 px-6 font-bold text-lg transition-all ${
                  activeTab === tab
                    ? "border-b-4 border-purple-500 text-purple-400"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {tab === 'active' && 'Active'}
                {tab === 'pending' && 'În așteptare'}
                {tab === 'expired' && 'Expirate'}
                {tab === 'draft' && 'Ciorne'}
                <span className={`ml-2 px-2 py-1 rounded-full text-xs border ${
                  tab === 'active' ? 'bg-[#39FF14]/20 text-[#39FF14] border-[#39FF14]/30' :
                  tab === 'pending' ? 'bg-[#8B5CF6]/20 text-[#8B5CF6] border-[#8B5CF6]/30' :
                  'bg-[#2A2A2A] text-gray-400 border-[#2A2A2A]'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Se încarcă anunțurile...</p>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-[#6366F1] to-[#7C3AED] rounded-full mb-6 shadow-lg">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-white mb-3">
              {activeTab === "active" && "Niciun anunț activ"}
              {activeTab === "pending" && "Niciun anunț în așteptare"}
              {activeTab === "expired" && "Niciun anunț expirat"}
            </h3>
            <p className="text-gray-400 text-lg mb-8">
              {activeTab === "active" && "Publică primul tău anunț și începe să vinzi"}
              {activeTab === "pending" && "Anunțurile în așteptare de aprobare vor apărea aici"}
              {activeTab === "expired" && "Anunțurile expirate vor apărea aici"}
            </p>
            <Link
              href="/listings/new"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6366F1] text-white px-8 py-4 rounded-xl font-black text-lg transition-all shadow-[0_0_30px_rgba(99,102,241,0.5)]"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Adaugă anunț nou
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredListings.map((listing) => (
              <div
                key={listing.id}
                className="glass-dark rounded-2xl p-6 border-2 border-slate-700/50 hover:border-purple-500 transition-all group hover:scale-[1.02] shadow-xl"
              >
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Image */}
                  <div className="w-full md:w-64 h-48 rounded-xl overflow-hidden flex-shrink-0 bg-[#1A1A1A]">
                    {(listing.photos?.[0] || listing.imageUrls?.[0]) ? (
                      <img
                        src={listing.photos?.[0] || listing.imageUrls?.[0]}
                        alt={listing.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-2xl font-black text-white mb-2">{listing.title}</h3>
                        <div className="text-3xl font-black bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] bg-clip-text text-transparent">
                          {listing.price || `${listing.priceAmount?.toLocaleString()} ${listing.priceCurrency}`}
                        </div>
                      </div>
                      {listing.status === "active" && (
                        <span className="px-4 py-2 bg-[#39FF14]/20 text-[#39FF14] rounded-full text-sm font-bold border border-[#39FF14]/30">
                          Activ
                        </span>
                      )}
                      {listing.status === "pending" && (
                        <span className="px-4 py-2 bg-[#8B5CF6]/20 text-[#8B5CF6] rounded-full text-sm font-bold border border-[#8B5CF6]/30">
                          În așteptare
                        </span>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="flex items-center gap-2">
                        <svg
                          className="w-5 h-5 text-[#1E90FF]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                        <span className="text-gray-400 font-medium">
                          {listing.views || 0} vizualizări
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg
                          className="w-5 h-5 text-[#B537F2]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                          />
                        </svg>
                        <span className="text-gray-400 font-medium">{listing.messages || 0} mesaje</span>
                      </div>
                      <div className="text-sm text-gray-400 font-medium">
                        Publicat: {new Date(listing.createdAt).toLocaleDateString('ro-RO')}
                      </div>
                      <div className="text-sm text-gray-400 font-medium">
                        Expiră în: {listing.expiresIn || '30 zile'}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-3">
                      <Link
                        href={`/listings/${listing.id}`}
                        className="flex items-center gap-2 px-5 py-2.5 glass-dark hover:bg-white/10 text-white rounded-lg font-bold text-sm transition-all border border-[#2A2A2A]"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                        Vizualizează
                      </Link>
                      <Link
                        href={`/listings/${listing.id}/edit`}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#1E90FF] to-[#4DA6FF] hover:from-[#4DA6FF] hover:to-[#1E90FF] text-white rounded-lg font-bold text-sm transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        Editează
                      </Link>
                      {!listing.isPromoted && (
                        <button
                          onClick={() => handlePromote(listing.id, 'top')}
                          disabled={isPromoting === listing.id}
                          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#FFD700] to-[#FFA500] hover:from-[#FFA500] hover:to-[#FFD700] text-black rounded-lg font-bold text-sm transition-all disabled:opacity-50"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                          </svg>
                          {isPromoting === listing.id ? 'Se promovează...' : 'Promoveaza'}
                        </button>
                      )}
                      {listing.isPromoted && (
                        <button
                          onClick={() => handleRemovePromotion(listing.id)}
                          disabled={isPromoting === listing.id}
                          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#FF6B6B] to-[#FF8787] hover:from-[#FF8787] hover:to-[#FF6B6B] text-white rounded-lg font-bold text-sm transition-all disabled:opacity-50"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                          {isPromoting === listing.id ? 'Se procesează...' : 'Anulează promovare'}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(listing.id)}
                        className="flex items-center gap-2 px-5 py-2.5 glass-dark hover:bg-red-600/20 text-red-500 rounded-lg font-bold text-sm transition-all border border-red-500/30"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        Șterge
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

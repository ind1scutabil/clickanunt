"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { Card, Badge, Button, Tabs, Avatar } from "@/app/components/ui";
import { ListingCard } from "@/app/components/composite";

export default function DashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    activeListings: 0,
    totalViews: 0,
    messages: 0,
    favorites: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [listings, setListings] = useState<any[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [listingsError, setListingsError] = useState<string | null>(null);

  const refreshUser = async (token: string, fallbackUser?: any) => {
    try {
      const response = await fetch('/api/users/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) return;

      const data = await response.json();
      const mergedUser = { ...(fallbackUser || {}), ...data };
      setUser(mergedUser);
      localStorage.setItem('user', JSON.stringify(mergedUser));
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  // Fetch stats from API
  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const response = await fetch('/api/dashboard/stats', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.stats) {
          setStats(data.stats);
        }
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const normalizeListingStatus = (listing: any) => {
    const raw = listing?.status || listing?.moderationStatus || 'active';
    if (raw === 'approved') return 'active';
    if (raw === 'rejected') return 'rejected';
    return String(raw).toLowerCase();
  };

  const formatPrice = (listing: any) => {
    if (listing?.price) return String(listing.price);
    const amount = listing?.priceAmount;
    const currency = listing?.priceCurrency || 'RON';
    if (typeof amount === 'number') {
      return `${amount.toLocaleString('ro-RO')} ${currency}`;
    }
    return 'Pret la cerere';
  };

  const formatLocation = (listing: any) => {
    const city = listing?.city;
    const county = listing?.county;
    if (city && county) return `${city}, ${county}`;
    return city || county || 'Romania';
  };

  const formatPostedAt = (listing: any) => {
    const createdAt = listing?.createdAt ? new Date(listing.createdAt) : null;
    if (!createdAt || Number.isNaN(createdAt.getTime())) return 'Recent';
    return createdAt.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const fetchListings = async () => {
    try {
      setListingsLoading(true);
      setListingsError(null);

      const token = localStorage.getItem('accessToken');
      const userStr = localStorage.getItem('user');
      const headers: Record<string, string> = {};

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      if (userStr) {
        headers['X-User-Info'] = btoa(userStr);
      }

      const response = await fetch('/api/listings?userId=me&status=all', {
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch listings');
      }

      const data = await response.json();
      const items = Array.isArray(data) ? data : data.listings || data.data || [];
      setListings(items);
    } catch (error) {
      console.error('Failed to fetch listings:', error);
      setListings([]);
      setListingsError('Nu am putut incarca anunturile.');
    } finally {
      setListingsLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      router.push('/auth/login?redirect=/dashboard');
      setIsLoading(false);
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      setIsAuthenticated(true);
      
      // Fetch real stats
      fetchStats();

      // Refresh user details (benefits, credits, discounts)
      refreshUser(token, parsedUser);

      // Fetch user listings for dashboard
      fetchListings();
    } catch (e) {
      console.error('Failed to parse user data:', e);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      router.push('/auth/login?redirect=/dashboard');
    }

    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300 font-medium">Se încarcă...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const activeListings = listings.filter((listing) => normalizeListingStatus(listing) === 'active');
  const recentListings = activeListings.slice(0, 3);
  const sellerName = user?.name || user?.email || 'Contul meu';
  const sellerInitials = getInitials(sellerName);

  return (
    <div className="min-h-screen bg-[#0B0F17] relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 left-1/3 w-[32rem] h-[32rem] bg-cyan-500/10 rounded-full blur-[140px]"></div>
        <div className="absolute bottom-0 right-1/4 w-[28rem] h-[28rem] bg-emerald-500/10 rounded-full blur-[140px]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.05),_transparent_40%)]"></div>
      </div>
      
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-12 relative z-10">
        {/* Page Header */}
        <div className="mb-12">
          <h1 className="text-5xl md:text-6xl font-black mb-4 text-white tracking-tight">
            Dashboard <span className="bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">personal</span>
          </h1>
          <p className="text-slate-300 text-lg">Control complet asupra anunțurilor, beneficiilor și activitatii contului.</p>
        </div>

        {/* User Profile Card */}
        <Card variant="elevated" className="mb-12 bg-gradient-to-br from-slate-800/50 to-slate-900/50">
          <Card.Body className="p-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-6">
                <Avatar
                  size="lg"
                  initials={user.name ? user.name.split(' ').map((n: string) => n[0]).join('') : 'U'}
                  status="online"
                />
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-3xl font-black text-white">{user.name}</h2>
                    {user.verified && (
                      <Badge variant="success">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Verificat
                      </Badge>
                    )}
                    {user.role === 'premium' && (
                      <Badge variant="warning">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.538 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.783.57-1.838-.197-1.538-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.93 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        Premium
                      </Badge>
                    )}
                  </div>
                  <p className="text-gray-400 font-medium mb-1">{user.email}</p>
                  <p className="text-sm text-gray-500">Membru din februarie 2024</p>
                </div>
              </div>
              <Link href="/dashboard/account">
                <Button variant="primary">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Editează profil
                </Button>
              </Link>
            </div>
          </Card.Body>
        </Card>

        {/* Stats Grid - ENTERPRISE DESIGN */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
          {/* Active Listings */}
          <Link href="/dashboard/listings">
            <div className="group relative bg-gradient-to-br from-purple-600/10 via-purple-500/5 to-transparent backdrop-blur-xl border border-purple-500/20 rounded-3xl p-6 hover:border-purple-500/40 transition-all duration-300 hover:scale-[1.02] cursor-pointer overflow-hidden">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/0 via-purple-500/0 to-transparent group-hover:from-purple-600/10 group-hover:via-purple-500/5 transition-all duration-500"></div>
              
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-6">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg shadow-purple-500/30">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs font-semibold text-green-400">Activ</span>
                  </div>
                </div>
                
                {statsLoading ? (
                  <div className="animate-pulse">
                    <div className="h-10 bg-white/10 rounded-lg mb-2 w-20"></div>
                    <div className="h-4 bg-white/5 rounded w-32"></div>
                  </div>
                ) : (
                  <>
                    <div className="text-4xl font-black text-white mb-2 group-hover:scale-105 transition-transform">
                      {stats.activeListings}
                    </div>
                    <div className="text-sm font-medium text-purple-300">Anunțuri active</div>
                    <div className="mt-3 flex items-center text-xs text-purple-400">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      Gestionează →
                    </div>
                  </>
                )}
              </div>
            </div>
          </Link>

          {/* Total Views */}
          <div className="relative bg-gradient-to-br from-blue-600/10 via-cyan-500/5 to-transparent backdrop-blur-xl border border-blue-500/20 rounded-3xl p-6 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
            
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-6">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg shadow-blue-500/30">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <div className="px-3 py-1 bg-blue-500/10 rounded-full">
                  <span className="text-xs font-bold text-blue-400">Total</span>
                </div>
              </div>
              
              {statsLoading ? (
                <div className="animate-pulse">
                  <div className="h-10 bg-white/10 rounded-lg mb-2 w-28"></div>
                  <div className="h-4 bg-white/5 rounded w-32"></div>
                </div>
              ) : (
                <>
                  <div className="text-4xl font-black text-white mb-2">
                    {stats.totalViews.toLocaleString()}
                  </div>
                  <div className="text-sm font-medium text-blue-300">Vizualizări totale</div>
                  <div className="mt-3 text-xs text-blue-400">
                    Toate anunțurile tale
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Messages */}
          <Link href="/messages">
            <div className="group relative bg-gradient-to-br from-amber-600/10 via-orange-500/5 to-transparent backdrop-blur-xl border border-amber-500/20 rounded-3xl p-6 hover:border-amber-500/40 transition-all duration-300 hover:scale-[1.02] cursor-pointer overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-600/0 via-orange-500/0 to-transparent group-hover:from-amber-600/10 group-hover:via-orange-500/5 transition-all duration-500"></div>
              
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-6">
                  <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl shadow-lg shadow-amber-500/30 relative">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    {!statsLoading && stats.messages > 0 && (
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold animate-bounce">
                        {stats.messages > 9 ? '9+' : stats.messages}
                      </div>
                    )}
                  </div>
                </div>
                
                {statsLoading ? (
                  <div className="animate-pulse">
                    <div className="h-10 bg-white/10 rounded-lg mb-2 w-16"></div>
                    <div className="h-4 bg-white/5 rounded w-24"></div>
                  </div>
                ) : (
                  <>
                    <div className="text-4xl font-black text-white mb-2 group-hover:scale-105 transition-transform">
                      {stats.messages}
                    </div>
                    <div className="text-sm font-medium text-amber-300">
                      {stats.messages === 1 ? 'Mesaj nou' : 'Mesaje noi'}
                    </div>
                    <div className="mt-3 flex items-center text-xs text-amber-400">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      Vezi mesaje →
                    </div>
                  </>
                )}
              </div>
            </div>
          </Link>

          {/* Favorites */}
          <Link href="/favorites">
            <div className="group relative bg-gradient-to-br from-pink-600/10 via-rose-500/5 to-transparent backdrop-blur-xl border border-pink-500/20 rounded-3xl p-6 hover:border-pink-500/40 transition-all duration-300 hover:scale-[1.02] cursor-pointer overflow-hidden">
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-500/10 rounded-full blur-3xl"></div>
              
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-6">
                  <div className="p-3 bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl shadow-lg shadow-pink-500/30">
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                
                {statsLoading ? (
                  <div className="animate-pulse">
                    <div className="h-10 bg-white/10 rounded-lg mb-2 w-16"></div>
                    <div className="h-4 bg-white/5 rounded w-28"></div>
                  </div>
                ) : (
                  <>
                    <div className="text-4xl font-black text-white mb-2 group-hover:scale-105 transition-transform">
                      {stats.favorites}
                    </div>
                    <div className="text-sm font-medium text-pink-300">
                      {stats.favorites === 1 ? 'Favorit salvat' : 'Favorite salvate'}
                    </div>
                    <div className="mt-3 flex items-center text-xs text-pink-400">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      Vezi colecția →
                    </div>
                  </>
                )}
              </div>
            </div>
          </Link>

          {/* Invoices - NEW */}
          <Link href="/dashboard/invoices">
            <div className="group relative bg-gradient-to-br from-emerald-600/10 via-teal-500/5 to-transparent backdrop-blur-xl border border-emerald-500/20 rounded-3xl p-6 hover:border-emerald-500/40 transition-all duration-300 hover:scale-[1.02] cursor-pointer overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>
              
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-6">
                  <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl shadow-lg shadow-emerald-500/30">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                
                <div className="text-4xl font-black text-white mb-2 group-hover:scale-105 transition-transform">
                  📄
                </div>
                <div className="text-sm font-medium text-emerald-300">Facturile mele</div>
                <div className="mt-3 flex items-center text-xs text-emerald-400">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Vezi facturi →
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Tabs Section */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-12">
          <Tabs.List className="bg-slate-900/60 border border-white/10 rounded-2xl p-2 gap-2">
            <Tabs.Trigger value="overview" className="rounded-xl px-5 py-2.5 text-sm">
              Privire generala
            </Tabs.Trigger>
            <Tabs.Trigger value="listings" className="rounded-xl px-5 py-2.5 text-sm">
              Anunturile mele
            </Tabs.Trigger>
            <Tabs.Trigger value="activity" className="rounded-xl px-5 py-2.5 text-sm">
              Activitate
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="overview" className="mt-8">
            <div className="grid lg:grid-cols-12 gap-6">
              <Card variant="elevated" className="lg:col-span-5 bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-white/10">
                <Card.Body className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-white">Actiuni rapide</h3>
                      <p className="text-sm text-slate-400">Publica si gestioneaza anunturile in cateva secunde.</p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                      <svg className="w-5 h-5 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Link href="/listings/new" className="block">
                      <Button variant="primary" size="lg" className="w-full justify-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Adauga anunt nou
                      </Button>
                    </Link>
                    <Link href="/dashboard/listings" className="block">
                      <Button variant="secondary" size="lg" className="w-full justify-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Gestioneaza anunturi
                      </Button>
                    </Link>
                  </div>
                </Card.Body>
              </Card>

              <Card variant="elevated" className="lg:col-span-4 bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-white/10">
                <Card.Body className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-white">Plan actual</h3>
                      <p className="text-sm text-slate-400">Statusul contului si optiuni de upgrade.</p>
                    </div>
                    <Badge variant={user.role === 'premium' ? 'warning' : 'primary'} className="w-fit">
                      {user.role === 'premium' ? 'Premium' : 'Gratuit'}
                    </Badge>
                  </div>
                  <p className="text-slate-300 text-sm mb-4">
                    {user.role === 'premium'
                      ? 'Ai acces la promovari prioritare si suport dedicat.'
                      : 'Treci la Premium pentru mai multa vizibilitate si beneficii.'}
                  </p>
                  {user.role !== 'premium' && (
                    <Link href="/dashboard/billing">
                      <Button variant="primary" size="sm">Upgrade la Premium</Button>
                    </Link>
                  )}
                </Card.Body>
              </Card>

              <Card variant="elevated" className="lg:col-span-3 bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-white/10">
                <Card.Body className="p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Beneficii active</h3>
                  <div className="space-y-4 text-sm text-slate-300">
                    <div className="flex items-center justify-between">
                      <span>Credite disponibile</span>
                      <span className="font-bold text-white">{user.creditsBalance ?? 0} RON</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Discount global</span>
                      <span className="font-bold text-white">{user.promotionDiscountPercent ?? 0}%</span>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-2">Promovari gratuite</div>
                      {(() => {
                        const promotions = user?.promotionBenefits?.promotions || {};
                        const entries = Object.entries(promotions).filter(([, value]: any) => {
                          const count = value?.count || 0;
                          const expiresAt = value?.expiresAt ? new Date(value.expiresAt).getTime() : null;
                          const isActive = !expiresAt || expiresAt > Date.now();
                          return count > 0 && isActive;
                        });

                        if (entries.length === 0) {
                          return <div className="text-slate-500">Nu ai promovari gratuite active.</div>;
                        }

                        return (
                          <ul className="space-y-1">
                            {entries.map(([type, value]: any) => (
                              <li key={type} className="flex items-center justify-between">
                                <span className="capitalize">{type}</span>
                                <span className="font-bold text-white">{value?.count || 0}x</span>
                              </li>
                            ))}
                          </ul>
                        );
                      })()}
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </div>
          </Tabs.Content>

          <Tabs.Content value="listings" className="mt-8">
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-white">Anunturile mele</h3>
                  <p className="text-slate-400">Vezi rapid anunturile active si performanta lor.</p>
                </div>
                <Link href="/dashboard/listings" className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">
                  Vezi toate anunturile →
                </Link>
              </div>

              {listingsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="h-32 rounded-2xl border border-white/10 bg-slate-900/50 animate-pulse" />
                  ))}
                </div>
              ) : listingsError ? (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
                  {listingsError}
                </div>
              ) : recentListings.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-10 text-center">
                  <div className="text-lg font-bold text-white mb-2">Nu ai anunturi active</div>
                  <p className="text-slate-400 mb-6">Publica primul anunt pentru a aparea aici.</p>
                  <Link href="/listings/new">
                    <Button variant="primary">Adauga anunt</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-5">
                  {recentListings.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      id={listing.id}
                      title={listing.title}
                      price={formatPrice(listing)}
                      image={listing.photos?.[0] || listing.imageUrls?.[0]}
                      category={listing.category}
                      location={formatLocation(listing)}
                      description={listing.description}
                      postedAt={formatPostedAt(listing)}
                      verified={Boolean(user?.verified)}
                      featured={Boolean(listing.isFeatured || listing.isPromoted)}
                      seller={{
                        name: sellerName,
                        avatar: sellerInitials,
                        verified: Boolean(user?.verified),
                      }}
                      onClick={() => router.push(`/listings/${listing.id}`)}
                      className="bg-gradient-to-b from-slate-900/80 to-slate-950/70 border border-white/10"
                    />
                  ))}
                </div>
              )}
            </div>
          </Tabs.Content>

          <Tabs.Content value="activity" className="mt-6">
            <Card variant="elevated">
              <Card.Body className="p-6">
                <h3 className="text-lg font-bold text-white mb-4">Activitate recentă</h3>
                <div className="space-y-4">
                  {recentListings.length > 0 ? (
                    <>
                      {recentListings.slice(0, 3).map((listing) => (
                        <div key={listing.id} className="flex items-center text-gray-300 hover:text-white transition-colors">
                          <svg className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span>Ai publicat anunțul "{listing.title}"</span>
                        </div>
                      ))}
                      {stats.messages > 0 && (
                        <div className="flex items-center text-gray-300 hover:text-white transition-colors">
                          <svg className="w-5 h-5 text-amber-400 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                          </svg>
                          <span>Ai primit {stats.messages} {stats.messages === 1 ? 'mesaj nou' : 'mesaje noi'}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-500 text-center py-8">Nicio activitate recentă</p>
                  )}
                </div>
              </Card.Body>
            </Card>
          </Tabs.Content>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
}

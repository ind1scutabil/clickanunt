'use client';
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Link from "next/link";
import { getCsrfToken } from "@/lib/security/csrf-client";

type PromotionType = 'top' | 'urgent' | 'featured' | 'refresh';
type ApplyTo = 'all' | 'new' | 'active' | 'inactive';
type BulkSegment = 'active' | 'inactive' | 'banned' | 'new';
type BulkAction = 'deactivate' | 'activate' | 'grant_discount' | 'grant_free_promos';
type BroadcastSchedule = 'now' | 'later';

type Broadcast = {
  id: string;
  title: string;
  segment: string;
  status: string;
};

type FeatureFlag = {
  key: string;
  enabled: boolean;
};

type User = {
  id: string;
  email: string;
  role: string;
};

type DashboardStats = {
  activeListings: number;
  pendingListings: number;
  registeredUsers: number;
  reportsReceived: number;
};

const SYSTEM_FLAG_KEYS = {
  registrations: 'registrations_enabled',
  newListings: 'listings_enabled',
  payments: 'payments_enabled',
  promotions: 'promotions_enabled',
  maintenanceMode: 'maintenance_mode',
} as const;

export default function AdminDashboard() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [controlTab, setControlTab] = useState<'broadcast' | 'benefits' | 'system' | 'bulk'>('broadcast');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [broadcastForm, setBroadcastForm] = useState({
    title: 'Anunț important',
    message: 'Salut! Avem actualizări importante pe platformă.',
    channels: { email: true, inApp: true, sms: false },
    schedule: 'now' as BroadcastSchedule,
    scheduledAt: ''
  });
  const [benefitsForm, setBenefitsForm] = useState({
    globalDiscount: 10,
    freePromotions: 1,
    promotionType: 'top' as PromotionType,
    creditsBonus: 0,
    applyTo: 'all' as ApplyTo,
    expiryDays: 30
  });
  const [systemToggles, setSystemToggles] = useState({
    registrations: true,
    newListings: true,
    payments: true,
    promotions: true,
    maintenanceMode: false
  });
  const [bulkForm, setBulkForm] = useState({
    segment: 'active' as BulkSegment,
    action: 'deactivate' as BulkAction,
    percent: 10,
    freePromos: 1,
    promotionType: 'top' as PromotionType,
    expiryDays: 30
  });
  const [lastAction, setLastAction] = useState('Nicio acțiune recentă');
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    activeListings: 0,
    pendingListings: 0,
    registeredUsers: 0,
    reportsReceived: 0,
  });
  
  // Broadcast confirmation modal
  const [showBroadcastConfirm, setShowBroadcastConfirm] = useState(false);
  const [broadcastConfirmData, setBroadcastConfirmData] = useState<any>(null);
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);

  // SECURITY: Check authentication and authorization
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        
        // Check if user is authenticated
        const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        if (!userStr) {
          router.push('/auth/login?redirect=/admin/dashboard');
          return;
        }

        const user = JSON.parse(userStr);
        
        // CRITICAL: Only allow admin/owner role
        if (user.role !== 'admin' && user.role !== 'owner') {
          console.error('❌ SECURITY: Unauthorized admin access attempt!', {
            email: user.email,
            role: user.role,
            timestamp: new Date().toISOString()
          });
          router.push('/');
          return;
        }

        setCurrentUser(user);
        setIsAuthorized(true);
        
        // Load admin data
        await loadAdminData();
      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/auth/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const loadAdminData = async () => {
    try {
      const [flagsRes, broadcastsRes, usersRes, pendingQueueRes, reportsRes] = await Promise.all([
        fetch('/api/admin/feature-flags'),
        fetch('/api/admin/broadcasts'),
        fetch('/api/admin/users?limit=1'),
        fetch('/api/admin/moderation/queue?status=pending'),
        fetch('/api/admin/reports?status=pending'),
      ]);

      if (flagsRes.ok) {
        const flagsData = await flagsRes.json();
        const flags = (flagsData.flags || []) as FeatureFlag[];
        const flagMap = new Map(flags.map((flag) => [flag.key, flag.enabled]));
        setSystemToggles({
          registrations: (flagMap.get(SYSTEM_FLAG_KEYS.registrations) as boolean) ?? true,
          newListings: (flagMap.get(SYSTEM_FLAG_KEYS.newListings) as boolean) ?? true,
          payments: (flagMap.get(SYSTEM_FLAG_KEYS.payments) as boolean) ?? true,
          promotions: (flagMap.get(SYSTEM_FLAG_KEYS.promotions) as boolean) ?? true,
          maintenanceMode: (flagMap.get(SYSTEM_FLAG_KEYS.maintenanceMode) as boolean) ?? false,
        });
      }

      if (broadcastsRes.ok) {
        const broadcastsData = await broadcastsRes.json();
        setBroadcasts(broadcastsData.broadcasts || []);
      }

      const nextStats: DashboardStats = {
        activeListings: 0,
        pendingListings: 0,
        registeredUsers: 0,
        reportsReceived: 0,
      };

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        nextStats.registeredUsers = typeof usersData.total === 'number' ? usersData.total : 0;
      }

      if (pendingQueueRes.ok) {
        const pendingQueueData = await pendingQueueRes.json();
        nextStats.pendingListings = Array.isArray(pendingQueueData.items) ? pendingQueueData.items.length : 0;
      }

      if (reportsRes.ok) {
        const reportsData = await reportsRes.json();
        nextStats.reportsReceived = Array.isArray(reportsData.reports) ? reportsData.reports.length : 0;
      }

      setStats(nextStats);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Eroare la încărcarea datelor');
    }
  };

  const handleBroadcast = async () => {
    // Validate before showing confirmation modal
    if (!broadcastForm.title || !broadcastForm.message) {
      setErrorMessage('⚠️ Te rog completează titlul și mesajul înainte de a trimite.');
      return;
    }
    
    // Reset states and show confirmation modal with data
    setErrorMessage('');
    setBroadcastSuccess(false);
    setBroadcastConfirmData({
      title: broadcastForm.title,
      message: broadcastForm.message,
      channels: broadcastForm.channels,
      schedule: broadcastForm.schedule,
      scheduledAt: broadcastForm.scheduledAt,
    });
    setShowBroadcastConfirm(true);
  };

  const sendBroadcastConfirmed = async () => {
    try {
      console.log('🚀 Starting broadcast send...');
      console.log('📋 Broadcast data:', broadcastConfirmData);
      
      // Explicit validation before sending
      if (!broadcastConfirmData?.title || !broadcastConfirmData?.message) {
        const errorMsg = '⚠️ Titlul și mesajul sunt obligatorii. Te rog completează ambele câmpuri.';
        console.error('❌ Validation failed:', { title: broadcastConfirmData?.title, message: broadcastConfirmData?.message });
        setErrorMessage(errorMsg);
        return;
      }
      
      setBroadcastSending(true);
      setErrorMessage('');
      
      console.log('📝 Getting CSRF token...');
      const csrfToken = await getCsrfToken();
      console.log('✅ CSRF token received:', csrfToken?.substring(0, 20) + '...');
      
      const payload = {
        title: broadcastConfirmData.title,
        message: broadcastConfirmData.message,
        channels: broadcastConfirmData.channels,
        segment: 'all',
        schedule: broadcastConfirmData.schedule,
        scheduledAt: broadcastConfirmData.scheduledAt,
      };
      
      console.log('📤 Sending broadcast request with payload:', payload);
      
      const res = await fetch('/api/admin/broadcasts', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify(payload),
      });

      console.log('📥 Response status:', res.status);
      const data = await res.json();
      console.log('📊 Response data:', data);
      
      if (!res.ok) throw new Error(data.error || 'Eroare la trimiterea mesajului');

      const when = data.scheduled ? `Programat: ${broadcastConfirmData.scheduledAt}` : 'Trimis acum';
      setLastAction(`📨 Mesaj global: ${broadcastConfirmData.title} · ${when}`);

      const broadcastsRes = await fetch('/api/admin/broadcasts');
      if (broadcastsRes.ok) {
        const broadcastsData = await broadcastsRes.json();
        setBroadcasts(broadcastsData.broadcasts || []);
      }

      console.log('✅ Broadcast sent successfully!');
      
      // Show success message in modal before closing
      setErrorMessage('');
      setBroadcastSuccess(true);
      setBroadcastSending(false);
      
      // Close modal and reset form after delay to show success
      setTimeout(() => {
        setShowBroadcastConfirm(false);
        setBroadcastConfirmData(null);
        setBroadcastSuccess(false);
        setBroadcastForm({
          title: '',
          message: '',
          channels: { email: true, inApp: true, sms: false },
          schedule: 'now' as BroadcastSchedule,
          scheduledAt: '',
        });
      }, 2500);
      
      return; // Exit early on success
    } catch (error: unknown) {
      console.error('❌ Broadcast error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Eroare la trimiterea mesajului';
      setErrorMessage(errorMsg);
    } finally {
      setBroadcastSending(false);
    }
  };

  const handleApplyBenefits = async () => {
    try {
      setErrorMessage('');
      const csrfToken = await getCsrfToken();
      const res = await fetch('/api/admin/benefits', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          globalDiscount: benefitsForm.globalDiscount,
          freePromotions: benefitsForm.freePromotions,
          promotionType: benefitsForm.promotionType,
          creditsBonus: benefitsForm.creditsBonus,
          applyTo: benefitsForm.applyTo,
          expiryDays: benefitsForm.expiryDays,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Eroare la aplicarea beneficiilor');

      setLastAction(
        `🎁 Beneficii globale aplicate: -${benefitsForm.globalDiscount}% · ${benefitsForm.freePromotions}×${benefitsForm.promotionType} · ${benefitsForm.creditsBonus} credite`
      );
      alert(`✅ Beneficiile au fost aplicate pentru ${data.updated} utilizatori.`);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Eroare la aplicarea beneficiilor');
    }
  };

  const handleBulkAction = async () => {
    try {
      setErrorMessage('');
      const csrfToken = await getCsrfToken();
      const res = await fetch('/api/admin/bulk-users', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          segment: bulkForm.segment,
          action: bulkForm.action,
          percent: bulkForm.percent,
          freePromos: bulkForm.freePromos,
          promotionType: bulkForm.promotionType,
          expiryDays: bulkForm.expiryDays,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Eroare la bulk action');

      setLastAction(`🧩 Bulk: ${bulkForm.action} pentru segmentul ${bulkForm.segment}`);
      alert(`✅ Bulk action executat pentru ${data.updated} utilizatori.`);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Eroare la bulk action');
    }
  };

  const toggleSystem = async (key: keyof typeof systemToggles) => {
    const newValue = !systemToggles[key];
    setSystemToggles({ ...systemToggles, [key]: newValue });

    try {
      setErrorMessage('');
      const csrfToken = await getCsrfToken();
      const res = await fetch('/api/admin/feature-flags', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          key: SYSTEM_FLAG_KEYS[key],
          enabled: newValue,
          description: `System toggle: ${key}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Eroare la actualizarea setărilor');

      setLastAction(`⚙️ Sistem: ${key} -> ${newValue ? 'Activat' : 'Dezactivat'}`);
    } catch (error: unknown) {
      setSystemToggles({ ...systemToggles, [key]: !newValue });
      setErrorMessage(error instanceof Error ? error.message : 'Eroare la actualizarea setărilor');
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-20 pb-12">
        {/* SECURITY: Loading state while checking authentication */}
        {isLoading && !isAuthorized && (
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex items-center justify-center min-h-96">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#6D5BFF] to-[#00D4FF] rounded-full mb-4 animate-spin">
                  <div className="w-14 h-14 bg-gray-900 rounded-full"></div>
                </div>
                <p className="text-gray-400 text-lg">Verificare acces admin...</p>
              </div>
            </div>
          </div>
        )}

        {/* SECURITY: Only render admin panel if authorized */}
        {isAuthorized && !isLoading && (
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-5xl font-black mb-4 bg-gradient-to-r from-[#6D5BFF] via-[#00D4FF] to-[#4E3CFF] bg-clip-text text-transparent">
              📊 Admin Dashboard
            </h1>
            <p className="text-gray-400 text-lg">Gestionare platformă și control total</p>
            <div className="mt-4 p-4 bg-green-900/30 border border-green-500/50 rounded-lg">
              <p className="text-green-400 text-sm">✅ Autentificat ca: <strong>{currentUser?.email}</strong></p>
            </div>
          </div>

          {/* Quick Actions - Enterprise Premium */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            <Link href="/admin/moderation" className="group relative bg-gradient-to-br from-purple-600/95 via-purple-700/90 to-purple-900/95 hover:shadow-2xl hover:shadow-purple-600/40 backdrop-blur-lg rounded-xl p-8 border border-purple-400/30 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 cursor-pointer overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-purple-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10">
                <div className="text-5xl mb-4 transform group-hover:scale-110 transition-transform duration-300">🛡️</div>
                <h3 className="text-xl font-black text-white mb-2">Moderare</h3>
                <p className="text-purple-100 text-sm leading-relaxed">Revizuire anunțuri și gestionare utilizatori</p>
              </div>
            </Link>

            <Link href="/admin/promotions" className="group relative bg-gradient-to-br from-amber-600/95 via-orange-600/90 to-orange-800/95 hover:shadow-2xl hover:shadow-amber-600/40 backdrop-blur-lg rounded-xl p-8 border border-amber-400/30 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 cursor-pointer overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-orange-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10">
                <div className="text-5xl mb-4 transform group-hover:scale-110 transition-transform duration-300">✨</div>
                <h3 className="text-xl font-black text-white mb-2">Promovări</h3>
                <p className="text-amber-100 text-sm leading-relaxed">Gestionare pachete și vizibilitate</p>
              </div>
            </Link>

            <Link href="/admin/invoices" className="group relative bg-gradient-to-br from-pink-600/95 via-rose-600/90 to-pink-800/95 hover:shadow-2xl hover:shadow-pink-600/40 backdrop-blur-lg rounded-xl p-8 border border-pink-400/30 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 cursor-pointer overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-pink-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10">
                <div className="text-5xl mb-4 transform group-hover:scale-110 transition-transform duration-300">💵</div>
                <h3 className="text-xl font-black text-white mb-2">Facturi & Venituri</h3>
                <p className="text-pink-100 text-sm leading-relaxed">Rapoarte ANAF și analize financiare</p>
              </div>
            </Link>

            <Link href="/listings" className="group relative bg-gradient-to-br from-cyan-600/95 via-blue-600/90 to-blue-800/95 hover:shadow-2xl hover:shadow-cyan-600/40 backdrop-blur-lg rounded-xl p-8 border border-cyan-400/30 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 cursor-pointer overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-blue-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10">
                <div className="text-5xl mb-4 transform group-hover:scale-110 transition-transform duration-300">📋</div>
                <h3 className="text-xl font-black text-white mb-2">Anunțuri</h3>
                <p className="text-cyan-100 text-sm leading-relaxed">Catalog complet și gestionare active</p>
              </div>
            </Link>
          </div>

          {/* Stats Cards - Enterprise Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <div className="group relative bg-gradient-to-br from-emerald-500/15 to-green-600/15 backdrop-blur-lg rounded-xl p-6 border border-emerald-400/40 hover:border-emerald-300/60 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/20">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl">✅</span>
                  <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-full">ACTIVE</span>
                </div>
                <div className="text-3xl font-black text-white mb-1">{stats.activeListings}</div>
                <div className="text-emerald-300 text-xs font-semibold tracking-wide">ANUNȚURI ACTIVE</div>
                <div className="mt-3 h-1 bg-emerald-500/20 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-400 to-green-500 transition-all duration-1000" style={{ width: stats.activeListings > 0 ? '100%' : '0%' }} />
                </div>
              </div>
            </div>
            
            <div className="group relative bg-gradient-to-br from-amber-500/15 to-orange-600/15 backdrop-blur-lg rounded-xl p-6 border border-amber-400/40 hover:border-amber-300/60 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/20">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl">⏳</span>
                  <span className="px-2 py-1 bg-amber-500/20 text-amber-300 text-xs font-bold rounded-full">PENDING</span>
                </div>
                <div className="text-3xl font-black text-white mb-1">{stats.pendingListings}</div>
                <div className="text-amber-300 text-xs font-semibold tracking-wide">ÎN AȘTEPTARE</div>
                <div className="mt-3 h-1 bg-amber-500/20 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-1000" style={{ width: stats.pendingListings > 0 ? '100%' : '0%' }} />
                </div>
              </div>
            </div>
            
            <div className="group relative bg-gradient-to-br from-blue-500/15 to-cyan-600/15 backdrop-blur-lg rounded-xl p-6 border border-cyan-400/40 hover:border-cyan-300/60 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/20">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl">👥</span>
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs font-bold rounded-full">USERS</span>
                </div>
                <div className="text-3xl font-black text-white mb-1">{stats.registeredUsers}</div>
                <div className="text-cyan-300 text-xs font-semibold tracking-wide">UTILIZATORI REGISTRAȚI</div>
                <div className="mt-3 h-1 bg-cyan-500/20 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-1000" style={{ width: stats.registeredUsers > 0 ? '100%' : '0%' }} />
                </div>
              </div>
            </div>
            
            <div className="group relative bg-gradient-to-br from-red-500/15 to-pink-600/15 backdrop-blur-lg rounded-xl p-6 border border-red-400/40 hover:border-red-300/60 transition-all duration-300 hover:shadow-xl hover:shadow-red-500/20">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl">⚠️</span>
                  <span className="px-2 py-1 bg-red-500/20 text-red-300 text-xs font-bold rounded-full">ALERTS</span>
                </div>
                <div className="text-3xl font-black text-white mb-1">{stats.reportsReceived}</div>
                <div className="text-red-300 text-xs font-semibold tracking-wide">RAPORTĂRI PRIMITE</div>
                <div className="mt-3 h-1 bg-red-500/20 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-red-400 to-pink-500 transition-all duration-1000" style={{ width: stats.reportsReceived > 0 ? '100%' : '0%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Info Box - Enterprise Welcome */}
          <div className="relative bg-gradient-to-br from-slate-800/80 via-slate-900/80 to-slate-900/90 backdrop-blur-xl rounded-xl p-8 border border-slate-700/50 mb-10 overflow-hidden group hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative z-10">
              <h2 className="text-3xl font-black bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-3">🚀 Control Center Database</h2>
              <p className="text-gray-300 text-base leading-relaxed mb-5">ești conectat ca administrator cu drepturi COMPLETE. Accesul total la toți parametrii platformei, gestionarea utilizatorilor, anunțurilor și configurările de sistem în timp real.</p>
              <div className="grid md:grid-cols-4 gap-3">
                <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/15 transition-colors">
                  <span className="text-lg">✓</span>
                  <div className="text-sm"><div className="font-bold text-emerald-300">Moderare</div><div className="text-xs text-gray-400">Anunțuri & Utilizatori</div></div>
                </div>
                <div className="flex items-center gap-2 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-lg hover:bg-amber-500/15 transition-colors">
                  <span className="text-lg">✓</span>
                  <div className="text-sm"><div className="font-bold text-amber-300">Promovări</div><div className="text-xs text-gray-400">Pachete & Marketing</div></div>
                </div>
                <div className="flex items-center gap-2 px-4 py-3 bg-rose-500/10 border border-rose-500/30 rounded-lg hover:bg-rose-500/15 transition-colors">
                  <span className="text-lg">✓</span>
                  <div className="text-sm"><div className="font-bold text-rose-300">Finanțe</div><div className="text-xs text-gray-400">Facturi & Rapoarte</div></div>
                </div>
                <div className="flex items-center gap-2 px-4 py-3 bg-blue-500/10 border border-blue-500/30 rounded-lg hover:bg-blue-500/15 transition-colors">
                  <span className="text-lg">✓</span>
                  <div className="text-sm"><div className="font-bold text-blue-300">Sistem</div><div className="text-xs text-gray-400">Feature Flags & Config</div></div>
                </div>
              </div>
            </div>
          </div>

          {/* Control Center */}
          <div className="relative bg-gradient-to-br from-slate-800/80 via-slate-900/80 to-slate-900/90 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-cyan-500/5 opacity-0 hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative z-10 p-8 border-b border-slate-700/50">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-3xl font-black bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">🧠 Command Center (Global)</h2>
                  <p className="text-gray-400 text-sm">Broadcast-uri, beneficii globale, bulk actions și control sistem</p>
                </div>
                <div className="px-4 py-3 bg-slate-900/60 border border-slate-700 rounded-lg text-sm text-gray-300 whitespace-nowrap hover:border-blue-500/50 transition-colors">
                  Ultima acțiune: <span className="text-white font-bold text-xs block mt-1 text-blue-300">{lastAction}</span>
                </div>
              </div>

            </div>

            {/* Tabs - Enterprise Style */}
            <div className="flex flex-wrap gap-2 px-8 py-6 border-b border-slate-700/50 bg-slate-900/30">
              <button
                onClick={() => setControlTab('broadcast')}
                className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 flex items-center gap-2 ${
                  controlTab === 'broadcast'
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/30'
                    : 'bg-slate-800/60 text-gray-300 hover:bg-slate-800 hover:text-white border border-slate-700'
                }`}
              >
                📣 Broadcast
              </button>
              <button
                onClick={() => setControlTab('benefits')}
                className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 flex items-center gap-2 ${
                  controlTab === 'benefits'
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/30'
                    : 'bg-slate-800/60 text-gray-300 hover:bg-slate-800 hover:text-white border border-slate-700'
                }`}
              >
                🎁 Beneficii
              </button>
              <button
                onClick={() => setControlTab('system')}
                className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 flex items-center gap-2 ${
                  controlTab === 'system'
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/30'
                    : 'bg-slate-800/60 text-gray-300 hover:bg-slate-800 hover:text-white border border-slate-700'
                }`}
              >
                ⚙️ Sistem
              </button>
              <button
                onClick={() => setControlTab('bulk')}
                className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 flex items-center gap-2 ${
                  controlTab === 'bulk'
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/30'
                    : 'bg-slate-800/60 text-gray-300 hover:bg-slate-800 hover:text-white border border-slate-700'
                }`}
              >
                🧩 Bulk
              </button>
            </div>

            {isLoading && (
              <div className="p-8 text-sm text-gray-400">Se încarcă datele admin...</div>
            )}
            {errorMessage && (
              <div className="m-8 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                {errorMessage}
              </div>
            )}

            <div className="p-8">

            {/* Broadcast */}
            {controlTab === 'broadcast' && (
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-gray-900/50 border border-gray-700 rounded-2xl p-6">
                  <h3 className="text-xl font-black text-white mb-4">📨 Trimite mesaj tuturor</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Titlu</label>
                      <input
                        type="text"
                        value={broadcastForm.title}
                        onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                        className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Mesaj</label>
                      <textarea
                        value={broadcastForm.message}
                        onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                        rows={4}
                        className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-2 text-white"
                      />
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {(['email', 'inApp', 'sms'] as const).map((channel) => (
                        <label key={channel} className="flex items-center gap-2 text-gray-300 cursor-pointer hover:text-white transition-colors select-none">
                          <input
                            type="checkbox"
                            checked={broadcastForm.channels[channel]}
                            onChange={() =>
                              setBroadcastForm({
                                ...broadcastForm,
                                channels: { ...broadcastForm.channels, [channel]: !broadcastForm.channels[channel] }
                              })
                            }
                            className="w-5 h-5 cursor-pointer accent-cyan-500"
                          />
                          {channel === 'inApp' ? 'In-App' : channel.toUpperCase()}
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-3">
                      <select
                        value={broadcastForm.schedule}
                        onChange={(e) => setBroadcastForm({ ...broadcastForm, schedule: e.target.value as 'now' | 'later' })}
                        className="bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-2 text-white"
                      >
                        <option value="now">Trimite acum</option>
                        <option value="later">Programează</option>
                      </select>
                      <input
                        type="datetime-local"
                        value={broadcastForm.scheduledAt}
                        onChange={(e) => setBroadcastForm({ ...broadcastForm, scheduledAt: e.target.value })}
                        className="bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-2 text-white"
                        disabled={broadcastForm.schedule !== 'later'}
                      />
                    </div>
                    <button
                      onClick={handleBroadcast}
                      className="w-full py-3 bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] text-white rounded-xl font-black hover:shadow-2xl hover:shadow-blue-500/50 transition-all"
                    >
                      🚀 Trimite către toți
                    </button>
                  </div>
                </div>

                <div className="bg-gray-900/50 border border-gray-700 rounded-2xl p-6">
                  <h3 className="text-xl font-black text-white mb-4">🧾 Log rapid</h3>
                  <div className="space-y-3 text-gray-300 text-sm">
                    {broadcasts.length === 0 ? (
                      <div className="p-4 bg-gray-800/60 rounded-xl border border-gray-700">Nu există broadcast-uri recente.</div>
                    ) : (
                      broadcasts.slice(0, 4).map((item) => (
                        <div key={item.id} className="p-4 bg-gray-800/60 rounded-xl border border-gray-700">
                          <div className="text-white font-bold">{item.title}</div>
                          <div className="text-gray-400">Segment: {item.segment} · Status: {item.status}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Benefits */}
            {controlTab === 'benefits' && (
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-gray-900/50 border border-gray-700 rounded-2xl p-6">
                  <h3 className="text-xl font-black text-white mb-4">🎁 Promoții & Gratuități globale</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Discount global (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={benefitsForm.globalDiscount}
                        onChange={(e) => setBenefitsForm({ ...benefitsForm, globalDiscount: parseInt(e.target.value) || 0 })}
                        className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-2 text-white"
                      />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Promovări gratuite</label>
                        <input
                          type="number"
                          min={0}
                          value={benefitsForm.freePromotions}
                          onChange={(e) => setBenefitsForm({ ...benefitsForm, freePromotions: parseInt(e.target.value) || 0 })}
                          className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Tip promovare</label>
                        <select
                          value={benefitsForm.promotionType}
                          onChange={(e) => setBenefitsForm({ ...benefitsForm, promotionType: e.target.value as PromotionType })}
                          className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-2 text-white"
                        >
                          <option value="top">🔝 TOP</option>
                          <option value="urgent">🔥 URGENT</option>
                          <option value="featured">✨ Evidențiat</option>
                          <option value="refresh">🔄 Reîmprospătare</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Bonus credite (RON)</label>
                      <input
                        type="number"
                        min={0}
                        value={benefitsForm.creditsBonus}
                        onChange={(e) => setBenefitsForm({ ...benefitsForm, creditsBonus: parseInt(e.target.value) || 0 })}
                        className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Aplică pentru</label>
                      <select
                        value={benefitsForm.applyTo}
                        onChange={(e) => setBenefitsForm({ ...benefitsForm, applyTo: e.target.value as ApplyTo })}
                        className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-2 text-white"
                      >
                        <option value="all">Toți utilizatorii</option>
                        <option value="new">Utilizatori noi</option>
                        <option value="active">Utilizatori activi</option>
                        <option value="inactive">Utilizatori inactivi</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Expirare (zile)</label>
                      <input
                        type="number"
                        min={1}
                        value={benefitsForm.expiryDays}
                        onChange={(e) => setBenefitsForm({ ...benefitsForm, expiryDays: parseInt(e.target.value) || 30 })}
                        className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-2 text-white"
                      />
                    </div>
                    <button
                      onClick={handleApplyBenefits}
                      className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-black hover:shadow-2xl hover:shadow-amber-500/50 transition-all"
                    >
                      ✅ Aplică beneficii
                    </button>
                  </div>
                </div>

                <div className="bg-gray-900/50 border border-gray-700 rounded-2xl p-6">
                  <h3 className="text-xl font-black text-white mb-4">📌 Rezumat beneficii</h3>
                  <div className="space-y-3 text-gray-300 text-sm">
                    <div className="p-4 bg-gray-800/60 rounded-xl border border-gray-700">Discount global: <span className="text-white font-bold">-{benefitsForm.globalDiscount}%</span></div>
                    <div className="p-4 bg-gray-800/60 rounded-xl border border-gray-700">Promovări gratuite: <span className="text-white font-bold">{benefitsForm.freePromotions} × {benefitsForm.promotionType}</span></div>
                    <div className="p-4 bg-gray-800/60 rounded-xl border border-gray-700">Bonus credite: <span className="text-white font-bold">{benefitsForm.creditsBonus} RON</span></div>
                    <div className="p-4 bg-gray-800/60 rounded-xl border border-gray-700">Segment: <span className="text-white font-bold">{benefitsForm.applyTo}</span></div>
                    <div className="p-4 bg-gray-800/60 rounded-xl border border-gray-700">Expirare: <span className="text-white font-bold">{benefitsForm.expiryDays} zile</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* System Toggles */}
            {controlTab === 'system' && (
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-gray-900/50 border border-gray-700 rounded-2xl p-6">
                  <h3 className="text-xl font-black text-white mb-4">⚙️ Toggle sistem</h3>
                  <div className="space-y-4">
                    {([
                      { key: 'registrations', label: 'Înregistrări noi' },
                      { key: 'newListings', label: 'Anunțuri noi' },
                      { key: 'payments', label: 'Plăți' },
                      { key: 'promotions', label: 'Promovări' },
                      { key: 'maintenanceMode', label: 'Mod mentenanță' }
                    ] as const).map((item) => (
                      <div key={item.key} className="flex items-center justify-between bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-3">
                        <span className="text-gray-200 font-bold">{item.label}</span>
                        <button
                          onClick={() => toggleSystem(item.key)}
                          className={`px-4 py-2 rounded-lg font-bold transition-all ${
                            systemToggles[item.key]
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {systemToggles[item.key] ? '✅ Activ' : '⛔ Oprit'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-900/50 border border-gray-700 rounded-2xl p-6">
                  <h3 className="text-xl font-black text-white mb-4">🔒 Acces & protecție</h3>
                  <div className="space-y-3 text-gray-300 text-sm">
                    <div className="p-4 bg-gray-800/60 rounded-xl border border-gray-700">Rate limiting: <span className="text-green-400 font-bold">Activ</span></div>
                    <div className="p-4 bg-gray-800/60 rounded-xl border border-gray-700">Anti-fraud: <span className="text-green-400 font-bold">Activ</span></div>
                    <div className="p-4 bg-gray-800/60 rounded-xl border border-gray-700">Audit log: <span className="text-green-400 font-bold">Activ</span></div>
                    <div className="p-4 bg-gray-800/60 rounded-xl border border-gray-700">Sesiuni admin: <span className="text-white font-bold">3 active</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* Bulk Actions */}
            {controlTab === 'bulk' && (
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-gray-900/50 border border-gray-700 rounded-2xl p-6">
                  <h3 className="text-xl font-black text-white mb-4">🧩 Acțiuni în masă</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Segment utilizatori</label>
                      <select
                        value={bulkForm.segment}
                        onChange={(e) => setBulkForm({ ...bulkForm, segment: e.target.value as BulkSegment })}
                        className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-2 text-white"
                      >
                        <option value="active">Activi</option>
                        <option value="inactive">Inactivi</option>
                        <option value="new">Noi</option>
                        <option value="banned">Banați</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Acțiune</label>
                      <select
                        value={bulkForm.action}
                        onChange={(e) => setBulkForm({ ...bulkForm, action: e.target.value as BulkAction })}
                        className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-2 text-white"
                      >
                        <option value="deactivate">Dezactivează conturi</option>
                        <option value="activate">Activează conturi</option>
                        <option value="grant_discount">Acordă discount (%)</option>
                        <option value="grant_free_promos">Acordă promovări gratuite</option>
                      </select>
                    </div>

                    {(bulkForm.action === 'grant_discount') && (
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Procent discount</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={bulkForm.percent}
                          onChange={(e) => setBulkForm({ ...bulkForm, percent: parseInt(e.target.value) || 0 })}
                          className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-2 text-white"
                        />
                      </div>
                    )}

                    {(bulkForm.action === 'grant_free_promos') && (
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Promovări gratuite</label>
                        <input
                          type="number"
                          min={0}
                          value={bulkForm.freePromos}
                          onChange={(e) => setBulkForm({ ...bulkForm, freePromos: parseInt(e.target.value) || 0 })}
                          className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-2 text-white"
                        />
                      </div>
                    )}

                    {(bulkForm.action === 'grant_free_promos') && (
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Tip promovare</label>
                        <select
                          value={bulkForm.promotionType}
                          onChange={(e) => setBulkForm({ ...bulkForm, promotionType: e.target.value as PromotionType })}
                          className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-2 text-white"
                        >
                          <option value="top">🔝 TOP</option>
                          <option value="urgent">🔥 URGENT</option>
                          <option value="featured">✨ Evidențiat</option>
                          <option value="refresh">🔄 Reîmprospătare</option>
                        </select>
                      </div>
                    )}

                    {(bulkForm.action === 'grant_free_promos') && (
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Expirare (zile)</label>
                        <input
                          type="number"
                          min={1}
                          value={bulkForm.expiryDays}
                          onChange={(e) => setBulkForm({ ...bulkForm, expiryDays: parseInt(e.target.value) || 30 })}
                          className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-2 text-white"
                        />
                      </div>
                    )}

                    <button
                      onClick={handleBulkAction}
                      className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl font-black hover:shadow-2xl hover:shadow-purple-500/50 transition-all"
                    >
                      ⚡ Execută bulk
                    </button>
                  </div>
                </div>

                <div className="bg-gray-900/50 border border-gray-700 rounded-2xl p-6">
                  <h3 className="text-xl font-black text-white mb-4">📦 Rezultate estimate</h3>
                  <div className="space-y-3 text-gray-300 text-sm">
                    <div className="p-4 bg-gray-800/60 rounded-xl border border-gray-700">Segment: <span className="text-white font-bold">{bulkForm.segment}</span></div>
                    <div className="p-4 bg-gray-800/60 rounded-xl border border-gray-700">Acțiune: <span className="text-white font-bold">{bulkForm.action}</span></div>
                    {bulkForm.action === 'grant_discount' && (
                      <div className="p-4 bg-gray-800/60 rounded-xl border border-gray-700">Discount: <span className="text-white font-bold">-{bulkForm.percent}%</span></div>
                    )}
                    {bulkForm.action === 'grant_free_promos' && (
                      <div className="p-4 bg-gray-800/60 rounded-xl border border-gray-700">Promovări: <span className="text-white font-bold">{bulkForm.freePromos} × {bulkForm.promotionType}</span></div>
                    )}
                    <div className="p-4 bg-gray-800/60 rounded-xl border border-gray-700">Impact estimat: <span className="text-white font-bold">~1,250 utilizatori</span></div>
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
        )}

        {/* SECURITY: Unauthorized state */}
        {!isAuthorized && !isLoading && (
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="text-center min-h-96 flex items-center justify-center">
              <div className="bg-red-900/30 border border-red-500/50 rounded-2xl p-8">
                <p className="text-red-400 text-xl font-bold">🔒 Acces respins</p>
                <p className="text-gray-400 mt-2">Nu ai permisiunea să accesezi admin dashboard.</p>
              </div>
            </div>
          </div>
        )}

        {/* Broadcast Confirmation Modal */}
        {showBroadcastConfirm && broadcastConfirmData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl p-8 max-w-2xl w-full border border-cyan-400/30 shadow-2xl shadow-cyan-500/20">
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center text-white text-xl font-bold">
                  ⚠️
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white">Confirmare Trimitere Mesaj</h2>
                  <p className="text-gray-400 text-sm">Revizuiește detaliile înainte de a trimite la toți utilizatorii</p>
                </div>
              </div>

              {/* Content - Editable */}
              <div className="space-y-4 mb-8 bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
                <div className="border-l-4 border-cyan-400 pl-4">
                  <label className="text-gray-400 text-sm block mb-2">Titlu</label>
                  <input
                    type="text"
                    value={broadcastConfirmData.title}
                    onChange={(e) => setBroadcastConfirmData({ ...broadcastConfirmData, title: e.target.value })}
                    className="w-full bg-gray-900/50 border border-gray-600 rounded-lg px-4 py-2 text-white font-bold text-lg focus:outline-none focus:border-cyan-400 transition-colors"
                    placeholder="Titlu mesaj..."
                  />
                </div>
                
                <div className="border-l-4 border-blue-400 pl-4">
                  <label className="text-gray-400 text-sm block mb-2">Mesaj</label>
                  <textarea
                    value={broadcastConfirmData.message}
                    onChange={(e) => setBroadcastConfirmData({ ...broadcastConfirmData, message: e.target.value })}
                    rows={4}
                    className="w-full bg-gray-900/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-400 transition-colors resize-none"
                    placeholder="Conținut mesaj..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-700">
                  <div>
                    <p className="text-gray-400 text-sm mb-2">📢 Canale</p>
                    <div className="flex flex-wrap gap-2">
                      {broadcastConfirmData.channels.email && (
                        <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-bold">📧 EMAIL</span>
                      )}
                      {broadcastConfirmData.channels.inApp && (
                        <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg text-xs font-bold">📱 IN-APP</span>
                      )}
                      {broadcastConfirmData.channels.sms && (
                        <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-xs font-bold">💬 SMS</span>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-gray-400 text-sm mb-2">⏰ Program</p>
                    <div className="px-3 py-2 bg-gray-900/50 rounded-lg border border-gray-700">
                      {broadcastConfirmData.schedule === 'now' ? (
                        <p className="text-green-400 font-bold">🚀 Trimite acum</p>
                      ) : (
                        <p className="text-yellow-400 font-bold">📅 {broadcastConfirmData.scheduledAt}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div className="mb-8 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                <p className="text-yellow-300 text-sm">
                  <strong>⚠️ Observație:</strong> Mesajul va fi trimis la TOȚI utilizatorii (activi, inactivi, noi). Această acțiune nu poate fi anulată.
                </p>
              </div>

              {/* Success Display */}
              {broadcastSuccess && (
                <div className="mb-4 p-6 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-400/50 rounded-2xl animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-2xl">✓</span>
                    </div>
                    <div>
                      <p className="text-green-300 font-black text-lg">
                        🎉 Mesaj trimis cu succes!
                      </p>
                      <p className="text-green-400/80 text-sm">
                        Mesajul a fost programat pentru livrare la toți utilizatorii
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {errorMessage && !broadcastSuccess && (
                <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <p className="text-red-300 text-sm">
                    <strong>❌ Eroare:</strong> {errorMessage}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                {!broadcastSuccess ? (
                  <>
                    <button
                      onClick={() => {
                        setShowBroadcastConfirm(false);
                        setBroadcastConfirmData(null);
                        setErrorMessage('');
                      }}
                      disabled={broadcastSending}
                      className="flex-1 px-6 py-3 bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-gray-600"
                    >
                      ❌ Anulează
                    </button>
                    <button
                      onClick={sendBroadcastConfirmed}
                      disabled={broadcastSending || !broadcastConfirmData.title || !broadcastConfirmData.message}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:shadow-lg hover:shadow-green-500/50 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {broadcastSending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Se trimite...
                        </>
                      ) : (
                        <>✅ Confirmă & Trimite</>
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setShowBroadcastConfirm(false);
                      setBroadcastConfirmData(null);
                      setBroadcastSuccess(false);
                      setErrorMessage('');
                    }}
                    className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:shadow-lg hover:shadow-cyan-500/50 text-white rounded-xl font-bold transition-all"
                  >
                    ✓ Închide
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

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
      const [flagsRes, broadcastsRes] = await Promise.all([
        fetch('/api/admin/feature-flags'),
        fetch('/api/admin/broadcasts'),
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
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Eroare la încărcarea datelor');
    }
  };

  const handleBroadcast = async () => {
    try {
      setErrorMessage('');
      const csrfToken = await getCsrfToken();
      const res = await fetch('/api/admin/broadcasts', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          title: broadcastForm.title,
          message: broadcastForm.message,
          channels: broadcastForm.channels,
          segment: 'all',
          schedule: broadcastForm.schedule,
          scheduledAt: broadcastForm.scheduledAt,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Eroare la trimiterea mesajului');

      const when = data.scheduled ? `Programat: ${broadcastForm.scheduledAt}` : 'Trimis acum';
      setLastAction(`📨 Mesaj global: ${broadcastForm.title} · ${when}`);

      const broadcastsRes = await fetch('/api/admin/broadcasts');
      if (broadcastsRes.ok) {
        const broadcastsData = await broadcastsRes.json();
        setBroadcasts(broadcastsData.broadcasts || []);
      }

      alert('✅ Mesajul a fost trimis cu succes.');
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Eroare la trimiterea mesajului');
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

          {/* Quick Actions */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Link href="/admin/moderation" className="bg-gradient-to-br from-purple-600 to-purple-900 hover:shadow-2xl hover:shadow-purple-500/50 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30 transition-all transform hover:scale-105 cursor-pointer">
              <div className="text-4xl mb-3">🛡️</div>
              <h3 className="text-2xl font-black text-white mb-2">Moderare</h3>
              <p className="text-purple-200">Revizuire anunțuri și gestionare utilizatori</p>
            </Link>

            <Link href="/admin/promotions" className="bg-gradient-to-br from-yellow-600 to-orange-900 hover:shadow-2xl hover:shadow-yellow-500/50 backdrop-blur-xl rounded-2xl p-6 border border-yellow-500/30 transition-all transform hover:scale-105 cursor-pointer">
              <div className="text-4xl mb-3">💎</div>
              <h3 className="text-2xl font-black text-white mb-2">Promovări</h3>
              <p className="text-yellow-200">Gestionare pachete și promovări</p>
            </Link>

            <Link href="/admin/invoices" className="bg-gradient-to-br from-purple-600 to-pink-900 hover:shadow-2xl hover:shadow-purple-500/50 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30 transition-all transform hover:scale-105 cursor-pointer">
              <div className="text-4xl mb-3">💰</div>
              <h3 className="text-2xl font-black text-white mb-2">Facturi & Venituri</h3>
              <p className="text-purple-200">Descarcă facturi și rapoarte ANAF</p>
            </Link>

            <Link href="/listings" className="bg-gradient-to-br from-blue-600 to-cyan-900 hover:shadow-2xl hover:shadow-blue-500/50 backdrop-blur-xl rounded-2xl p-6 border border-blue-500/30 transition-all transform hover:scale-105 cursor-pointer">
              <div className="text-4xl mb-3">📝</div>
              <h3 className="text-2xl font-black text-white mb-2">Anunțuri</h3>
              <p className="text-blue-200">Vizualizare și gestionare anunțuri</p>
            </Link>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 backdrop-blur-xl rounded-2xl p-6 border border-green-500/30">
              <div className="text-3xl mb-2">✅</div>
              <div className="text-2xl font-black text-white">0</div>
              <div className="text-green-400 text-sm">Anunțuri Active</div>
            </div>
            
            <div className="bg-gradient-to-br from-yellow-500/20 to-orange-600/20 backdrop-blur-xl rounded-2xl p-6 border border-yellow-500/30">
              <div className="text-3xl mb-2">⏳</div>
              <div className="text-2xl font-black text-white">0</div>
              <div className="text-yellow-400 text-sm">În Așteptare</div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-500/20 to-cyan-600/20 backdrop-blur-xl rounded-2xl p-6 border border-blue-500/30">
              <div className="text-3xl mb-2">👥</div>
              <div className="text-2xl font-black text-white">1</div>
              <div className="text-blue-400 text-sm">Utilizatori</div>
            </div>
            
            <div className="bg-gradient-to-br from-red-500/20 to-pink-600/20 backdrop-blur-xl rounded-2xl p-6 border border-red-500/30">
              <div className="text-3xl mb-2">📊</div>
              <div className="text-2xl font-black text-white">0</div>
              <div className="text-red-400 text-sm">Raportări</div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-2xl p-8 border border-gray-700/50">
            <h2 className="text-2xl font-black text-white mb-4">🚀 Bine venit în Admin Panel</h2>
            <p className="text-gray-300 mb-4">Ești conectat cu drepturi de administrator complet. Poți gestiona anunțuri, utilizatori, promovări și vedea rapoarte detaliate.</p>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-400">
              <div>✓ Revizuire și aprobare anunțuri</div>
              <div>✓ Gestionare utilizatori și bani</div>
              <div>✓ Gestionare promovări</div>
              <div>✓ Vizualizare rapoarte și statistici</div>
            </div>
          </div>

          {/* Control Center */}
          <div className="mt-10 bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-2xl p-8 border border-gray-700/50">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-3xl font-black text-white">🧠 Control Center (Total)</h2>
                <p className="text-gray-400">Promoții globale, gratuități, mesaje și comenzi de sistem</p>
              </div>
              <div className="px-4 py-2 bg-gray-900/60 border border-gray-700 rounded-xl text-sm text-gray-300">
                Ultima acțiune: <span className="text-white font-bold">{lastAction}</span>
              </div>
            </div>

            {isLoading && (
              <div className="mb-6 text-sm text-gray-400">Se încarcă datele admin...</div>
            )}
            {errorMessage && (
              <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
                {errorMessage}
              </div>
            )}

            {/* Tabs */}
            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={() => setControlTab('broadcast')}
                className={`px-4 py-2 rounded-xl font-bold transition-all ${
                  controlTab === 'broadcast'
                    ? 'bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] text-white'
                    : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/60'
                }`}
              >
                📣 Mesaje globale
              </button>
              <button
                onClick={() => setControlTab('benefits')}
                className={`px-4 py-2 rounded-xl font-bold transition-all ${
                  controlTab === 'benefits'
                    ? 'bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] text-white'
                    : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/60'
                }`}
              >
                🎁 Beneficii & Gratuități
              </button>
              <button
                onClick={() => setControlTab('system')}
                className={`px-4 py-2 rounded-xl font-bold transition-all ${
                  controlTab === 'system'
                    ? 'bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] text-white'
                    : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/60'
                }`}
              >
                ⚙️ Sistem & Activări
              </button>
              <button
                onClick={() => setControlTab('bulk')}
                className={`px-4 py-2 rounded-xl font-bold transition-all ${
                  controlTab === 'bulk'
                    ? 'bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] text-white'
                    : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/60'
                }`}
              >
                🧩 Bulk Actions
              </button>
            </div>

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
                        <label key={channel} className="flex items-center gap-2 text-gray-300">
                          <input
                            type="checkbox"
                            checked={broadcastForm.channels[channel]}
                            onChange={() =>
                              setBroadcastForm({
                                ...broadcastForm,
                                channels: { ...broadcastForm.channels, [channel]: !broadcastForm.channels[channel] }
                              })
                            }
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
      </main>
    </>
  );
}

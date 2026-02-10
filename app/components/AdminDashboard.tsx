"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function load() {
    setLoading(true);
    setError(null);
    try {
      // Cookie-urile HTTP-only sunt trimise automat de browser
      const res = await fetch('/api/listings', { 
        credentials: 'include' // Important pentru cookie-uri
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          setError('Nu ești autentificat. Redirecționare la login...');
          setTimeout(() => router.push('/auth/login'), 2000);
          return;
        }
        throw new Error(`Failed to load listings: ${res.status}`);
      }
      
      const data = await res.json();
      // Asigură-te că listings este întotdeauna un array
      const listingsArray = Array.isArray(data) ? data : (data.listings || []);
      setListings(listingsArray);
    } catch (err: any) {
      setError(err.message || 'Eroare la încărcarea listingurilor');
      setListings([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function del(id: string) {
    if (!confirm('Ștergi acest listing?')) return;
    
    try {
      // Cookie-urile HTTP-only sunt trimise automat
      const res = await fetch(`/api/listings/${id}`, { 
        method: 'DELETE',
        credentials: 'include' // Important pentru cookie-uri
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          alert('Nu ești autentificat');
          router.push('/auth/login');
          return;
        }
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      
      alert('Listing șters cu succes');
      load();
    } catch (err: any) {
      alert(`Eroare: ${err.message}`);
    }
  }

  async function initiatePayment(listing: any) {
    try {
      // Prompt user to select package
      const packageType = prompt(
        'Selectează pachet:\n' +
        '1. featured_7_days (29 RON)\n' +
        '2. featured_30_days (99 RON)\n' +
        '3. top_position_1_day (15 RON)\n' +
        '4. homepage_banner_7_days (149 RON)\n\n' +
        'Introdu numărul (1-4):'
      );

      const packages: Record<string, string> = {
        '1': 'featured_7_days',
        '2': 'featured_30_days',
        '3': 'top_position_1_day',
        '4': 'homepage_banner_7_days',
      };

      const selectedPackage = packages[packageType || ''];
      if (!selectedPackage) {
        alert('Pachet invalid');
        return;
      }

      const res = await fetch('/api/payments', { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Cookie-uri HTTP-only
        body: JSON.stringify({ 
          listingId: listing.id, 
          packageType: selectedPackage 
        }) 
      });

      if (!res.ok) {
        if (res.status === 401) {
          alert('Nu ești autentificat. Redirecționare la login...');
          router.push('/auth/login');
          return;
        }
        const data = await res.json();
        throw new Error(data.error || 'Failed to create payment');
      }

      const data = await res.json();
      
      alert(
        `Payment Intent creat cu succes!\n\n` +
        `Payment ID: ${data.paymentId}\n` +
        `Amount: ${data.amount / 100} ${data.currency}\n` +
        `Package: ${data.packageType}\n\n` +
        `Client Secret: ${data.clientSecret}\n\n` +
        `Utilizează acest client secret în Stripe Elements pentru plată.`
      );
      
      // TODO: Redirect to payment page with clientSecret
      // router.push(`/payment/${data.paymentId}?clientSecret=${data.clientSecret}`);
    } catch (err: any) {
      alert(`Eroare plată: ${err.message}`);
    }
  }

  if (error) {
    return (
      <div style={{ padding: 20 }}>
        <h2 style={{ color: 'red' }}>Eroare</h2>
        <p>{error}</p>
        <button onClick={load}>Încearcă din nou</button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header with Reload Button */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-white">📊 Anunțuri Platforma</h2>
        <button 
          onClick={load} 
          disabled={loading}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50"
        >
          {loading ? '⏳ Se încarcă...' : '🔄 Reîncarcă'}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
          <p className="text-red-400 font-bold">❌ {error}</p>
          <button 
            onClick={load}
            className="mt-2 px-4 py-2 bg-red-500/30 hover:bg-red-500/40 text-red-300 rounded-lg font-bold transition-all"
          >
            Încearcă din nou
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && !listings.length ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Se încarcă listingurile...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Stats Card */}
          <div className="bg-gradient-to-r from-blue-500/20 to-cyan-600/20 rounded-2xl p-6 border border-blue-500/30 mb-6">
            <div className="text-3xl font-black text-white mb-2">📝 {listings.length}</div>
            <div className="text-blue-400 text-sm">Total anunțuri în sistem</div>
          </div>

          {/* Listings Table */}
          {listings.length === 0 ? (
            <div className="text-center py-12 bg-gray-800/50 rounded-2xl border border-gray-700/50">
              <div className="text-5xl mb-4">📭</div>
              <p className="text-gray-400 text-lg">Nu sunt anunțuri în sistem</p>
            </div>
          ) : (
            <div className="overflow-x-auto bg-gray-800/50 rounded-2xl border border-gray-700/50">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-800 to-gray-900 border-b border-gray-700">
                    <th className="px-6 py-4 text-left text-white font-black text-sm">📌 Titlu</th>
                    <th className="px-6 py-4 text-left text-white font-black text-sm">🚗 Model</th>
                    <th className="px-6 py-4 text-left text-white font-black text-sm">💰 Preț</th>
                    <th className="px-6 py-4 text-left text-white font-black text-sm">✅ Status</th>
                    <th className="px-6 py-4 text-left text-white font-black text-sm">🛡️ Moderație</th>
                    <th className="px-6 py-4 text-left text-white font-black text-sm">⚙️ Acțiuni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {listings.map(l => (
                    <tr key={l.id} className="hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 text-white font-bold">{l.title}</td>
                      <td className="px-6 py-4 text-gray-300">{l.make} {l.model}</td>
                      <td className="px-6 py-4 text-white font-bold">{l.priceAmount} {l.priceCurrency}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          l.status === 'active' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {l.status === 'active' ? '✓ Activ' : '⏳ ' + l.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          l.moderationStatus === 'approved'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {l.moderationStatus ? '✓ ' + l.moderationStatus : 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 flex gap-2">
                        <button 
                          onClick={() => initiatePayment(l)}
                          className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg font-bold text-sm hover:shadow-lg transition-all"
                        >
                          💳 Promovează
                        </button>
                        <button 
                          onClick={() => del(l.id)}
                          className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg font-bold text-sm hover:bg-red-500/30 transition-all"
                        >
                          🗑️ Șterge
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

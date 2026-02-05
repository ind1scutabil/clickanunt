"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Get auth token from localStorage
  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('authToken');
    }
    return null;
  };

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/listings', { headers });
      
      if (!res.ok) {
        if (res.status === 401) {
          setError('Nu ești autentificat. Redirecționare la login...');
          setTimeout(() => router.push('/auth/login'), 2000);
          return;
        }
        throw new Error(`Failed to load listings: ${res.status}`);
      }
      
      const data = await res.json();
      setListings(data.listings || data || []);
    } catch (err: any) {
      setError(err.message || 'Eroare la încărcarea listingurilor');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function del(id: string) {
    if (!confirm('Ștergi acest listing?')) return;
    
    try {
      const token = getAuthToken();
      if (!token) {
        alert('Nu ești autentificat');
        router.push('/auth/login');
        return;
      }

      const res = await fetch(`/api/listings/${id}`, { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      
      if (!res.ok) {
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
      const token = getAuthToken();
      if (!token) {
        alert('Nu ești autentificat. Redirecționare la login...');
        router.push('/auth/login');
        return;
      }

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
          'Authorization': `Bearer ${token}`,
        }, 
        body: JSON.stringify({ 
          listingId: listing.id, 
          packageType: selectedPackage 
        }) 
      });

      if (!res.ok) {
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
    <div style={{ padding: 20 }}>
      <h2>Admin Dashboard</h2>
      <button onClick={load} disabled={loading} style={{ marginBottom: 10 }}>
        {loading ? 'Se încarcă...' : 'Reîncarcă'}
      </button>
      
      {loading ? (
        <div>Se încarcă listingurile...</div>
      ) : (
        <>
          <p>Total listings: {listings.length}</p>
          <table border={1} cellPadding={8} style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Make/Model</th>
                <th>Price</th>
                <th>Status</th>
                <th>Moderation</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {listings.map(l => (
                <tr key={l.id}>
                  <td>{l.title}</td>
                  <td>{l.make} {l.model}</td>
                  <td>{l.priceAmount} {l.priceCurrency}</td>
                  <td>{l.status}</td>
                  <td>{l.moderationStatus || 'N/A'}</td>
                  <td>
                    <button 
                      onClick={() => initiatePayment(l)}
                      style={{ marginRight: 5 }}
                    >
                      💳 Promovează
                    </button>
                    <button 
                      onClick={() => del(l.id)}
                      style={{ backgroundColor: '#dc3545', color: 'white' }}
                    >
                      🗑️ Șterge
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

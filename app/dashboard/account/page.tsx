"use client";
import { useEffect, useState } from "react";
import { getCsrfToken } from "@/lib/security/csrf-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";

export default function AccountPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "password" | "email" | "benefits">("profile");
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Profile form
  const [profileData, setProfileData] = useState({
    name: "",
    phone: "",
  });

  // Password form
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('accessToken');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      router.push('/auth/login?redirect=/dashboard/account');
      return;
    }

    const parsed = JSON.parse(userData);
    setUser(parsed);
    setProfileData({
      name: parsed.name || "",
      phone: parsed.phone || "",
    });
    setIsLoading(false);
  }, [router]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    try {
      const token = localStorage.getItem('accessToken');
      const csrfToken = await getCsrfToken();
      if (!csrfToken) {
        setMessage({ type: 'error', text: 'CSRF token nu a putut fi obținut' });
        return;
      }
      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify(profileData),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'Eroare la actualizare' });
        return;
      }

      // Update localStorage
      const updated = { ...user, ...profileData };
      localStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
      setMessage({ type: 'success', text: 'Profil actualizat cu succes!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Eroare la salvare' });
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Parolele nu se potrivesc' });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Parola trebuie să aibă cel puțin 8 caractere' });
      return;
    }

    if (!passwordData.currentPassword) {
      setMessage({ type: 'error', text: 'Introdu parola actuală' });
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setMessage({ type: 'error', text: 'Nu ești autentificat' });
        return;
      }

      const csrfToken = await getCsrfToken();
      if (!csrfToken) {
        setMessage({ type: 'error', text: 'CSRF token nu a putut fi obținut' });
        return;
      }

      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
          confirmPassword: passwordData.confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Password change error:', data);
        setMessage({ type: 'error', text: data.error || 'Eroare la schimbare' });
        return;
      }

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setMessage({ type: 'success', text: 'Parola schimbată cu succes!' });
    } catch (err) {
      console.error('Password change exception:', err);
      setMessage({ type: 'error', text: 'Eroare la salvare' });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#FF7900] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Se încarcă...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F17] relative overflow-hidden text-white">
      {/* Background decoration (enterprise look) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 left-1/3 w-[32rem] h-[32rem] bg-cyan-500/10 rounded-full blur-[140px]"></div>
        <div className="absolute bottom-0 right-1/4 w-[28rem] h-[28rem] bg-emerald-500/10 rounded-full blur-[140px]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.05),_transparent_40%)]"></div>
      </div>
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-12 relative z-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-black mb-4">
            <span className="text-white">Setări </span>
            <span className="neon-text bg-clip-text text-transparent bg-gradient-to-r from-[#FF7900] to-[#FFB84D]">
              cont
            </span>
          </h1>
          <p className="text-gray-400 text-lg">
            Gestionează informațiile și setările contului tău
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl ${message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="glass-dark rounded-2xl border-2 border-[#2A2A2A] overflow-hidden mb-8">
          <div className="flex border-b border-[#2A2A2A]">
            {(['profile', 'password', 'email', 'benefits'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-6 py-4 font-bold transition ${
                  activeTab === tab
                    ? 'bg-[#FF7900] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab === 'profile' && 'Profil'}
                {tab === 'password' && 'Parolă'}
                {tab === 'email' && 'Email'}
                {tab === 'benefits' && '✨ Beneficii'}
              </button>
            ))}
          </div>

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="p-8">
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-400 mb-2">Nume complet</label>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border-2 border-[#2A2A2A] rounded-xl text-white placeholder-gray-600 focus:border-[#FF7900] outline-none transition"
                    placeholder="Numele tău"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-400 mb-2">Telefon</label>
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border-2 border-[#2A2A2A] rounded-xl text-white placeholder-gray-600 focus:border-[#FF7900] outline-none transition"
                    placeholder="+40 123 456 789"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-400 mb-2">Email</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-4 py-3 bg-[#1A1A1A] border-2 border-[#2A2A2A] rounded-xl text-gray-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-2">Pentru a schimba email-ul, contactează suportul</p>
                </div>

                <button
                  type="submit"
                  className="w-full px-6 py-3 bg-gradient-to-r from-[#FF7900] to-[#E66D00] rounded-xl font-black text-white hover:shadow-lg hover:shadow-[#FF7900]/50 transition"
                >
                  Salvează modificări
                </button>
              </form>
            </div>
          )}

          {/* Password Tab */}
          {activeTab === 'password' && (
            <div className="p-8">
              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-400 mb-2">Parola actuală</label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border-2 border-[#2A2A2A] rounded-xl text-white placeholder-gray-600 focus:border-[#FF7900] outline-none transition"
                    placeholder="Introdu parola actuală"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-400 mb-2">Parola nouă</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border-2 border-[#2A2A2A] rounded-xl text-white placeholder-gray-600 focus:border-[#FF7900] outline-none transition"
                    placeholder="Introdu parola nouă"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-2">Minim 8 caractere</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-400 mb-2">Confirmă parola nouă</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border-2 border-[#2A2A2A] rounded-xl text-white placeholder-gray-600 focus:border-[#FF7900] outline-none transition"
                    placeholder="Confirmă parola nouă"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full px-6 py-3 bg-gradient-to-r from-[#FF7900] to-[#E66D00] rounded-xl font-black text-white hover:shadow-lg hover:shadow-[#FF7900]/50 transition"
                >
                  Schimbă parola
                </button>
              </form>
            </div>
          )}

          {/* Email Tab */}
          {activeTab === 'email' && (
            <div className="p-8">
              <div className="space-y-4">
                <p className="text-gray-400">Email actual: <span className="text-white font-bold">{user?.email}</span></p>
                <p className="text-gray-500 text-sm">
                  Pentru a schimba adresa de email, contactează suportul nostru la <a href="mailto:support@clickanunt.ro" className="text-[#FF7900] hover:text-[#FFB84D]">support@clickanunt.ro</a>
                </p>
              </div>
            </div>
          )}

          {/* Benefits Tab */}
          {activeTab === 'benefits' && (
            <div className="p-8">
              <div className="mb-8">
                <h3 className="text-2xl font-black text-white mb-2">Beneficii Active</h3>
                <p className="text-gray-400">Beneficiile tale curente și privilegiile exclusive</p>
              </div>

              {user?.credits !== undefined && (
                <div className="mb-6 p-6 bg-gradient-to-br from-purple-600/10 via-purple-500/5 to-transparent backdrop-blur-xl border border-purple-500/20 rounded-3xl hover:border-purple-500/40 transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-purple-300 text-sm font-medium mb-1">Credite disponibile</p>
                      <div className="text-5xl font-black text-white">{user.credits || 0}</div>
                      <p className="text-purple-300/70 text-sm mt-2">Folosiți pentru anunțuri premium și alte servicii</p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg shadow-purple-500/30">
                      <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}

              {/* Premium Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Feature 1: Priority Support */}
                <div className="p-5 bg-gradient-to-br from-blue-600/10 via-blue-500/5 to-transparent backdrop-blur-xl border border-blue-500/20 rounded-2xl hover:border-blue-500/40 transition-all hover:shadow-lg hover:shadow-blue-500/10">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg shadow-blue-500/30 flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">Suport prioritar</h4>
                      <p className="text-blue-300/70 text-xs">Răspuns rapid la orice întrebare</p>
                    </div>
                  </div>
                </div>

                {/* Feature 2: Higher Visibility */}
                <div className="p-5 bg-gradient-to-br from-amber-600/10 via-amber-500/5 to-transparent backdrop-blur-xl border border-amber-500/20 rounded-2xl hover:border-amber-500/40 transition-all hover:shadow-lg hover:shadow-amber-500/10">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg shadow-lg shadow-amber-500/30 flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">Vizibilitate ridicată</h4>
                      <p className="text-amber-300/70 text-xs">Anunțurile tale prioritar în căutări</p>
                    </div>
                  </div>
                </div>

                {/* Feature 3: Premium Badge */}
                <div className="p-5 bg-gradient-to-br from-pink-600/10 via-pink-500/5 to-transparent backdrop-blur-xl border border-pink-500/20 rounded-2xl hover:border-pink-500/40 transition-all hover:shadow-lg hover:shadow-pink-500/10">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg shadow-lg shadow-pink-500/30 flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">Insignă Premium</h4>
                      <p className="text-pink-300/70 text-xs">Insignă de verificare pe profil</p>
                    </div>
                  </div>
                </div>

                {/* Feature 4: Analytics */}
                <div className="p-5 bg-gradient-to-br from-emerald-600/10 via-emerald-500/5 to-transparent backdrop-blur-xl border border-emerald-500/20 rounded-2xl hover:border-emerald-500/40 transition-all hover:shadow-lg hover:shadow-emerald-500/10">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg shadow-lg shadow-emerald-500/30 flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">Statistici avansate</h4>
                      <p className="text-emerald-300/70 text-xs">Analiză detaliată a performanței</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Benefits Info */}
              <div className="p-6 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl">
                <p className="text-gray-400 text-sm">
                  <span className="font-bold text-[#FF7900]">💡 Sfat:</span> Poți cumpăra credite pentru a obține mai multe beneficii. Accesează secțiunea de Promovare pentru a descoperi ofertele disponibile.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Back Link */}
        <Link href="/dashboard" className="text-[#FF7900] hover:text-[#FFB84D] font-bold">
          ← Înapoi la dashboard
        </Link>
      </div>

      <Footer />
    </div>
  );
}

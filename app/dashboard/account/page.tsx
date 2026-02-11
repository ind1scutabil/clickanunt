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
  const [activeTab, setActiveTab] = useState<"profile" | "password" | "email">("profile");
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
      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
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

    try {
      const token = localStorage.getItem('accessToken');
        const csrfToken = await getCsrfToken();
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
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
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-12">
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
            {(['profile', 'password', 'email'] as const).map((tab) => (
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

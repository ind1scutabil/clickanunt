"use client";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { useState } from "react";

export default function SettingsPage() {
  const [user, setUser] = useState({
    name: "Ion Popescu",
    email: "ion.popescu@example.com",
    phone: "+40 784 712 496",
    location: "București, România",
  });

  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    push: true,
    newMessages: true,
    priceAlerts: true,
    newsletter: false,
  });

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-black mb-4">
            <span className="text-white">Setări </span>
            <span className="neon-text bg-clip-text text-transparent bg-gradient-to-r from-[#FF7900] to-[#FFB84D]">
              cont
            </span>
          </h1>
          <p className="text-gray-400 text-lg">
            Gestionează informațiile contului și preferințele tale
          </p>
        </div>

        {/* Profile Settings */}
        <div className="glass-dark rounded-2xl p-8 border-2 border-[#2A2A2A] mb-6">
          <h2 className="text-2xl font-black text-white mb-6">Informații personale</h2>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-400 mb-2">Nume complet</label>
              <input
                type="text"
                value={user.name}
                onChange={(e) => setUser({ ...user, name: e.target.value })}
                className="w-full px-4 py-3 bg-black border-2 border-[#2A2A2A] rounded-xl text-white font-medium focus:border-[#FF7900] focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-400 mb-2">Email</label>
              <input
                type="email"
                value={user.email}
                onChange={(e) => setUser({ ...user, email: e.target.value })}
                className="w-full px-4 py-3 bg-black border-2 border-[#2A2A2A] rounded-xl text-white font-medium focus:border-[#FF7900] focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-400 mb-2">Telefon</label>
              <input
                type="tel"
                value={user.phone}
                onChange={(e) => setUser({ ...user, phone: e.target.value })}
                className="w-full px-4 py-3 bg-black border-2 border-[#2A2A2A] rounded-xl text-white font-medium focus:border-[#FF7900] focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-400 mb-2">Locație</label>
              <input
                type="text"
                value={user.location}
                onChange={(e) => setUser({ ...user, location: e.target.value })}
                className="w-full px-4 py-3 bg-black border-2 border-[#2A2A2A] rounded-xl text-white font-medium focus:border-[#FF7900] focus:outline-none transition"
              />
            </div>
          </div>
          <div className="flex gap-4 mt-8">
            <button className="px-8 py-3 bg-gradient-to-r from-[#FF7900] to-[#E66D00] hover:from-[#E66D00] hover:to-[#FF7900] text-white rounded-xl font-black transition-all shadow-[0_0_20px_rgba(255,121,0,0.5)]">
              Salvează modificările
            </button>
            <button className="px-8 py-3 glass-dark hover:bg-white/10 text-white rounded-xl font-bold transition-all border border-[#2A2A2A]">
              Anulează
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="glass-dark rounded-2xl p-8 border-2 border-[#2A2A2A] mb-6">
          <h2 className="text-2xl font-black text-white mb-6">Notificări</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-4 border-b border-[#2A2A2A]">
              <div>
                <div className="font-bold text-white mb-1">Notificări email</div>
                <div className="text-sm text-gray-400">Primește notificări pe email</div>
              </div>
              <button
                onClick={() => setNotifications({ ...notifications, email: !notifications.email })}
                className={`w-14 h-8 rounded-full transition-all ${
                  notifications.email ? "bg-[#FF7900]" : "bg-[#2A2A2A]"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full bg-white transition-all ${
                    notifications.email ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-4 border-b border-[#2A2A2A]">
              <div>
                <div className="font-bold text-white mb-1">Notificări SMS</div>
                <div className="text-sm text-gray-400">Primește notificări pe telefon</div>
              </div>
              <button
                onClick={() => setNotifications({ ...notifications, sms: !notifications.sms })}
                className={`w-14 h-8 rounded-full transition-all ${
                  notifications.sms ? "bg-[#FF7900]" : "bg-[#2A2A2A]"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full bg-white transition-all ${
                    notifications.sms ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-4 border-b border-[#2A2A2A]">
              <div>
                <div className="font-bold text-white mb-1">Notificări push</div>
                <div className="text-sm text-gray-400">Primește notificări în browser</div>
              </div>
              <button
                onClick={() => setNotifications({ ...notifications, push: !notifications.push })}
                className={`w-14 h-8 rounded-full transition-all ${
                  notifications.push ? "bg-[#FF7900]" : "bg-[#2A2A2A]"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full bg-white transition-all ${
                    notifications.push ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-4 border-b border-[#2A2A2A]">
              <div>
                <div className="font-bold text-white mb-1">Mesaje noi</div>
                <div className="text-sm text-gray-400">Alertă când primești mesaje</div>
              </div>
              <button
                onClick={() =>
                  setNotifications({ ...notifications, newMessages: !notifications.newMessages })
                }
                className={`w-14 h-8 rounded-full transition-all ${
                  notifications.newMessages ? "bg-[#FF7900]" : "bg-[#2A2A2A]"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full bg-white transition-all ${
                    notifications.newMessages ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-4 border-b border-[#2A2A2A]">
              <div>
                <div className="font-bold text-white mb-1">Alerte preț</div>
                <div className="text-sm text-gray-400">Notificare când prețul se modifică</div>
              </div>
              <button
                onClick={() =>
                  setNotifications({ ...notifications, priceAlerts: !notifications.priceAlerts })
                }
                className={`w-14 h-8 rounded-full transition-all ${
                  notifications.priceAlerts ? "bg-[#FF7900]" : "bg-[#2A2A2A]"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full bg-white transition-all ${
                    notifications.priceAlerts ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-4">
              <div>
                <div className="font-bold text-white mb-1">Newsletter</div>
                <div className="text-sm text-gray-400">Primește oferte și noutăți</div>
              </div>
              <button
                onClick={() =>
                  setNotifications({ ...notifications, newsletter: !notifications.newsletter })
                }
                className={`w-14 h-8 rounded-full transition-all ${
                  notifications.newsletter ? "bg-[#FF7900]" : "bg-[#2A2A2A]"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full bg-white transition-all ${
                    notifications.newsletter ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="glass-dark rounded-2xl p-8 border-2 border-[#2A2A2A] mb-6">
          <h2 className="text-2xl font-black text-white mb-6">Securitate</h2>
          <div className="space-y-4">
            <button className="w-full px-6 py-4 glass-dark hover:bg-white/10 text-white rounded-xl font-bold transition-all border border-[#2A2A2A] flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-[#FF7900]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <span>Schimbă parola</span>
              </div>
              <svg
                className="w-5 h-5 text-gray-400 group-hover:text-white transition"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button className="w-full px-6 py-4 glass-dark hover:bg-white/10 text-white rounded-xl font-bold transition-all border border-[#2A2A2A] flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-[#1E90FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                <span>Autentificare în doi pași</span>
              </div>
              <svg
                className="w-5 h-5 text-gray-400 group-hover:text-white transition"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="glass-dark rounded-2xl p-8 border-2 border-red-500/30 bg-red-500/5">
          <h2 className="text-2xl font-black text-red-500 mb-6">Zona periculoasă</h2>
          <p className="text-gray-400 mb-6">
            Acțiuni ireversibile. Te rugăm să fii atent înainte de a continua.
          </p>
          <button className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all">
            Șterge contul permanent
          </button>
        </div>

        {/* Back Button */}
        <div className="mt-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition font-bold"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Înapoi la dashboard
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || 'Verificați email-ul pentru instrucțiuni.');
        setEmail('');
        // Redirect după 3 secunde
        setTimeout(() => router.push('/auth/login'), 3000);
      } else {
        setError(data.error || 'A apărut o eroare. Încercați din nou.');
      }
    } catch (err) {
      setError('Eroare de conexiune. Verificați conexiunea la internet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🔐</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Resetare Parolă
            </h1>
            <p className="text-gray-600">
              Introduceți adresa de email și vă vom trimite un link de resetare
            </p>
          </div>

          {message && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-start">
                <span className="text-2xl mr-3">✅</span>
                <div>
                  <p className="text-green-800 font-medium">{message}</p>
                  <p className="text-green-600 text-sm mt-1">
                    Veți fi redirecționat către pagina de autentificare...
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-start">
                <span className="text-2xl mr-3">❌</span>
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Adresa de Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading || !!message}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="exemplu@email.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !!message}
              className="w-full py-3 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Se trimite...
                </span>
              ) : (
                'Trimite Link de Resetare'
              )}
            </button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <Link
              href="/auth/login"
              className="block text-indigo-600 hover:text-indigo-700 font-medium transition"
            >
              ← Înapoi la Autentificare
            </Link>
            <p className="text-sm text-gray-500">
              Nu aveți cont?{' '}
              <Link
                href="/auth/signup"
                className="text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Înregistrați-vă
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center text-gray-400 text-sm">
          <p>🔒 Link-ul de resetare este valabil 1 oră</p>
        </div>
      </div>
    </div>
  );
}

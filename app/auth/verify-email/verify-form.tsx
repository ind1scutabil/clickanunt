'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | null>(null);
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);

  // Auto-verificare dacă token-ul vine din URL
  useEffect(() => {
    const token = searchParams.get('token');
    const emailParam = searchParams.get('email');
    const codeParam = searchParams.get('code');

    if (token && emailParam) {
      setEmail(emailParam);
      handleVerifyWithToken(emailParam, token);
    } else if (emailParam) {
      setEmail(emailParam);
      // Auto-completează codul dacă vine în URL (development mode)
      if (codeParam) {
        setCode(codeParam);
      }
    }
  }, [searchParams]);

  async function handleVerifyWithToken(email: string, token: string) {
    setVerifying(true);
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessageType('success');
        setMessage('✅ Email verificat cu succes! Redirecționare către login...');
        setTimeout(() => router.push('/auth/login'), 2000);
      } else {
        setMessageType('error');
        setMessage(data.error || 'Eroare la verificarea emailului');
      }
    } catch (error: unknown) {
      setMessageType('error');
      setMessage('Eroare la verificarea emailului');
    } finally {
      setVerifying(false);
    }
  }

  async function handleVerifyWithCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (!email || !code) {
        throw new Error('Email și cod sunt necesare');
      }

      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          code: code.toUpperCase(),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessageType('success');
        setMessage('✅ Email verificat cu succes!');
        setTimeout(() => {
          router.push('/auth/login');
        }, 2000);
      } else {
        setMessageType('error');
        setMessage(data.error || 'Cod incorect');
      }
    } catch (error: unknown) {
      setMessageType('error');
      setMessage(error instanceof Error ? error.message : 'Eroare necunoscuta');
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    if (!email) {
      setMessageType('error');
      setMessage('Te rog să introduci emailul');
      return;
    }

    setResendLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password: 'temp', // Dummy password for resend
          resendCode: true,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessageType('success');
        setMessage('✅ Cod trimis la ' + email);
      } else {
        setMessageType('error');
        setMessage(data.error || 'Eroare la trimiterea codului');
      }
    } catch (error: unknown) {
      setMessageType('error');
      setMessage(error instanceof Error ? error.message : 'Eroare necunoscuta');
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`p-4 rounded-lg text-sm ${
            messageType === 'success'
              ? 'bg-green-500/10 text-green-500 border border-green-500/20'
              : 'bg-red-500/10 text-red-500 border border-red-500/20'
          }`}
        >
          {message}
        </div>
      )}

      {verifying ? (
        <div className="space-y-4">
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-400">Se verifică email-ul...</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleVerifyWithCode} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Cod de verificare (6 caractere)
            </label>
            <input
              type="text"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-center text-2xl tracking-widest"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white font-semibold py-2 rounded-lg transition"
          >
            {loading ? 'Se verifică...' : 'Verifică email'}
          </button>
        </form>
      )}

      <div className="text-center text-sm text-gray-400">
        <p>
          Nu ai primit codul?{' '}
          <button
            onClick={handleResendCode}
            disabled={resendLoading}
            className="text-blue-500 hover:text-blue-400 disabled:text-gray-600"
          >
            {resendLoading ? 'Se trimite...' : 'Retrimite codul'}
          </button>
        </p>
      </div>

      <div className="text-center text-sm text-gray-400">
        <p>
          Ai deja cont?{' '}
          <Link href="/auth/login" className="text-blue-500 hover:text-blue-400">
            Logare
          </Link>
        </p>
      </div>
    </div>
  );
}

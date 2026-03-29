'use client';

import { useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import { COMPANY_CONFIG } from '@/lib/company-config';
import { getCsrfToken } from '@/lib/security/csrf-client';

export default function TransferPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const packageId = searchParams.get('package');
  const price = searchParams.get('price');
  const amountBaniParam = searchParams.get('amountBani');

  const [copied, setCopied] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const amountBani =
    amountBaniParam != null && amountBaniParam !== ''
      ? parseInt(amountBaniParam, 10)
      : price != null && price !== ''
        ? Math.round(parseFloat(price) * 100)
        : NaN;

  const missingParams = !packageId || !Number.isFinite(amountBani) || amountBani < 100;

  const bankDetails = {
    bank: COMPANY_CONFIG.bank,
    iban: COMPANY_CONFIG.iban.replace(/\s/g, ''),
    swift: COMPANY_CONFIG.swift ?? '—',
    accountName: COMPANY_CONFIG.name,
    reference: `PROMOTION-${id}-${packageId}`.toUpperCase().substring(0, 40),
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleConfirmTransfer = async () => {
    if (missingParams) return;
    if (!email.trim()) {
      alert('Introdu email-ul pentru confirmare!');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const csrfToken = await getCsrfToken();
      const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (!accessToken) {
        router.push(`/auth/login?returnUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }

      const response = await fetch(`/api/listings/${id}/promote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          packageId,
          amountBani,
          paymentMethod: 'transfer',
          paymentEmail: email.trim(),
          paymentReference: bankDetails.reference,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Eroare la înregistrare');
      }

      setShowSuccess(true);
      setTimeout(() => {
        router.push(`/listings/${id}`);
      }, 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Eroare');
    } finally {
      setSubmitting(false);
    }
  };

  if (missingParams) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-20 flex items-center justify-center px-4">
          <div className="max-w-md text-center">
            <p className="text-white font-bold mb-4">Link incomplet</p>
            <p className="text-gray-400 text-sm mb-6">Reia fluxul din pagina de promovare.</p>
            <button
              type="button"
              onClick={() => router.push(`/listings/${id}/promote`)}
              className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold"
            >
              Înapoi la promovare
            </button>
          </div>
        </main>
      </>
    );
  }

  const priceNumber = parseFloat(price || String(amountBani / 100));

  if (showSuccess) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-20 flex items-center justify-center">
          <div className="text-center">
            <div className="w-32 h-32 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
              <span className="text-6xl">✅</span>
            </div>
            <h1 className="text-4xl font-black text-white mb-4">Promovare activată</h1>
            <p className="text-gray-400 text-lg mb-2">Transfer înregistrat — anunțul este promovat după verificarea sumei.</p>
            <p className="text-gray-500 text-sm">Redirecționare…</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-20 pb-12">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">
              🏦 Transfer Bancar
            </h1>
            <p className="text-gray-400">Plătește exact suma afișată — este verificată automat la confirmare.</p>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200 text-center">
              {error}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-yellow-500/20 to-orange-600/20 backdrop-blur-xl rounded-3xl shadow-2xl border border-yellow-500/30 p-8">
              <h3 className="text-xl font-black text-white mb-4 flex items-center gap-2">
                <span className="text-3xl">💰</span>
                Suma de plată
              </h3>
              <div className="text-5xl font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent mb-4">
                {priceNumber.toFixed(2)} RON
              </div>
              <p className="text-gray-300 text-sm mb-6">Aceeași sumă ca la checkout (inclusiv discount cont, dacă există).</p>

              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-4">
                <p className="text-yellow-100 text-sm">
                  <strong>Referință:</strong>
                  <br />
                  {bankDetails.reference}
                </p>
              </div>

              <button
                type="button"
                onClick={() => copyToClipboard(bankDetails.reference, 'reference')}
                className={`w-full py-3 rounded-xl font-bold transition-all ${
                  copied === 'reference'
                    ? 'bg-green-500/30 text-green-300'
                    : 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30'
                }`}
              >
                {copied === 'reference' ? '✓ Copiat!' : '📋 Copiază referință'}
              </button>
            </div>

            <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-700/50 p-8">
              <h3 className="text-xl font-black text-white mb-6">Detalii bancare</h3>

              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-gray-400 text-sm mb-2">Banca</p>
                  <div className="flex items-center justify-between bg-gray-900/50 p-4 rounded-xl border border-gray-700/50">
                    <span className="text-white font-bold">{bankDetails.bank}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(bankDetails.bank, 'bank')}
                      className="text-gray-400 hover:text-[#00D4FF] transition"
                    >
                      {copied === 'bank' ? '✓' : '📋'}
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-gray-400 text-sm mb-2">IBAN</p>
                  <div className="flex items-center justify-between bg-gray-900/50 p-4 rounded-xl border border-gray-700/50">
                    <span className="text-white font-mono text-sm break-all">{bankDetails.iban}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(bankDetails.iban, 'iban')}
                      className="text-gray-400 hover:text-[#00D4FF] transition shrink-0 ml-2"
                    >
                      {copied === 'iban' ? '✓' : '📋'}
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-gray-400 text-sm mb-2">SWIFT</p>
                  <div className="flex items-center justify-between bg-gray-900/50 p-4 rounded-xl border border-gray-700/50">
                    <span className="text-white font-mono">{bankDetails.swift}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(bankDetails.swift, 'swift')}
                      className="text-gray-400 hover:text-[#00D4FF] transition"
                    >
                      {copied === 'swift' ? '✓' : '📋'}
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-gray-400 text-sm mb-2">Beneficiar</p>
                  <div className="flex items-center justify-between bg-gray-900/50 p-4 rounded-xl border border-gray-700/50">
                    <span className="text-white font-bold">{bankDetails.accountName}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(bankDetails.accountName, 'account')}
                      className="text-gray-400 hover:text-[#00D4FF] transition"
                    >
                      {copied === 'account' ? '✓' : '📋'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <p className="text-blue-200 text-sm">
                  <strong>Important:</strong> menționează referința la transfer. După ce apeși confirmarea, promovarea se
                  activează dacă suma corespunde pachetului.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-700/50 p-8 mt-8">
            <h3 className="text-xl font-black text-white mb-6">Confirmare</h3>

            <label className="block text-white font-bold mb-3">Email pentru notificare</label>
            <input
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-900/50 border-2 border-gray-700 rounded-xl px-4 py-4 text-white placeholder-gray-500 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all mb-6"
            />

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.push(`/listings/${id}/promote`)}
                className="flex-1 py-4 bg-gray-800 border-2 border-gray-700 text-white rounded-xl font-bold hover:bg-gray-700 transition-all"
              >
                ← Înapoi
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmTransfer()}
                disabled={submitting}
                className="flex-1 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-black text-lg hover:shadow-2xl disabled:opacity-50"
              >
                {submitting ? 'Se verifică…' : '✓ Am transferat — activează promovarea'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

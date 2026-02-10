'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { QRCodeSVG as QRCode } from 'qrcode.react';

function TwoFactorContent() {
  const [step, setStep] = useState<'qr' | 'verify' | 'backup'>('qr');
  const [secret, setSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [code, setCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showBackupOption, setShowBackupOption] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionToken = searchParams.get('session');

  const generateQRCode = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/2fa/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: sessionToken?.split('-')[0], // Extract basic ID from token
        }),
      });

      const data = await response.json();
      setSecret(data.secret);
      setQrCodeUrl(data.otpauthUrl);
      setBackupCodes(data.backupCodes);
    } catch (err) {
      setError('Failed to generate QR code');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [sessionToken]);

  useEffect(() => {
    if (!sessionToken) {
      router.push('/auth/login');
      return;
    }
    generateQRCode();
  }, [sessionToken, router, generateQRCode]);

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, code }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Invalid code');
        return;
      }

      setStep('backup');
    } catch (err) {
      setError('Verification failed');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBackupCodeVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, code: backupCode }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Invalid backup code');
        return;
      }

      setStep('backup');
    } catch (err) {
      setError('Verification failed');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSetup = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken, code }),
      });

      if (response.ok) {
        router.push('/admin/dashboard');
      } else {
        setError('Failed to complete setup');
      }
    } catch (err) {
      setError('Setup failed');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-center mb-2 text-gray-900">
            Autentificare cu Doi Factori
          </h1>
          <p className="text-center text-gray-600 mb-6">
            Configurează protecția 2FA pentru contul tău admin
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 p-4 rounded mb-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          {step === 'qr' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded">
                <p className="text-sm font-bold text-blue-700 mb-4">
                  📱 Pasul 1: Descarcă o aplicație de autentificare
                </p>
                <ul className="text-sm text-blue-600 space-y-2">
                  <li>Google Authenticator</li>
                  <li>Microsoft Authenticator</li>
                  <li>Authy</li>
                </ul>

                <p className="text-sm text-gray-600 mb-4 mt-4">
                  2. Scanează acest QR code:
                </p>

                {qrCodeUrl && (
                  <div className="bg-white p-4 rounded border border-gray-300 text-center mb-4">
                    <div className="inline-block p-4 bg-white">
                      <QRCode 
                        value={qrCodeUrl}
                        size={256}
                        level="H"
                        includeMargin={true}
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Secret: {secret}
                      </p>
                    </div>
                  </div>
                )}

                <p className="text-sm text-gray-600 mb-4">
                  3. Intră codul 6-digit din app:
                </p>

                <form onSubmit={handleVerifyCode} className="space-y-4">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.replace(/\D/g, ''))
                    }
                    className="w-full border-2 border-gray-300 px-4 py-3 rounded text-3xl tracking-widest text-center font-mono focus:border-indigo-500 outline-none"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={loading || code.length !== 6}
                    className="w-full bg-indigo-600 text-white py-2 rounded font-semibold hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {loading ? 'Se verifică...' : 'Verific codul'}
                  </button>
                </form>

                <button
                  type="button"
                  onClick={() => setShowBackupOption(true)}
                  className="w-full mt-4 text-indigo-600 hover:text-indigo-700 text-sm"
                >
                  Folosesc un backup code
                </button>
              </div>
            </div>
          )}

          {showBackupOption && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded mb-4">
              <form onSubmit={handleBackupCodeVerify} className="space-y-4">
                <input
                  type="text"
                  placeholder="Intră un backup code"
                  value={backupCode}
                  onChange={(e) => setBackupCode(e.target.value)}
                  className="w-full border-2 border-yellow-300 px-4 py-2 rounded focus:border-yellow-500 outline-none"
                />
                <button
                  type="submit"
                  disabled={loading || !backupCode}
                  className="w-full bg-yellow-600 text-white py-2 rounded font-semibold hover:bg-yellow-700 disabled:opacity-50"
                >
                  {loading ? 'Se verifică...' : 'Verific backup code'}
                </button>
              </form>
            </div>
          )}

          {step === 'backup' && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 p-4 rounded">
                <p className="text-sm font-bold text-red-700 mb-4">
                  ⚠️ BACKUP CODES - SALVEAZĂ-LE ÎN LOC SIGUR!
                </p>
                <p className="text-xs text-red-600 mb-4">
                  Dacă pierzi accesul la telefon, poți folosi aceste coduri pentru a te conecta:
                </p>
                <div className="bg-white p-4 rounded font-mono text-xs space-y-1 mb-4">
                  {backupCodes.map((code) => (
                    <div key={code} className="text-gray-700">
                      {code}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(backupCodes.join('\n'))
                  }
                  className="w-full bg-gray-600 text-white py-2 rounded font-semibold hover:bg-gray-700 mb-4"
                >
                  📋 Copiază în clipboard
                </button>
              </div>

              <button
                onClick={handleConfirmSetup}
                disabled={loading}
                className="w-full bg-green-600 text-white py-2 rounded font-semibold hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Se procesează...' : '✅ 2FA Setup Complet'}
              </button>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-200">
            <Link
              href="/auth/login"
              className="block text-center text-indigo-600 hover:text-indigo-700 text-sm font-medium"
            >
              Înapoi la login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TwoFactorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center">Se încarcă...</div>}>
      <TwoFactorContent />
    </Suspense>
  );
}

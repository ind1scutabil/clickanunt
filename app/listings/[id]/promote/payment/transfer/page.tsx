'use client';
import { useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import { memoryStorage } from '@/lib/memory-storage';

export default function TransferPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const packageId = searchParams.get('package');
  const price = searchParams.get('price');

  const [copied, setCopied] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const bankDetails = {
    bank: 'Banca Transilvania',
    iban: 'RO92BTRLRONCRT0123456789',
    swift: 'BTRLRO22',
    accountName: 'ClickAnunț SRL',
    reference: `PROMOTION-${id}-${packageId}`.toUpperCase().substring(0, 20)
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleConfirmTransfer = () => {
    if (!email) {
      alert('Introdu email-ul pentru confirmare!');
      return;
    }

    // Update listing cu promovare
    const listing = memoryStorage.get(id);
    if (listing) {
      const updatedListing = {
        ...listing,
        promotionType: packageId,
        promotionExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        isFeatured: true,
        paymentMethod: 'transfer',
        paymentDate: new Date().toISOString(),
        paymentEmail: email,
        paymentReference: bankDetails.reference
      };
      memoryStorage.set(id, updatedListing);
    }

    setShowSuccess(true);
    setTimeout(() => {
      router.push(`/listings/${id}`);
    }, 3000);
  };

  if (showSuccess) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-20 flex items-center justify-center">
          <div className="text-center">
            <div className="w-32 h-32 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
              <span className="text-6xl">✅</span>
            </div>
            <h1 className="text-4xl font-black text-white mb-4">Transfer Înregistrat!</h1>
            <p className="text-gray-400 text-lg mb-2">Anunțul tău va fi promovat după confirmarea plății</p>
            <p className="text-gray-500 text-sm">Te vom notifica la adresa de email</p>
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
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">
              🏦 Transfer Bancar
            </h1>
            <p className="text-gray-400">Efectuează transferul conform detaliilor de mai jos</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Amount Card */}
            <div className="bg-gradient-to-br from-yellow-500/20 to-orange-600/20 backdrop-blur-xl rounded-3xl shadow-2xl border border-yellow-500/30 p-8">
              <h3 className="text-xl font-black text-white mb-4 flex items-center gap-2">
                <span className="text-3xl">💰</span>
                Suma de Plată
              </h3>
              <div className="text-5xl font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent mb-4">
                {price} RON
              </div>
              <p className="text-gray-300 text-sm mb-6">Plătește exact această sumă pentru procesare rapidă</p>
              
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-4">
                <p className="text-yellow-100 text-sm">
                  <strong>Referință Plată:</strong><br/>
                  {bankDetails.reference}
                </p>
              </div>

              <button
                onClick={() => copyToClipboard(bankDetails.reference, 'reference')}
                className={`w-full py-3 rounded-xl font-bold transition-all ${
                  copied === 'reference'
                    ? 'bg-green-500/30 text-green-300'
                    : 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30'
                }`}
              >
                {copied === 'reference' ? '✓ Copiat!' : '📋 Copiază Referință'}
              </button>
            </div>

            {/* Bank Details */}
            <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-700/50 p-8">
              <h3 className="text-xl font-black text-white mb-6">Detalii Bancare</h3>
              
              <div className="space-y-4 mb-6">
                {/* Bank Name */}
                <div>
                  <p className="text-gray-400 text-sm mb-2">Banca</p>
                  <div className="flex items-center justify-between bg-gray-900/50 p-4 rounded-xl border border-gray-700/50">
                    <span className="text-white font-bold">{bankDetails.bank}</span>
                    <button
                      onClick={() => copyToClipboard(bankDetails.bank, 'bank')}
                      className="text-gray-400 hover:text-[#00D4FF] transition"
                    >
                      {copied === 'bank' ? '✓' : '📋'}
                    </button>
                  </div>
                </div>

                {/* IBAN */}
                <div>
                  <p className="text-gray-400 text-sm mb-2">IBAN</p>
                  <div className="flex items-center justify-between bg-gray-900/50 p-4 rounded-xl border border-gray-700/50">
                    <span className="text-white font-mono text-sm">{bankDetails.iban}</span>
                    <button
                      onClick={() => copyToClipboard(bankDetails.iban, 'iban')}
                      className="text-gray-400 hover:text-[#00D4FF] transition"
                    >
                      {copied === 'iban' ? '✓' : '📋'}
                    </button>
                  </div>
                </div>

                {/* SWIFT */}
                <div>
                  <p className="text-gray-400 text-sm mb-2">SWIFT</p>
                  <div className="flex items-center justify-between bg-gray-900/50 p-4 rounded-xl border border-gray-700/50">
                    <span className="text-white font-mono">{bankDetails.swift}</span>
                    <button
                      onClick={() => copyToClipboard(bankDetails.swift, 'swift')}
                      className="text-gray-400 hover:text-[#00D4FF] transition"
                    >
                      {copied === 'swift' ? '✓' : '📋'}
                    </button>
                  </div>
                </div>

                {/* Account Name */}
                <div>
                  <p className="text-gray-400 text-sm mb-2">Beneficiar</p>
                  <div className="flex items-center justify-between bg-gray-900/50 p-4 rounded-xl border border-gray-700/50">
                    <span className="text-white font-bold">{bankDetails.accountName}</span>
                    <button
                      onClick={() => copyToClipboard(bankDetails.accountName, 'account')}
                      className="text-gray-400 hover:text-[#00D4FF] transition"
                    >
                      {copied === 'account' ? '✓' : '📋'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <p className="text-blue-200 text-sm">
                  <strong>ℹ️ Important:</strong> Asigură-te că menționezi referința de plată pentru identificare rapidă
                </p>
              </div>
            </div>
          </div>

          {/* Confirmation Section */}
          <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-700/50 p-8 mt-8">
            <h3 className="text-xl font-black text-white mb-6">Confirmare Transfer</h3>
            
            <div>
              <label className="block text-white font-bold mb-3">Email pentru Notificare</label>
              <input
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-900/50 border-2 border-gray-700 rounded-xl px-4 py-4 text-white placeholder-gray-500 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all mb-6"
              />
            </div>

            {/* Timeline */}
            <div className="space-y-4 mb-8">
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 font-bold flex-shrink-0">1</div>
                <div>
                  <p className="text-white font-bold">Trimite transferul</p>
                  <p className="text-gray-400 text-sm">Efectuează transferul bancar cu referința menționată</p>
                </div>
              </div>
              
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 font-bold flex-shrink-0">2</div>
                <div>
                  <p className="text-white font-bold">Notificare Email</p>
                  <p className="text-gray-400 text-sm">Primești confirmarea la adresa ta de email</p>
                </div>
              </div>
              
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 font-bold flex-shrink-0">3</div>
                <div>
                  <p className="text-white font-bold">Activare Promovare</p>
                  <p className="text-gray-400 text-sm">Anunțul tău va fi promovat imediat după verificare</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => router.back()}
                className="flex-1 py-4 bg-gray-800 border-2 border-gray-700 text-white rounded-xl font-bold hover:bg-gray-700 transition-all"
              >
                ← Înapoi
              </button>
              <button
                onClick={handleConfirmTransfer}
                className="flex-1 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-black text-lg hover:shadow-2xl hover:shadow-green-500/50 transition-all transform hover:scale-105 active:scale-95"
              >
                ✓ Am Efectuat Transferul
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

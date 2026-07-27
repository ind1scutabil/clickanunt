'use client';

import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/app/components/Navbar';

/**
 * Bank-transfer self-confirm previously activated promotions without reconciliation.
 * Details remain available via company config on request; auto-activation is blocked.
 */
export default function TransferPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-20 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Transfer bancar — fără activare automată</h1>
          <p className="text-gray-400 text-sm mb-6">
            Confirmarea pe această pagină nu mai activează promovarea. Folosește plata cu cardul
            pentru activare automată după webhook Stripe, sau contactează suportul pentru transfer
            manual verificat.
          </p>
          <button
            type="button"
            onClick={() => router.push(`/listings/${id}/promote`)}
            className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold"
          >
            Înapoi la promovare (card)
          </button>
        </div>
      </main>
    </>
  );
}

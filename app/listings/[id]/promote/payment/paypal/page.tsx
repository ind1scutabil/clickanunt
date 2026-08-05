'use client';

import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/app/components/Navbar';

/** PayPal self-confirm previously activated promotions without provider verification. */
export default function PayPalPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-20 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-white mb-4">PayPal indisponibil</h1>
          <p className="text-gray-400 text-sm mb-6">
            Promovarea se activează doar după confirmarea plății cu cardul (Stripe webhook).
            Fluxul PayPal nu mai poate activa promovarea fără dovadă de plată.
          </p>
          <button
            type="button"
            onClick={() => router.push(`/listings/${id}/promote`)}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold"
          >
            Înapoi la promovare (card)
          </button>
        </div>
      </main>
    </>
  );
}

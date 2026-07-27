import Link from 'next/link';
import Navbar from '@/app/components/Navbar';

/**
 * Email verification UI is deprecated — API returns 410 Gone.
 * Schema no longer stores verification tokens; do not pretend the flow works.
 */
export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <Navbar />

      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] px-4">
        <div className="w-full max-w-md text-center">
          <h1 className="text-3xl font-bold text-white mb-3">Verificare email indisponibilă</h1>
          <p className="text-gray-400 mb-8">
            Verificarea prin link/cod nu este activă momentan. Poți folosi contul în continuare;
            pentru ajutor contactează suportul.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/dashboard"
              className="rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-500"
            >
              Mergi la dashboard
            </Link>
            <Link
              href="/contact"
              className="rounded-xl bg-gray-800 px-4 py-3 font-semibold text-gray-200 hover:bg-gray-700"
            >
              Contact
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

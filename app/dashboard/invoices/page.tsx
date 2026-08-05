"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import {
  fetchWithAuthRefresh,
  validateServerAuthSession,
  clearStaleBrowserAuth,
} from "@/lib/admin-fetch";

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: string;
  issuedAt: string | null;
  dueAt: string | null;
  createdAt: string;
  metadata?: any;
}

export default function InvoicesPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoices = async () => {
      const session = await validateServerAuthSession();
      if (!session.ok) {
        if (!session.transient) {
          clearStaleBrowserAuth();
          router.push('/auth/login?redirect=/dashboard/invoices');
        }
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetchWithAuthRefresh('/api/invoices');

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            clearStaleBrowserAuth();
            router.push('/auth/login?redirect=/dashboard/invoices');
            return;
          }
          throw new Error('Failed to fetch invoices');
        }

        const data = await response.json();
        setInvoices(data.invoices || []);
      } catch (error: any) {
        console.error('Error fetching invoices:', error);
        setError(error.message || 'A apărut o eroare la încărcarea facturilor');
      } finally {
        setIsLoading(false);
      }
    };

    void fetchInvoices();
  }, [router]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatAmount = (amount: number, currency: string) => {
    return `${(amount / 100).toFixed(2)} ${currency}`;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { label: string; className: string } } = {
      issued: { label: 'Emisă', className: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
      paid: { label: 'Plătită', className: 'bg-green-500/10 text-green-400 border-green-500/30' },
      cancelled: { label: 'Anulată', className: 'bg-red-500/10 text-red-400 border-red-500/30' },
      overdue: { label: 'Întârziată', className: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
    };

    const statusInfo = statusMap[status] || statusMap.issued;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    );
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-20 pb-12">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 left-1/3 w-[32rem] h-[32rem] bg-blue-500/10 rounded-full blur-[140px]"></div>
          <div className="absolute bottom-0 right-1/4 w-[28rem] h-[28rem] bg-purple-500/10 rounded-full blur-[140px]"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Link 
                href="/dashboard" 
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                📄 <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Facturile mele</span>
              </h1>
            </div>
            <p className="text-gray-400 text-lg">Toate facturile emise pentru promovări și servicii</p>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12">
              <div className="animate-spin text-6xl mb-4">⏳</div>
              <p className="text-gray-400">Se încarcă facturile...</p>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
              <span className="text-6xl mb-4 block">❌</span>
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-all"
              >
                Reîncearcă
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && invoices.length === 0 && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-3xl p-12 text-center">
              <div className="text-8xl mb-6">📭</div>
              <h3 className="text-2xl font-bold text-white mb-3">Nicio factură încă</h3>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">
                Facturile tale vor apărea aici după ce faci o plată pentru promovare anunțuri.
              </p>
              <Link
                href="/dashboard/listings"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-2xl transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Promovează un anunț
              </Link>
            </div>
          )}

          {/* Invoices Table */}
          {!isLoading && !error && invoices.length > 0 && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-3xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-900/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Număr Factură
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Data Emiterii
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Sumă
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Scadență
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Acțiuni
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-700/20 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">📄</span>
                            <span className="text-white font-bold">{invoice.invoiceNumber}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                          {formatDate(invoice.issuedAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-white font-bold text-lg">
                            {formatAmount(invoice.amount, invoice.currency)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(invoice.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                          {formatDate(invoice.dueAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                // TODO: Implementare download PDF când va fi disponibil
                                alert('Funcționalitate în curs de dezvoltare');
                              }}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-medium"
                            >
                              📥 Descarcă
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Total Summary */}
          {!isLoading && !error && invoices.length > 0 && (
            <div className="mt-6 bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 font-medium">Total facturi:</span>
                <span className="text-white font-bold text-2xl">{invoices.length}</span>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

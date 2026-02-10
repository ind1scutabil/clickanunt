'use client';
import React, { useState, useEffect } from 'react';
import Navbar from '@/app/components/Navbar';
import Link from 'next/link';

interface Invoice {
  id: string;
  invoiceNumber: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  currency: string;
  status: 'draft' | 'issued' | 'paid' | 'cancelled';
  items: Array<{ description: string; quantity: number; unitPrice: number; vatRate: number }>;
  metadata: Record<string, unknown> | null;
  issuedAt: string;
  paidAt?: string;
  dueAt: string;
  createdAt: string;
}

interface FilterOptions {
  status: 'all' | 'draft' | 'issued' | 'paid' | 'cancelled';
  dateRange: 'today' | 'week' | 'month' | 'all';
  searchQuery: string;
}

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({
    status: 'all',
    dateRange: 'month',
    searchQuery: '',
  });
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [viewTab, setViewTab] = useState<'list' | 'export' | 'anaf'>('list');
  const [exportLoading, setExportLoading] = useState(false);
  const [anafStatus, setAnafStatus] = useState('');

  const loadInvoices = async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        status: filters.status !== 'all' ? filters.status : '',
        dateRange: filters.dateRange,
        search: filters.searchQuery,
      });

      const res = await fetch(`/api/admin/invoices?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });

      if (!res.ok) throw new Error('Failed to load invoices');

      const data = await res.json();
      setInvoices(data.invoices || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading invoices');
    } finally {
      setLoading(false);
    }
  };

  // Load invoices
  useEffect(() => {
    loadInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.dateRange, filters.searchQuery]);

  const handleSelectInvoice = (invoiceId: string) => {
    const newSelected = new Set(selectedInvoices);
    if (newSelected.has(invoiceId)) {
      newSelected.delete(invoiceId);
    } else {
      newSelected.add(invoiceId);
    }
    setSelectedInvoices(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedInvoices.size === invoices.length) {
      setSelectedInvoices(new Set());
    } else {
      setSelectedInvoices(new Set(invoices.map(inv => inv.id)));
    }
  };

  const downloadInvoicePDF = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/admin/invoices/${invoiceId}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });

      if (!res.ok) throw new Error('Failed to download invoice');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Error downloading invoice: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const downloadMultipleInvoices = async () => {
    try {
      setExportLoading(true);

      const res = await fetch('/api/admin/invoices/batch-download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({
          invoiceIds: Array.from(selectedInvoices),
        }),
      });

      if (!res.ok) throw new Error('Failed to download invoices');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoices-${new Date().toISOString().split('T')[0]}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);

      alert('✅ Invoices downloaded successfully!');
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setExportLoading(false);
    }
  };

  const exportToCSV = () => {
    try {
      const headers = ['Invoice Number', 'User', 'Email', 'Amount', 'VAT', 'Total', 'Status', 'Issued Date'];
      const rows = invoices
        .filter(inv => selectedInvoices.size === 0 || selectedInvoices.has(inv.id))
        .map(inv => [
          inv.invoiceNumber,
          inv.userName,
          inv.userEmail,
          ((inv.metadata as Record<string, unknown> | null)?.subtotal as number || 0) / 100,
          ((inv.metadata as Record<string, unknown> | null)?.vatAmount as number || 0) / 100,
          (inv.amount / 100).toFixed(2),
          inv.status,
          new Date(inv.issuedAt).toLocaleDateString('ro-RO'),
        ]);

      const csv = [headers, ...rows].map((row: (string | number | undefined)[]) => row.map(cell => `"${cell}"`).join(',')).join('\n');
      
      const blob = new Blob([csv as string], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoices-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      alert('✅ CSV exported successfully!');
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const submitToANAF = async () => {
    try {
      setAnafStatus('Processing...');

      const res = await fetch('/api/admin/invoices/submit-anaf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({
          invoiceIds: Array.from(selectedInvoices),
          format: 'e-invoice', // e-invoice format for ANAF
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to submit to ANAF');

      setAnafStatus(
        `✅ Successfully submitted ${data.submitted} invoices to ANAF. Failed: ${data.failed || 0}`
      );
      
      loadInvoices();
    } catch (err) {
      setAnafStatus(`❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-600 text-white',
      issued: 'bg-blue-600 text-white',
      paid: 'bg-green-600 text-white',
      cancelled: 'bg-red-600 text-white',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-600 text-white';
  };

  const filteredInvoices = invoices.filter(inv => {
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      return (
        inv.invoiceNumber.toLowerCase().includes(query) ||
        inv.userName.toLowerCase().includes(query) ||
        inv.userEmail.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const totalAmount = filteredInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalVAT = filteredInvoices.reduce((sum, inv) => sum + (((inv.metadata as Record<string, unknown> | null)?.vatAmount as number) || 0), 0);

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#0A0A0A] text-white pt-24 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-4xl font-bold text-[#00D4FF]">💰 Gestiune Facturi</h1>
              <Link
                href="/admin/dashboard"
                className="px-4 py-2 bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] hover:from-[#4E3CFF] hover:to-[#6D5BFF] text-white rounded-lg transition-all shadow-lg hover:shadow-[#6D5BFF]/50 font-semibold"
              >
                ← Înapoi la Dashboard
              </Link>
            </div>
            <p className="text-gray-400">
              Administrează facturile emise, descarcă pentru contabilitate sau trimite automat la ANAF
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded text-red-200">
              ❌ {error}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 mb-8 border-b border-gray-700">
            <button
              onClick={() => setViewTab('list')}
              className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
                viewTab === 'list'
                  ? 'border-[#00D4FF] text-[#00D4FF]'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              📋 Lista Facturi
            </button>
            <button
              onClick={() => setViewTab('export')}
              className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
                viewTab === 'export'
                  ? 'border-[#00D4FF] text-[#00D4FF]'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              📥 Descărcare & Export
            </button>
            <button
              onClick={() => setViewTab('anaf')}
              className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
                viewTab === 'anaf'
                  ? 'border-[#00D4FF] text-[#00D4FF]'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              🏛️ ANAF SPV
            </button>
          </div>

          {/* LIST VIEW */}
          {viewTab === 'list' && (
            <>
              {/* Filters */}
              <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">🔍 Filtre</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Status</label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value as 'all' | 'draft' | 'issued' | 'paid' | 'cancelled' })}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                    >
                      <option value="all">Toate</option>
                      <option value="draft">Draft</option>
                      <option value="issued">Emise</option>
                      <option value="paid">Plătite</option>
                      <option value="cancelled">Anulate</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Perioada</label>
                    <select
                      value={filters.dateRange}
                      onChange={(e) => setFilters({ ...filters, dateRange: e.target.value as 'today' | 'week' | 'month' | 'all' })}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                    >
                      <option value="today">Astazi</option>
                      <option value="week">Această săptămână</option>
                      <option value="month">Această lună</option>
                      <option value="all">Toate datele</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">Căutare</label>
                    <input
                      type="text"
                      placeholder="Număr factură, utilizator, email..."
                      value={filters.searchQuery}
                      onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-900 border border-gray-800 rounded p-4">
                  <p className="text-gray-400 text-sm">Total Facturi</p>
                  <p className="text-2xl font-bold text-[#00D4FF]">{filteredInvoices.length}</p>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded p-4">
                  <p className="text-gray-400 text-sm">Total (fără TVA)</p>
                  <p className="text-2xl font-bold text-green-400">
                    {((totalAmount - totalVAT) / 100).toFixed(2)} RON
                  </p>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded p-4">
                  <p className="text-gray-400 text-sm">TVA Total</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {(totalVAT / 100).toFixed(2)} RON
                  </p>
                </div>
              </div>

              {/* Table */}
              <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
                {loading ? (
                  <div className="p-8 text-center text-gray-400">Se încarcă facturile...</div>
                ) : filteredInvoices.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">Nicio factură găsită</div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-800 border-b border-gray-700">
                          <tr>
                            <th className="px-4 py-3 text-left">
                              <input
                                type="checkbox"
                                checked={selectedInvoices.size === filteredInvoices.length && filteredInvoices.length > 0}
                                onChange={handleSelectAll}
                                className="rounded"
                              />
                            </th>
                            <th className="px-4 py-3 text-left font-semibold">Factură Nr.</th>
                            <th className="px-4 py-3 text-left font-semibold">Utilizator</th>
                            <th className="px-4 py-3 text-left font-semibold">Email</th>
                            <th className="px-4 py-3 text-right font-semibold">Sumă</th>
                            <th className="px-4 py-3 text-right font-semibold">TVA</th>
                            <th className="px-4 py-3 text-left font-semibold">Status</th>
                            <th className="px-4 py-3 text-left font-semibold">Data</th>
                            <th className="px-4 py-3 text-center font-semibold">Acțiuni</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredInvoices.map((invoice) => (
                            <tr
                              key={invoice.id}
                              className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                            >
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={selectedInvoices.has(invoice.id)}
                                  onChange={() => handleSelectInvoice(invoice.id)}
                                  className="rounded"
                                />
                              </td>
                              <td className="px-4 py-3 font-mono text-sm">{invoice.invoiceNumber}</td>
                              <td className="px-4 py-3 text-sm">{invoice.userName}</td>
                              <td className="px-4 py-3 text-sm text-gray-400">{invoice.userEmail}</td>
                              <td className="px-4 py-3 text-right font-semibold">
                                {((invoice.amount - (((invoice.metadata as Record<string, unknown> | null)?.vatAmount as number) || 0)) / 100).toFixed(2)} RON
                              </td>
                              <td className="px-4 py-3 text-right text-yellow-400">
                                {((((invoice.metadata as Record<string, unknown> | null)?.vatAmount as number) || 0) / 100).toFixed(2)} RON
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusBadge(invoice.status)}`}>
                                  {invoice.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {new Date(invoice.issuedAt).toLocaleDateString('ro-RO')}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => downloadInvoicePDF(invoice.id)}
                                  className="text-[#00D4FF] hover:text-[#00B8E6] text-sm font-medium"
                                >
                                  📥 PDF
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* EXPORT VIEW */}
          {viewTab === 'export' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Download Section */}
              <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
                <h2 className="text-xl font-semibold mb-4">📥 Descarcă Facturi</h2>
                <p className="text-gray-400 mb-6">
                  Selectează facturile din lista și descarcă-le ca PDF individual sau în pachet ZIP pentru
                  transmitere în contabilitate.
                </p>

                <div className="space-y-3 mb-6">
                  <div className="p-4 bg-blue-900/20 border border-blue-700 rounded">
                    <p className="text-sm text-blue-300">
                      📊 Facturi selectate: <strong>{selectedInvoices.size}</strong>
                    </p>
                  </div>

                  <button
                    onClick={downloadMultipleInvoices}
                    disabled={selectedInvoices.size === 0 || exportLoading}
                    className="w-full px-4 py-3 bg-[#00D4FF] text-black font-semibold rounded hover:bg-[#00B8E6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {exportLoading ? '⏳ Se procesează...' : `📦 Descarcă ${selectedInvoices.size} ca ZIP`}
                  </button>

                  <button
                    onClick={exportToCSV}
                    className="w-full px-4 py-3 bg-green-600 text-white font-semibold rounded hover:bg-green-700 transition-colors"
                  >
                    📊 Export CSV pentru Contabilitate
                  </button>
                </div>

                <div className="bg-green-900/20 border border-green-700 rounded p-4 text-sm text-green-300">
                  <p className="font-semibold mb-2">✅ Pachete pregatite pentru export:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>PDF individual pentru fiecare factură</li>
                    <li>Arhivă ZIP cu toate facturile</li>
                    <li>CSV cu detalii complete (pentru Excel)</li>
                    <li>Gata de transmis în contabilitate</li>
                  </ul>
                </div>
              </div>

              {/* Accounting Info */}
              <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
                <h2 className="text-xl font-semibold mb-4">📋 Info Contabilitate</h2>

                <div className="space-y-4">
                  <div>
                    <p className="text-gray-400 text-sm mb-2">Beneficiar:</p>
                    <p className="font-semibold">ENORE SALES TYPE S.R.L.</p>
                  </div>

                  <div>
                    <p className="text-gray-400 text-sm mb-2">CUI / Cod Fiscal:</p>
                    <p className="font-semibold font-mono">RO46062613</p>
                  </div>

                  <div>
                    <p className="text-gray-400 text-sm mb-2">Număr TVA:</p>
                    <p className="font-semibold font-mono">RO46062613</p>
                  </div>

                  <div>
                    <p className="text-gray-400 text-sm mb-2">IBAN:</p>
                    <p className="font-semibold font-mono">RO50 INGB 0000 9999 1573 6030</p>
                  </div>

                  <div>
                    <p className="text-gray-400 text-sm mb-2">Banca:</p>
                    <p className="font-semibold">ING</p>
                  </div>

                  <div className="bg-yellow-900/20 border border-yellow-700 rounded p-3 text-sm text-yellow-300 mt-4">
                    <p>
                      💡 Facturile sunt numerotate secvențial în format <code className="bg-black px-1 rounded">INV-YYYY-NNNNN</code>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ANAF VIEW */}
          {viewTab === 'anaf' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* ANAF Submission */}
              <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
                <h2 className="text-xl font-semibold mb-4">🏛️ Trimitere ANAF SPV</h2>
                <p className="text-gray-400 mb-6">
                  Trimite automat facturile la Sistemul de Plăți Vamsal (SPV) al ANAF fără intervenție manuală.
                </p>

                <div className="space-y-4 mb-6">
                  <div className="p-4 bg-purple-900/20 border border-purple-700 rounded">
                    <p className="text-sm text-purple-300">
                      📤 Facturi selectate pentru trimitere: <strong>{selectedInvoices.size}</strong>
                    </p>
                  </div>

                  {anafStatus && (
                    <div
                      className={`p-4 rounded text-sm ${
                        anafStatus.includes('✅')
                          ? 'bg-green-900/20 border border-green-700 text-green-300'
                          : anafStatus.includes('Processing')
                          ? 'bg-blue-900/20 border border-blue-700 text-blue-300'
                          : 'bg-red-900/20 border border-red-700 text-red-300'
                      }`}
                    >
                      {anafStatus}
                    </div>
                  )}

                  <button
                    onClick={submitToANAF}
                    disabled={selectedInvoices.size === 0}
                    className="w-full px-4 py-3 bg-purple-600 text-white font-semibold rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    🚀 Trimite {selectedInvoices.size > 0 ? selectedInvoices.size : ''} Facturi la ANAF SPV
                  </button>

                  <div className="bg-blue-900/20 border border-blue-700 rounded p-4 text-sm text-blue-300">
                    <p className="font-semibold mb-2">⚙️ Proces automat:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Validează format e-invoice</li>
                      <li>Convertește la XML SPV</li>
                      <li>Se conectează la ANAF</li>
                      <li>Trimite secur cu certificat digital</li>
                      <li>Primește răspuns și confirmare</li>
                      <li>Actualizează status factură</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* ANAF Info */}
              <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
                <h2 className="text-xl font-semibold mb-4">ℹ️ Informații ANAF</h2>

                <div className="space-y-4">
                  <div>
                    <p className="text-gray-400 text-sm mb-2">Sistemul ANAF:</p>
                    <p className="font-semibold">SPV - Sistemul de Plăți Vamsal</p>
                  </div>

                  <div>
                    <p className="text-gray-400 text-sm mb-2">Format:</p>
                    <p className="font-semibold">e-Invoice (XML)</p>
                  </div>

                  <div>
                    <p className="text-gray-400 text-sm mb-2">Securitate:</p>
                    <p className="font-semibold">Certificate digital + Criptare TLS 1.2+</p>
                  </div>

                  <div className="bg-green-900/20 border border-green-700 rounded p-4 text-sm text-green-300 mt-4">
                    <p className="font-semibold mb-2">✅ Beneficii trimitere automată:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Nu mai trebuie transmis manual</li>
                      <li>Timestamps automate și verificate</li>
                      <li>Audit trail complet</li>
                      <li>Conformitate 100% ANAF</li>
                      <li>Recuperare automată pe eșec</li>
                    </ul>
                  </div>

                  <div className="bg-yellow-900/20 border border-yellow-700 rounded p-4 text-sm text-yellow-300">
                    <p>
                      📌 <strong>Notă:</strong> Implementarea ANAF SPV integrat necesită certificat digital valid și
                      conectare la API-ul ANAF (în curs de dezvoltare)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

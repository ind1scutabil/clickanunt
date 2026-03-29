'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/hooks/useAdminAuth';
import { fetchWithAuthRefresh, postJsonWithAuthRefresh } from '@/lib/admin-fetch';

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
  const router = useRouter();
  const { isAuthorized, isLoading } = useAdminAuth();
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
  const [inlineMessage, setInlineMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        status: filters.status !== 'all' ? filters.status : '',
        dateRange: filters.dateRange,
        search: filters.searchQuery,
      });

      const res = await fetchWithAuthRefresh(`/api/admin/invoices?${params.toString()}`);

      if (!res.ok) throw new Error('Nu am putut încărca facturile');

      const data = await res.json();
      setInvoices(data.invoices || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la încărcarea facturilor');
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.dateRange, filters.searchQuery]);

  useEffect(() => {
    if (!isLoading && !isAuthorized) {
      router.push('/');
      return;
    }
    if (!isLoading && isAuthorized) {
      void loadInvoices();
    }
  }, [filters.status, filters.dateRange, filters.searchQuery, isAuthorized, isLoading, loadInvoices, router]);

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
      setInlineMessage(null);
      const res = await fetchWithAuthRefresh(`/api/admin/invoices/${invoiceId}/download`);

      if (!res.ok) throw new Error('Descărcarea PDF a eșuat');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      setInlineMessage({ type: 'ok', text: 'PDF descărcat.' });
    } catch (err) {
      setInlineMessage({
        type: 'err',
        text: err instanceof Error ? err.message : 'Eroare la descărcare',
      });
    }
  };

  const downloadMultipleInvoices = async () => {
    try {
      setExportLoading(true);
      setInlineMessage(null);

      const res = await postJsonWithAuthRefresh('/api/admin/invoices/batch-download', {
        invoiceIds: Array.from(selectedInvoices),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error((errBody as { error?: string }).error || 'Arhiva nu a putut fi generată');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoices-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      setInlineMessage({ type: 'ok', text: 'Export CSV batch descărcat.' });
    } catch (err) {
      setInlineMessage({
        type: 'err',
        text: err instanceof Error ? err.message : 'Eroare la descărcare',
      });
    } finally {
      setExportLoading(false);
    }
  };

  const exportToCSV = () => {
    try {
      const headers = ['Invoice Number', 'User', 'Email', 'Amount', 'VAT', 'Total', 'Status', 'Issued Date'];
      const rows = invoices
        .filter((inv) => selectedInvoices.size === 0 || selectedInvoices.has(inv.id))
        .map((inv) => [
          inv.invoiceNumber,
          inv.userName,
          inv.userEmail,
          (((inv.metadata as Record<string, unknown> | null)?.subtotal as number) || 0) / 100,
          (((inv.metadata as Record<string, unknown> | null)?.vatAmount as number) || 0) / 100,
          (inv.amount / 100).toFixed(2),
          inv.status,
          new Date(inv.issuedAt).toLocaleDateString('ro-RO'),
        ]);

      const csv = [headers, ...rows]
        .map((row: (string | number | undefined)[]) => row.map((cell) => `"${cell}"`).join(','))
        .join('\n');

      const blob = new Blob([csv as string], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoices-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      setInlineMessage({ type: 'ok', text: 'Fișier CSV generat.' });
    } catch (err) {
      setInlineMessage({
        type: 'err',
        text: err instanceof Error ? err.message : 'Eroare export CSV',
      });
    }
  };

  const submitToANAF = async () => {
    try {
      setAnafStatus('Se procesează…');

      const res = await postJsonWithAuthRefresh('/api/admin/invoices/submit-anaf', {
        invoiceIds: Array.from(selectedInvoices),
        format: 'e-invoice',
      });

      const data = await res.json();

      if (!res.ok) throw new Error((data as { error?: string }).error || 'Trimitere ANAF eșuată');

      setAnafStatus(
        `Trimise: ${(data as { submitted?: number }).submitted ?? 0} · Eșuate: ${(data as { failed?: number }).failed ?? 0}`
      );

      void loadInvoices();
    } catch (err) {
      setAnafStatus(err instanceof Error ? err.message : 'Eroare');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-white/10 text-[var(--text-secondary)]',
      issued: 'bg-blue-500/20 text-blue-200/95',
      paid: 'bg-emerald-500/20 text-emerald-200/95',
      cancelled: 'bg-red-500/20 text-red-200/95',
    };
    return styles[status as keyof typeof styles] || 'bg-white/10 text-[var(--text-secondary)]';
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

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center">
          <div
            className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-white/15 border-t-[var(--accent-primary)]"
            aria-hidden
          />
          <p className="text-sm text-[var(--text-tertiary)]">Verificare acces admin…</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] px-4">
        <div className="max-w-md rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <p className="text-lg font-semibold text-red-300">Acces respins</p>
          <p className="mt-2 text-sm text-[var(--text-tertiary)]">Nu ai permisiunea pentru această pagină.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[var(--bg-primary)] pb-14 pt-20 text-[var(--text-primary)]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <header className="mb-10 flex flex-col gap-4 border-b border-[var(--border-primary)] pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Finanțe
              </p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Facturi admin</h1>
              <p className="mt-2 max-w-2xl text-sm text-[var(--text-tertiary)]">
                Listă, export CSV și flux ANAF (conform configurării serverului).
              </p>
            </div>
            <Link
              href="/admin/dashboard"
              className="inline-flex shrink-0 items-center justify-center rounded-xl border border-white/[0.1] bg-[var(--bg-elevated)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-focus)] hover:text-[var(--text-primary)]"
            >
              ← Dashboard
            </Link>
          </header>

          {error && (
            <div className="mb-6 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200/95">
              {error}
            </div>
          )}

          {inlineMessage && (
            <div
              className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
                inlineMessage.type === 'ok'
                  ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-100/95'
                  : 'border-red-500/25 bg-red-500/10 text-red-100/95'
              }`}
            >
              {inlineMessage.text}
            </div>
          )}

          <div className="mb-8 flex flex-wrap gap-1 border-b border-white/[0.06] pb-1" role="tablist" aria-label="Vizualizări facturi">
            <button
              type="button"
              role="tab"
              aria-selected={viewTab === 'list'}
              onClick={() => setViewTab('list')}
              className={`rounded-t-lg px-4 py-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] ${
                viewTab === 'list'
                  ? 'border-b-2 border-[var(--accent-secondary)] text-[var(--text-primary)]'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Listă
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewTab === 'export'}
              onClick={() => setViewTab('export')}
              className={`rounded-t-lg px-4 py-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] ${
                viewTab === 'export'
                  ? 'border-b-2 border-[var(--accent-secondary)] text-[var(--text-primary)]'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Export
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewTab === 'anaf'}
              onClick={() => setViewTab('anaf')}
              className={`rounded-t-lg px-4 py-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] ${
                viewTab === 'anaf'
                  ? 'border-b-2 border-[var(--accent-secondary)] text-[var(--text-primary)]'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
              }`}
            >
              ANAF SPV
            </button>
          </div>

          {/* LIST VIEW */}
          {viewTab === 'list' && (
            <>
              {/* Filters */}
              <div className="mb-6 rounded-2xl border border-white/[0.08] bg-[var(--bg-elevated)]/95 p-6 shadow-[var(--shadow-md)]">
                <h2 className="mb-4 text-base font-semibold text-[var(--text-primary)]">Filtre</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[var(--text-tertiary)]">Status</label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value as 'all' | 'draft' | 'issued' | 'paid' | 'cancelled' })}
                      className="enterprise-input w-full rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)]"
                    >
                      <option value="all">Toate</option>
                      <option value="draft">Draft</option>
                      <option value="issued">Emise</option>
                      <option value="paid">Plătite</option>
                      <option value="cancelled">Anulate</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[var(--text-tertiary)]">Perioadă</label>
                    <select
                      value={filters.dateRange}
                      onChange={(e) => setFilters({ ...filters, dateRange: e.target.value as 'today' | 'week' | 'month' | 'all' })}
                      className="enterprise-input w-full rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)]"
                    >
                      <option value="today">Astazi</option>
                      <option value="week">Această săptămână</option>
                      <option value="month">Această lună</option>
                      <option value="all">Toate datele</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-xs font-medium text-[var(--text-tertiary)]">Căutare</label>
                    <input
                      type="text"
                      placeholder="Număr factură, utilizator, email…"
                      value={filters.searchQuery}
                      onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                      className="enterprise-input w-full rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                    />
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-white/[0.08] bg-[var(--bg-elevated)] p-4">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">Facturi (filtrate)</p>
                  <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[var(--text-primary)]">
                    {filteredInvoices.length}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-[var(--bg-elevated)] p-4">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">Total fără TVA</p>
                  <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-emerald-300/95">
                    {((totalAmount - totalVAT) / 100).toFixed(2)} RON
                  </p>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-[var(--bg-elevated)] p-4">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">TVA</p>
                  <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-amber-200/95">
                    {(totalVAT / 100).toFixed(2)} RON
                  </p>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[var(--bg-elevated)]/90 shadow-[var(--shadow-md)]">
                {loading ? (
                  <div className="p-8 text-center text-sm text-[var(--text-tertiary)]">Se încarcă facturile…</div>
                ) : filteredInvoices.length === 0 ? (
                  <div className="p-8 text-center text-sm text-[var(--text-tertiary)]">Nicio factură găsită</div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b border-white/[0.06] bg-[var(--bg-primary)]/50">
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
                              className="border-b border-white/[0.05] transition-colors hover:bg-white/[0.03]"
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
                              <td className="px-4 py-3 text-sm text-[var(--text-muted)]">{invoice.userEmail}</td>
                              <td className="px-4 py-3 text-right font-semibold">
                                {((invoice.amount - (((invoice.metadata as Record<string, unknown> | null)?.vatAmount as number) || 0)) / 100).toFixed(2)} RON
                              </td>
                              <td className="px-4 py-3 text-right text-amber-200/90">
                                {((((invoice.metadata as Record<string, unknown> | null)?.vatAmount as number) || 0) / 100).toFixed(2)} RON
                              </td>
                              <td className="px-4 py-3">
                                <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${getStatusBadge(invoice.status)}`}>
                                  {invoice.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {new Date(invoice.issuedAt).toLocaleDateString('ro-RO')}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => downloadInvoicePDF(invoice.id)}
                                  className="text-sm font-medium text-[var(--accent-secondary)] hover:underline"
                                >
                                  PDF
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
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/[0.08] bg-[var(--bg-elevated)]/95 p-6 shadow-[var(--shadow-md)]">
                <h2 className="mb-2 text-base font-semibold text-[var(--text-primary)]">Export în masă</h2>
                <p className="mb-6 text-sm text-[var(--text-tertiary)]">
                  Selectează rânduri în listă, apoi descarcă CSV agregat (batch) sau export local CSV din datele
                  încărcate.
                </p>

                <div className="mb-6 space-y-3">
                  <div className="rounded-xl border border-white/[0.08] bg-[var(--bg-primary)]/50 px-4 py-3 text-sm text-[var(--text-secondary)]">
                    Facturi selectate:{' '}
                    <span className="font-mono font-semibold text-[var(--text-primary)]">{selectedInvoices.size}</span>
                  </div>

                  <button
                    type="button"
                    onClick={downloadMultipleInvoices}
                    disabled={selectedInvoices.size === 0 || exportLoading}
                    className="w-full rounded-xl bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-dark)] py-3 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {exportLoading ? 'Se generează…' : `Descarcă batch CSV (${selectedInvoices.size})`}
                  </button>

                  <button
                    type="button"
                    onClick={exportToCSV}
                    className="w-full rounded-xl border border-white/[0.1] bg-[var(--bg-secondary)] py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--border-focus)]"
                  >
                    Export CSV (din listă filtrată)
                  </button>
                </div>

                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-200/90">
                  <p className="mb-2 font-medium">Inclus</p>
                  <ul className="list-inside list-disc space-y-1 text-[var(--text-tertiary)]">
                    <li>PDF per factură din coloana „Listă”</li>
                    <li>Batch: CSV unic pentru ID-uri selectate</li>
                    <li>Export rapid CSV din ecranul curent</li>
                  </ul>
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-[var(--bg-elevated)]/95 p-6 shadow-[var(--shadow-md)]">
                <h2 className="mb-4 text-base font-semibold text-[var(--text-primary)]">Date contabilitate</h2>

                <div className="space-y-4 text-sm">
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Beneficiar</p>
                    <p className="font-medium text-[var(--text-primary)]">ENORE SALES TYPE S.R.L.</p>
                  </div>

                  <div>
                    <p className="text-xs text-[var(--text-muted)]">CUI</p>
                    <p className="font-mono font-medium">RO46062613</p>
                  </div>

                  <div>
                    <p className="text-xs text-[var(--text-muted)]">IBAN</p>
                    <p className="font-mono font-medium break-all">RO50 INGB 0000 9999 1573 6030</p>
                  </div>

                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Bancă</p>
                    <p className="font-medium">ING</p>
                  </div>

                  <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-100/90">
                    Numerotare tipică <code className="rounded bg-black/30 px-1">INV-YYYY-NNNNN</code>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ANAF VIEW */}
          {viewTab === 'anaf' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/[0.08] bg-[var(--bg-elevated)]/95 p-6 shadow-[var(--shadow-md)]">
                <h2 className="mb-2 text-base font-semibold text-[var(--text-primary)]">Trimitere ANAF SPV</h2>
                <p className="mb-6 text-sm text-[var(--text-tertiary)]">
                  Fluxul depinde de certificat și configurarea serverului; selectează facturi din listă înainte.
                </p>

                <div className="mb-6 space-y-4">
                  <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3 text-sm text-[var(--text-secondary)]">
                    Selectate pentru trimitere:{' '}
                    <span className="font-mono font-semibold text-[var(--text-primary)]">{selectedInvoices.size}</span>
                  </div>

                  {anafStatus && (
                    <div
                      className={`rounded-xl border p-4 text-sm ${
                        /procesează|processing/i.test(anafStatus)
                          ? 'border-blue-500/25 bg-blue-500/10 text-blue-100/95'
                          : /eroare|error|eșuat|failed/i.test(anafStatus)
                          ? 'border-red-500/25 bg-red-500/10 text-red-100/95'
                          : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-100/95'
                      }`}
                    >
                      {anafStatus}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={submitToANAF}
                    disabled={selectedInvoices.size === 0}
                    className="w-full rounded-xl border border-violet-500/30 bg-violet-600/90 py-3 text-sm font-semibold text-white transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Trimite {selectedInvoices.size > 0 ? `${selectedInvoices.size} ` : ''}facturi
                  </button>

                  <div className="rounded-xl border border-white/[0.08] bg-[var(--bg-primary)]/50 p-4 text-xs text-[var(--text-tertiary)]">
                    <p className="mb-2 font-medium text-[var(--text-secondary)]">Pași estimați</p>
                    <ol className="list-inside list-decimal space-y-1">
                      <li>Validare payload</li>
                      <li>Generare XML / e-factură</li>
                      <li>Transmitere securizată</li>
                      <li>Actualizare status în baza de date</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-[var(--bg-elevated)]/95 p-6 shadow-[var(--shadow-md)]">
                <h2 className="mb-4 text-base font-semibold text-[var(--text-primary)]">Informații</h2>

                <div className="space-y-3 text-sm text-[var(--text-tertiary)]">
                  <p>
                    <span className="text-[var(--text-muted)]">Sistem:</span> SPV (conform documentației ANAF)
                  </p>
                  <p>
                    <span className="text-[var(--text-muted)]">Format:</span> e-Invoice / XML
                  </p>
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-100/90">
                    Integrarea completă necesită certificat calificat și parametri de mediu — verifică echipa
                    operațională înainte de producție.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

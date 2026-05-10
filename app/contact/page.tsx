"use client";

import { useState } from "react";
import Navbar from "@/app/components/Navbar";
import {
  COMPANY_CONFIG,
  isCompanyLegalDetailsPublic,
} from "@/lib/company-config";

const showCompanyLegal = isCompanyLegalDetailsPublic();

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "general",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const subjectToEmail: Record<string, { label: string; email: string; note?: string }> = {
    general: { label: "Contact general", email: "contact@clickanunt.ro" },
    admin: { label: "Administrare platformă", email: COMPANY_CONFIG.emails.admin },
    support: { label: "Suport clienți", email: "support@clickanunt.ro" },
    billing: { label: "Facturare & plăți", email: "billing@clickanunt.ro" },
    technical: { label: "Suport tehnic", email: "support@clickanunt.ro" },
    "gdpr-access": { label: "GDPR - Acces date", email: "dpo@clickanunt.ro" },
    "gdpr-delete": { label: "GDPR - Ștergere date", email: "dpo@clickanunt.ro" },
    "gdpr-rectify": { label: "GDPR - Rectificare", email: "dpo@clickanunt.ro" },
    "gdpr-portability": { label: "GDPR - Portabilitate", email: "dpo@clickanunt.ro" },
    "gdpr-oppose": { label: "GDPR - Opoziție", email: "dpo@clickanunt.ro" },
    abuse: { label: "Raportare abuz", email: "support@clickanunt.ro" },
    business: { label: "Parteneriate", email: "contact@clickanunt.ro" },
  };

  const selectedEmail = subjectToEmail[formData.subject] || subjectToEmail.general;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 5000);
  };

  return (
    <>
      <Navbar />
      <div className="enterprise-page-bg enterprise-mesh min-h-screen text-white">
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-24 md:px-8">
          <header className="mb-10 md:mb-12">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
              Suntem aici pentru tine
            </p>
            <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
              <span className="bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] bg-clip-text text-transparent">
                Contact
              </span>
            </h1>
            <p className="max-w-2xl text-lg text-[var(--text-secondary)]">
              Aveți întrebări sau solicitări GDPR? Completați formularul sau scrieți direct pe adresa dedicată
              subiectului.
            </p>
          </header>

          <div className="grid gap-8 md:grid-cols-2 md:gap-10">
            {/* Contact Form */}
            <div className="enterprise-card rounded-2xl p-6 md:p-8">
              <h2 className="mb-6 text-xl font-semibold text-white">Formular de contact</h2>
              
              {submitted && (
                <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-4 text-sm text-emerald-100">
                  Mesajul a fost înregistrat. Îți vom răspunde în cel mai scurt timp.
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]" htmlFor="name">
                    Nume complet *
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="enterprise-input w-full px-4 py-3"
                    placeholder="Nume și prenume"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]" htmlFor="email">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="enterprise-input w-full px-4 py-3"
                    placeholder="email@exemplu.ro"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]" htmlFor="subject">
                    Subiect *
                  </label>
                  <select
                    id="subject"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="enterprise-input w-full px-4 py-3"
                  >
                    <option value="general">Întrebare generală</option>
                    <option value="admin">Administrare / Cont admin</option>
                    <option value="support">Suport clienți</option>
                    <option value="billing">Facturare & plăți</option>
                    <option value="gdpr-access">GDPR - Solicitare acces date</option>
                    <option value="gdpr-delete">GDPR - Ștergere date</option>
                    <option value="gdpr-rectify">GDPR - Rectificare date</option>
                    <option value="gdpr-portability">GDPR - Portabilitate date</option>
                    <option value="gdpr-oppose">GDPR - Opoziție prelucrare</option>
                    <option value="abuse">Raportare abuz/fraudă</option>
                    <option value="technical">Suport tehnic</option>
                    <option value="business">Colaborare/Parteneriat</option>
                  </select>
                </div>

                <div className="rounded-xl border border-white/10 bg-[var(--bg-secondary)]/80 p-4 text-sm">
                  <div className="mb-1 text-[var(--text-tertiary)]">Rută recomandată pentru acest subiect</div>
                  <a
                    href={`mailto:${selectedEmail.email}`}
                    className="font-semibold text-[var(--accent-secondary)] hover:underline"
                  >
                    {selectedEmail.email}
                  </a>
                  <div className="mt-1 text-[var(--text-muted)]">{selectedEmail.label}</div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]" htmlFor="message">
                    Mesaj *
                  </label>
                  <textarea
                    id="message"
                    required
                    rows={6}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="enterprise-input w-full resize-none px-4 py-3"
                    placeholder="Descrie solicitarea în detaliu..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-dark)] py-3.5 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                >
                  Trimite mesajul
                </button>

                <p className="text-xs text-[var(--text-muted)]">
                  * Câmpuri obligatorii. Prin trimitere ești de acord cu prelucrarea datelor conform{" "}
                  <a href="/privacy" className="text-[var(--accent-secondary)] hover:underline">
                    Politicii de confidențialitate
                  </a>
                  .
                </p>
              </form>
            </div>

            {/* Contact Information */}
            <div className="space-y-6">
              <div className="enterprise-card rounded-2xl p-6 md:p-8">
                <h2 className="mb-6 text-xl font-semibold text-white">Canale oficiale</h2>
                <div className="space-y-5">
                  {[
                    { title: "Email general", mail: "contact@clickanunt.ro", color: "text-emerald-400/95" },
                    { title: "Administrare", mail: COMPANY_CONFIG.emails.admin, color: "text-violet-400/95" },
                    { title: "Suport", mail: "support@clickanunt.ro", color: "text-sky-400/95" },
                    { title: "Facturare", mail: "billing@clickanunt.ro", color: "text-amber-400/95" },
                    { title: "GDPR / DPO", mail: "dpo@clickanunt.ro", color: "text-blue-400/95", note: "Responsabil protecția datelor" },
                  ].map((row) => (
                    <div key={row.mail} className="border-b border-white/[0.06] pb-5 last:border-0 last:pb-0">
                      <h3 className={`mb-1 text-sm font-semibold ${row.color}`}>{row.title}</h3>
                      <a className="text-[var(--text-secondary)] transition hover:text-white" href={`mailto:${row.mail}`}>
                        {row.mail}
                      </a>
                      {"note" in row && row.note && <p className="mt-1 text-xs text-[var(--text-muted)]">{row.note}</p>}
                    </div>
                  ))}
                  <div className="border-b border-white/[0.06] pb-5">
                    <h3 className="mb-1 text-sm font-semibold text-[var(--text-tertiary)]">Notificări automate</h3>
                    <p className="text-[var(--text-secondary)]">noreply@clickanunt.ro</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">Doar pentru mesaje transmise de sistem</p>
                  </div>
                  <div>
                    <h3 className="mb-1 text-sm font-semibold text-[var(--text-tertiary)]">Telefon</h3>
                    <p className="text-[var(--text-secondary)]">+40 XXX XXX XXX</p>
                    <p className="text-xs text-[var(--text-muted)]">Luni–Vineri · 09:00–18:00</p>
                  </div>
                </div>
              </div>

              <div className="enterprise-card rounded-2xl p-6 md:p-8">
                <h2 className="mb-4 text-xl font-semibold text-white">Date societate</h2>
                {showCompanyLegal ? (
                  <div className="space-y-2 text-[var(--text-secondary)]">
                    <p><strong className="text-[var(--text-primary)]">Denumire:</strong> ENORE SALES TYPE S.R.L.</p>
                    <p><strong>CUI/Cod fiscal:</strong> RO46062613</p>
                    <p><strong>Înregistrare TVA:</strong> RO46062613 (Plătitor de TVA)</p>
                    <p><strong>Reg. Com.:</strong> J20220000480181</p>
                    <p><strong>Sediu:</strong> Jud. Gorj, Municipiul Targu Jiu, Aleea Macului, Nr 4, Bl 4, Scara 2, Et 3, Ap 34</p>
                    <p><strong>Email principal:</strong> contact@clickanunt.ro</p>
                    <div className="mt-4 border-t border-white/[0.06] pt-4">
                      <p className="mb-2 text-sm text-[var(--text-tertiary)]"><strong className="text-[var(--text-primary)]">Detalii bancare</strong></p>
                      <p><strong>IBAN:</strong> RO50 INGB 0000 9999 1573 6030</p>
                      <p><strong>Banca:</strong> ING</p>
                      <p><strong>Valută:</strong> RON</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[var(--text-secondary)]">
                    Pentru moment, denumirea legală, adresa și datele de contact telefon ale operatorului nu sunt afișate public.
                    Poți folosi{" "}
                    <a href="mailto:contact@clickanunt.ro" className="text-[var(--accent-secondary)] hover:underline">
                      contact@clickanunt.ro
                    </a>{" "}
                    pentru solicitări oficiale.
                  </p>
                )}
              </div>

              <div className="enterprise-card rounded-2xl border border-blue-500/20 bg-blue-950/20 p-6">
                <h2 className="mb-3 text-lg font-semibold text-white">Autoritate de supraveghere (GDPR)</h2>
                <p className="mb-3 text-sm text-[var(--text-secondary)]">
                  Pentru plângeri legate de protecția datelor personale:
                </p>
                <div className="space-y-1 text-sm text-[var(--text-secondary)]">
                  <p><strong>ANSPDCP</strong></p>
                  <p>B-dul G-ral. Gheorghe Magheru 28-30, Sector 1, București</p>
                  <p>Tel: +40 318 059 211</p>
                  <p>Email: anspdcp@dataprotection.ro</p>
                  <p>
                    <a href="https://www.dataprotection.ro" target="_blank" rel="noopener" className="text-[var(--accent-secondary)] hover:underline">
                      www.dataprotection.ro
                    </a>
                  </p>
                </div>
              </div>

              <div className="enterprise-card rounded-2xl p-6">
                <h2 className="mb-3 text-lg font-semibold text-white">Timp de răspuns</h2>
                <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                  <li><strong className="text-[var(--text-primary)]">GDPR:</strong> până la 30 zile (art. 12)</li>
                  <li><strong className="text-[var(--text-primary)]">General:</strong> 2–3 zile lucrătoare</li>
                  <li><strong className="text-[var(--text-primary)]">Tehnic:</strong> 24–48 ore</li>
                  <li><strong className="text-[var(--text-primary)]">Abuz:</strong> prioritate în 24 h</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="enterprise-card mt-12 rounded-2xl border border-amber-500/25 bg-amber-950/15 p-6 md:p-8">
            <h2 className="mb-3 text-lg font-semibold text-amber-200">Solicitări GDPR</h2>
            <p className="mb-4 text-[var(--text-secondary)]">
              Pentru solicitări de exercitare a drepturilor GDPR, vă rugăm să includeți:
            </p>
            <ul className="ml-4 list-inside list-disc space-y-2 text-[var(--text-secondary)]">
              <li>Email-ul asociat contului dvs. pe platformă</li>
              <li>Tipul de solicitare (acces, ștergere, rectificare, etc.)</li>
              <li>O descriere clară a cererii</li>
              <li>Dovada identității (dacă este necesar)</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}

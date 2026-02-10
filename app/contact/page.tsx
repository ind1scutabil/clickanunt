"use client";

import { useState } from "react";
import Navbar from "@/app/components/Navbar";

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
    admin: { label: "Administrare platformă", email: "admin@clickanunt.ro" },
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
      <div className="min-h-screen bg-[#0A0A0A] text-white pt-24 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-4 text-[#39FF14]">Contact</h1>
          <p className="text-gray-400 mb-8">
            Aveți întrebări? Doriți să ne contactați pentru exercitarea drepturilor GDPR sau alte probleme?
            Completați formularul de mai jos sau folosiți datele de contact.
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Contact Form */}
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
              <h2 className="text-2xl font-semibold mb-6 text-white">Formular de Contact</h2>
              
              {submitted && (
                <div className="mb-4 p-4 bg-green-900/50 border border-green-700 rounded">
                  ✅ Mesajul dvs. a fost trimis cu succes! Vă vom răspunde în cel mai scurt timp.
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" htmlFor="name">
                    Nume complet *
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-3 bg-[#0A0A0A] border border-gray-700 rounded focus:border-[#39FF14] focus:outline-none text-white"
                    placeholder="Nume și prenume"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" htmlFor="email">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-3 bg-[#0A0A0A] border border-gray-700 rounded focus:border-[#39FF14] focus:outline-none text-white"
                    placeholder="email@exemplu.ro"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" htmlFor="subject">
                    Subiect *
                  </label>
                  <select
                    id="subject"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full p-3 bg-[#0A0A0A] border border-gray-700 rounded focus:border-[#39FF14] focus:outline-none text-white"
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

                <div className="bg-gray-800/60 border border-gray-700 rounded p-4 text-sm">
                  <div className="text-gray-400 mb-1">Email dedicat pentru acest subiect</div>
                  <a
                    href={`mailto:${selectedEmail.email}`}
                    className="text-[#39FF14] hover:underline font-bold"
                  >
                    {selectedEmail.email}
                  </a>
                  <div className="text-gray-500 mt-1">{selectedEmail.label}</div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" htmlFor="message">
                    Mesaj *
                  </label>
                  <textarea
                    id="message"
                    required
                    rows={6}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full p-3 bg-[#0A0A0A] border border-gray-700 rounded focus:border-[#39FF14] focus:outline-none resize-none text-white"
                    placeholder="Descrieți solicitarea dvs. în detaliu..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#39FF14] text-black font-semibold rounded hover:bg-[#2DE000] transition-colors"
                >
                  📧 Trimite Mesaj
                </button>

                <p className="text-xs text-gray-500">
                  * Câmpuri obligatorii. Prin trimiterea acestui formular, sunteți de acord cu prelucrarea
                  datelor conform <a href="/privacy" className="text-[#39FF14] hover:underline">Politicii de Confidențialitate</a>.
                </p>
              </form>
            </div>

            {/* Contact Information */}
            <div className="space-y-6">
              <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
                <h2 className="text-2xl font-semibold mb-4 text-white">Date de Contact</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-[#39FF14] mb-2">📧 Email General</h3>
                    <a className="text-gray-300 hover:underline" href="mailto:contact@clickanunt.ro">contact@clickanunt.ro</a>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#9B5CFF] mb-2">🛡️ Admin</h3>
                    <a className="text-gray-300 hover:underline" href="mailto:admin@clickanunt.ro">admin@clickanunt.ro</a>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#00D4FF] mb-2">🆘 Suport</h3>
                    <a className="text-gray-300 hover:underline" href="mailto:support@clickanunt.ro">support@clickanunt.ro</a>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#FFD24C] mb-2">💳 Billing</h3>
                    <a className="text-gray-300 hover:underline" href="mailto:billing@clickanunt.ro">billing@clickanunt.ro</a>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#1E90FF] mb-2">🔐 GDPR / Protecția Datelor</h3>
                    <a className="text-gray-300 hover:underline" href="mailto:dpo@clickanunt.ro">dpo@clickanunt.ro</a>
                    <p className="text-sm text-gray-500">Responsabil Protecția Datelor (DPO)</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#B537F2] mb-2">📨 No-reply (automat)</h3>
                    <p className="text-gray-300">noreply@clickanunt.ro</p>
                    <p className="text-sm text-gray-500">Adresa folosită pentru notificări automate</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">📱 Telefon</h3>
                    <p className="text-gray-300">+40 XXX XXX XXX</p>
                    <p className="text-sm text-gray-500">Luni - Vineri: 09:00 - 18:00</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
                <h2 className="text-2xl font-semibold mb-4 text-white">🏢 Date Societate</h2>
                <div className="space-y-2 text-gray-300">
                  <p><strong>Denumire:</strong> ENORE SALES TYPE S.R.L.</p>
                  <p><strong>CUI/Cod fiscal:</strong> RO46062613</p>
                  <p><strong>Înregistrare TVA:</strong> RO46062613 (Plătitor de TVA)</p>
                  <p><strong>Reg. Com.:</strong> J20220000480181</p>
                  <p><strong>Sediu:</strong> Jud. Gorj, Municipiul Targu Jiu, Aleea Macului, Nr 4, Bl 4, Scara 2, Et 3, Ap 34</p>
                  <p><strong>Email principal:</strong> contact@clickanunt.ro</p>
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <p className="text-sm text-gray-400 mb-2"><strong>Detalii Bancară:</strong></p>
                    <p><strong>IBAN:</strong> RO50 INGB 0000 9999 1573 6030</p>
                    <p><strong>Banca:</strong> ING</p>
                    <p><strong>Valută:</strong> RON</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-900/20 p-6 rounded-lg border border-blue-800">
                <h2 className="text-xl font-semibold mb-3 text-white">⚖️ Autoritatea de Supraveghere GDPR</h2>
                <p className="text-sm text-gray-300 mb-3">
                  Pentru plângeri legate de protecția datelor personale:
                </p>
                <div className="space-y-1 text-sm text-gray-300">
                  <p><strong>ANSPDCP</strong></p>
                  <p>B-dul G-ral. Gheorghe Magheru 28-30, Sector 1, București</p>
                  <p>Tel: +40 318 059 211</p>
                  <p>Email: anspdcp@dataprotection.ro</p>
                  <p>
                    <a href="https://www.dataprotection.ro" target="_blank" rel="noopener" className="text-[#1E90FF] hover:underline">
                      www.dataprotection.ro
                    </a>
                  </p>
                </div>
              </div>

              <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
                <h2 className="text-xl font-semibold mb-3 text-white">⏱️ Timp de Răspuns</h2>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>✅ <strong>Solicitări GDPR:</strong> 30 zile (art. 12 GDPR)</li>
                  <li>✅ <strong>Întrebări generale:</strong> 2-3 zile lucrătoare</li>
                  <li>✅ <strong>Probleme tehnice:</strong> 24-48 ore</li>
                  <li>✅ <strong>Raportări abuz:</strong> 24 ore (prioritate)</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-12 bg-yellow-900/20 p-6 rounded-lg border border-yellow-800">
            <h2 className="text-xl font-semibold mb-3 text-yellow-400">⚠️ Important - Solicitări GDPR</h2>
            <p className="text-gray-300 mb-4">
              Pentru solicitări de exercitare a drepturilor GDPR, vă rugăm să includeți:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
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

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
                    <p className="text-gray-300">contact@autoplatform.ro</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#1E90FF] mb-2">🔐 GDPR / Protecția Datelor</h3>
                    <p className="text-gray-300">dpo@autoplatform.ro</p>
                    <p className="text-sm text-gray-500">Responsabil Protecția Datelor (DPO)</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#FF7900] mb-2">🚨 Raportare Abuzuri</h3>
                    <p className="text-gray-300">abuse@autoplatform.ro</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#B537F2] mb-2">💼 Parteneriate</h3>
                    <p className="text-gray-300">business@autoplatform.ro</p>
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
                  <p><strong>Denumire:</strong> [NUME COMPANIE] S.R.L.</p>
                  <p><strong>CUI:</strong> [CUI]</p>
                  <p><strong>Reg. Com.:</strong> [J__/___/____]</p>
                  <p><strong>Sediu:</strong> [Adresă completă]</p>
                  <p><strong>Email:</strong> contact@autoplatform.ro</p>
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

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-[#1E90FF]">Politica de Confidențialitate și Protecția Datelor (GDPR)</h1>
        <p className="text-sm text-gray-400 mb-8">Data ultimei actualizări: 4 februarie 2026</p>
        
        <div className="space-y-8 text-gray-300">
          <section className="bg-blue-900/20 p-6 rounded-lg border border-blue-800">
            <h2 className="text-2xl font-semibold mb-4 text-white">Angajamentul Nostru</h2>
            <p className="mb-4">
              Ne angajăm să protejăm confidențialitatea datelor dumneavoastră personale conform Regulamentului (UE) 2016/679
              privind protecția datelor cu caracter personal (GDPR) și Legii 190/2018 privind măsuri de punere în aplicare
              a GDPR în România.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">1. Operator de Date</h2>
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 mb-4">
              <p className="mb-2"><strong>Denumire:</strong> [NUME COMPANIE] S.R.L.</p>
              <p className="mb-2"><strong>Sediu social:</strong> [Adresă completă]</p>
              <p className="mb-2"><strong>CUI:</strong> [CUI]</p>
              <p className="mb-2"><strong>Email contact GDPR:</strong> dpo@autoplatform.ro</p>
              <p className="mb-2"><strong>Responsabil Protecția Datelor (DPO):</strong> [Nume DPO]</p>
            </div>
            <p className="text-sm text-gray-400">
              În cazul în care aveți întrebări sau solicitări legate de datele personale, ne puteți contacta
              prin formularul de <a href="/contact" className="text-[#1E90FF] hover:underline">contact</a> sau la adresa de email menționată.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">2. Ce Date Personale Colectăm</h2>
            <h3 className="text-xl font-semibold mb-3 text-[#1E90FF]">2.1. Date de Identificare</h3>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li><strong>La înregistrare:</strong> email, parolă (criptată)</li>
              <li><strong>Profil utilizator:</strong> date de contact (opțional)</li>
              <li><strong>Persoane juridice:</strong> denumire firmă, CUI, nr. registru comerțului</li>
            </ul>
            <h3 className="text-xl font-semibold mb-3 text-[#1E90FF]">2.2. Date de Utilizare</h3>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li>Adresă IP și date de conectare</li>
              <li>Tip browser, sistem de operare, dispozitiv</li>
              <li>Pagini vizitate, anunțuri vizualizate, căutări efectuate</li>
              <li>Cookie-uri (detalii în secțiunea 8)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">3. Drepturile Dvs. (conform GDPR)</h2>
            <div className="bg-blue-900/20 p-6 rounded-lg border border-blue-800 mb-4">
              <h3 className="text-xl font-semibold mb-3 text-[#1E90FF]">✅ Aveți următoarele drepturi:</h3>
              <ul className="space-y-3">
                <li>
                  <strong className="text-white">🔍 Dreptul de acces (Art. 15 GDPR)</strong><br />
                  <span className="text-sm">Puteți solicita o copie a datelor personale pe care le procesăm.</span>
                </li>
                <li>
                  <strong className="text-white">✏️ Dreptul la rectificare (Art. 16)</strong><br />
                  <span className="text-sm">Puteți corecta datele incorecte din contul dvs.</span>
                </li>
                <li>
                  <strong className="text-white">🗑️ Dreptul la ștergere (Art. 17)</strong><br />
                  <span className="text-sm">Puteți solicita ștergerea datelor ("dreptul de a fi uitat").</span>
                </li>
                <li>
                  <strong className="text-white">⛔ Dreptul la restricționarea prelucrării (Art. 18)</strong><br />
                  <span className="text-sm">Puteți solicita suspendarea temporară a prelucrării.</span>
                </li>
                <li>
                  <strong className="text-white">📦 Dreptul la portabilitatea datelor (Art. 20)</strong><br />
                  <span className="text-sm">Puteți primi datele într-un format structurat (JSON/CSV).</span>
                </li>
                <li>
                  <strong className="text-white">🚫 Dreptul la opoziție (Art. 21)</strong><br />
                  <span className="text-sm">Vă puteți opune prelucrării pentru marketing direct.</span>
                </li>
              </ul>
            </div>
            <h3 className="text-xl font-semibold mb-3 text-[#1E90FF]">📧 Cum să vă exercitați drepturile</h3>
            <p className="mb-4">
              Trimiteți o solicitare la <strong className="text-white">dpo@autoplatform.ro</strong> sau folosiți
              formularul de <a href="/contact" className="text-[#1E90FF] hover:underline">contact</a>.
              Vom răspunde în termen de 30 zile (conform art. 12 GDPR).
            </p>
            <h3 className="text-xl font-semibold mb-3 text-[#1E90FF]">⚖️ Dreptul de a depune plângere</h3>
            <div className="bg-gray-900 p-4 rounded border border-gray-700 mt-4">
              <p><strong>ANSPDCP</strong> - Autoritatea Națională de Supraveghere</p>
              <p className="text-sm">B-dul G-ral. Gheorghe Magheru 28-30, Sector 1, București</p>
              <p className="text-sm">Tel: +40 318 059 211 | Email: anspdcp@dataprotection.ro</p>
              <p className="text-sm">Website: <a href="https://www.dataprotection.ro" target="_blank" rel="noopener" className="text-[#1E90FF] hover:underline">www.dataprotection.ro</a></p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">4. Securitatea Datelor</h2>
            <p className="mb-4">Implementăm măsuri tehnice și organizatorice:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li>🔒 Criptare SSL/TLS (HTTPS)</li>
              <li>🔐 Criptare parole cu bcrypt</li>
              <li>☁️ Backup regulat cu criptare</li>
              <li>🛡️ Firewall și protecție DDoS</li>
              <li>👥 Acces restricționat - doar personal autorizat</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">5. Cookie-uri</h2>
            <p className="mb-4">Utilizăm cookie-uri pentru:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li><strong>Esențiale:</strong> Autentificare, securitate (nu necesită consimțământ)</li>
              <li><strong>Funcționale:</strong> Reținerea preferințelor</li>
              <li><strong>Analitice:</strong> Statistici de vizitare anonimizate</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">6. Legislație Aplicabilă</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>📘 Regulamentul (UE) 2016/679 - GDPR</li>
              <li>📗 Legea 190/2018 - implementarea GDPR în România</li>
              <li>📕 Legea 506/2004 - protecția datelor în comunicații</li>
              <li>📙 Legea 365/2002 - comerțul electronic</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">7. Contact</h2>
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
              <p className="mb-2"><strong>📧 Email GDPR:</strong> dpo@autoplatform.ro</p>
              <p className="mb-2"><strong>📝 Formular:</strong> <a href="/contact" className="text-[#1E90FF] hover:underline">Contact</a></p>
              <p className="text-sm text-gray-400 mt-4">
                Vom răspunde solicitărilor în termen de 30 zile calendaristice conform art. 12(3) GDPR.
              </p>
            </div>
          </section>

          <section className="mt-12 pt-8 border-t border-gray-800">
            <p className="text-sm text-gray-500">
              Prin utilizarea Platformei, confirmați că ați citit și înțeles modul în care prelucrăm datele
              dumneavoastră personale conform GDPR și legislației aplicabile.
            </p>
            <p className="text-xs text-gray-600 mt-4">
              Ultima actualizare: 4 februarie 2026
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

import { isCompanyLegalDetailsPublic } from "@/lib/company-config";

export default function TermsPage() {
  const showCompanyLegal = isCompanyLegalDetailsPublic();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-[#FF7900]">Termeni și Condiții</h1>
        <p className="text-sm text-gray-400 mb-8">Data ultimei actualizări: 4 februarie 2026</p>
        
        <div className="space-y-8 text-gray-300">
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">1. Informații Generale</h2>
            <p className="mb-4">
              Prezentul document stabilește termenii și condițiile de utilizare a platformei de anunțuri clasificate
              disponibilă la adresa www.clickanunt.ro (denumită în continuare &quot;Platforma&quot;), operată de un
              operator comercial înregistrat în România
              {showCompanyLegal ? (
                <>
                  : ENORE SALES TYPE S.R.L. cu sediul în Jud. Gorj, Municipiul Targu Jiu, Aleea Macului, Nr 4, Bl 4,
                  Scara 2, Et 3, Ap 34, CUI 46062613, număr de înregistrare la Registrul Comerțului J20220000480181.
                </>
              ) : (
                <>
                  . Denumirea legală, sediul și identificatorii de înregistrare sunt disponibile la solicitare prin
                  pagina de{" "}
                  <a href="/contact" className="text-[#FF7900] hover:underline">
                    contact
                  </a>
                  .
                </>
              )}
            </p>
            <p className="mb-4">
              Utilizarea Platformei presupune acceptarea integrală și neconditionată a prezentelor Termeni și Condiții.
              Dacă nu sunteți de acord cu acești termeni, vă rugăm să nu utilizați Platforma.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">2. Definiții</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Platformă</strong>: site-ul web și aplicația mobilă prin care se publică și se consultă anunțuri</li>
              <li><strong>Utilizator</strong>: orice persoană fizică sau juridică care accesează Platforma</li>
              <li><strong>Cont</strong>: spațiul personal creat de Utilizator pentru gestionarea anunțurilor</li>
              <li><strong>Anunț</strong>: informații și imagini despre bunuri/servicii publicate de Utilizatori</li>
              <li><strong>Operator</strong>: societatea comercială ce administrează Platforma</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">3. Crearea și Utilizarea Contului</h2>
            <h3 className="text-xl font-semibold mb-3 text-gray-200">3.1 Înregistrare</h3>
            <p className="mb-4">
              Pentru a publica anunțuri, Utilizatorul trebuie să își creeze un cont furnizând informații
              corecte și complete. Este interzisă crearea de conturi false sau utilizarea identității altei persoane.
            </p>
            <h3 className="text-xl font-semibold mb-3 text-gray-200">3.2 Securitate</h3>
            <p className="mb-4">
              Utilizatorul este responsabil pentru păstrarea confidențialității datelor de autentificare
              și pentru toate activitățile desfășurate sub contul său.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">4. Publicarea Anunțurilor</h2>
            <p className="mb-4">Prin publicarea unui anunț, Utilizatorul garantează că:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li>Deține dreptul legal de a vinde/închiria bunul sau de a oferi serviciul</li>
              <li>Informațiile furnizate sunt veridice și complete</li>
              <li>Imaginile prezentate corespund bunului/serviciului oferit</li>
              <li>Prețul afișat este real și include toate taxele obligatorii</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">5. Conținut Interzis</h2>
            <p className="mb-4">Este strict interzisă publicarea de:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Bunuri furate, contrafăcute sau obținute ilegal</li>
              <li>Arme, muniție, explozivi sau materiale periculoase</li>
              <li>Droguri, substanțe interzise sau medicamente fără prescripție</li>
              <li>Conținut pornografic, violent sau care incită la ură</li>
              <li>Documente false, carduri bancare clonate</li>
              <li>Servicii ilegale sau care încalcă ordinea publică</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">6. Moderare și Sancțiuni</h2>
            <p className="mb-4">
              Operatorul își rezervă dreptul de a modera, edita sau șterge orice anunț care:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li>Încalcă prezentele Termeni și Condiții</li>
              <li>Conține informații false sau înșelătoare</li>
              <li>Este plasat în categoria greșită</li>
              <li>Conține SPAM sau legături către alte site-uri</li>
            </ul>
            <p className="mb-4">
              În cazul încălcărilor repetate, contul Utilizatorului poate fi suspendat sau închis definitiv,
              fără drept de restituire a sumelor plătite pentru servicii premium.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">7. Servicii Plătite</h2>
            <h3 className="text-xl font-semibold mb-3 text-gray-200">7.1 Pachete de Promovare</h3>
            <p className="mb-4">
              Platforma oferă pachete de promovare a anunțurilor cu următoarele caracteristici:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li><strong>Anunț Evidențiat (7 zile)</strong>: 29 RON + TVA</li>
              <li><strong>Anunț Evidențiat (30 zile)</strong>: 99 RON + TVA</li>
              <li><strong>Poziție Top (1 zi)</strong>: 15 RON + TVA</li>
              <li><strong>Banner Homepage (7 zile)</strong>: 149 RON + TVA</li>
            </ul>
            <h3 className="text-xl font-semibold mb-3 text-gray-200">7.2 Plăți și Facturare</h3>
            <p className="mb-4">
              Plățile se efectuează online (card bancar, PayPal) sau prin transfer bancar pentru situațiile agreate.
              Facturile se emit automat în conformitate cu legislația fiscală română și sunt trimise prin email 
              în 24 de ore de la procesarea plății.
            </p>
            <div className="bg-blue-900/20 border border-blue-700 rounded p-4 mb-4">
              <h4 className="font-semibold text-white mb-3">Detalii Plăți și Facturare:</h4>
              {showCompanyLegal ? (
                <div className="space-y-2 text-sm">
                  <p><strong>Entitate furnizor:</strong> ENORE SALES TYPE S.R.L.</p>
                  <p><strong>CUI (Cod Unic de Identificare):</strong> RO46062613</p>
                  <p><strong>Număr de înregistrare TVA:</strong> RO46062613 (Plătitor de TVA)</p>
                  <p><strong>Înregistrare Registrul Comerțului:</strong> J20220000480181</p>
                  <p><strong>Sediu:</strong> Jud. Gorj, Municipiul Targu Jiu, Aleea Macului, Nr 4, Bl 4, Scara 2, Et 3, Ap 34</p>
                  <p><strong>IBAN:</strong> RO50 INGB 0000 9999 1573 6030</p>
                  <p><strong>Banca:</strong> ING</p>
                  <p><strong>Monedă:</strong> RON</p>
                  <p><strong>Rata TVA:</strong> 19% (pe toate serviciile plătite)</p>
                  <p><strong>Contact plăți:</strong> billing@clickanunt.ro</p>
                </div>
              ) : (
                <p className="text-sm">
                  Datele complete de facturare (furnizor, sediu, cont bancar) se comunică pe email după procesarea plății
                  sau la solicitare la{" "}
                  <a href="mailto:billing@clickanunt.ro" className="text-[#FF7900] hover:underline">
                    billing@clickanunt.ro
                  </a>
                  .
                </p>
              )}
            </div>
            <h3 className="text-xl font-semibold mb-3 text-gray-200">7.3 Rambursări</h3>
            <p className="mb-4">
              Sumele plătite pentru servicii premium nu sunt rambursabile, cu excepția cazurilor
              în care anunțul este șters de către Operator pentru nerespectarea regulamentului.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">8. Proprietate Intelectuală</h2>
            <p className="mb-4">
              Prin publicarea unui anunț, Utilizatorul acordă Operatorului o licență neexclusivă,
              gratuită și transferabilă de utilizare a conținutului (texte, imagini) în scopuri
              de afișare pe Platformă și în materiale promoționale.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">9. Limitarea Răspunderii</h2>
            <p className="mb-4">
              Platforma funcționează ca intermediar între vânzători și cumpărători.
              Operatorul nu este parte în tranzacțiile comerciale și nu garantează:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li>Calitatea, legalitatea sau autenticitatea bunurilor/serviciilor</li>
              <li>Capacitatea vânzătorilor de a livra produsele</li>
              <li>Solvabilitatea cumpărătorilor</li>
            </ul>
            <p className="mb-4">
              Utilizatorul este singurul responsabil pentru verificarea bunurilor înainte de cumpărare
              și pentru respectarea acordurilor încheiate cu alte părți.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">10. Protecția Datelor Personale</h2>
            <p className="mb-4">
              Colectarea și prelucrarea datelor personale se realizează conform Regulamentului (UE) 2016/679 (GDPR)
              și Legii 190/2018. Detalii complete în{' '}
              <a href="/privacy" className="text-[#FF7900] hover:underline">Politica de Confidențialitate</a>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">11. Modificări ale Termenilor</h2>
            <p className="mb-4">
              Operatorul își rezervă dreptul de a modifica prezentele Termeni și Condiții în orice moment.
              Utilizatorii vor fi notificați prin email sau prin afișare pe Platformă.
              Continuarea utilizării după notificare constituie acceptarea noilor termeni.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">12. Legea Aplicabilă și Jurisdicție</h2>
            <p className="mb-4">
              Prezentele Termeni și Condiții sunt guvernate de legea română. Orice litigiu va fi
              soluționat pe cale amiabilă sau, în lipsa unui acord, de către instanțele competente
              din România.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">13. Contact</h2>
            <p className="mb-4">
              Pentru întrebări legate de acești Termeni și Condiții, ne puteți contacta la:
            </p>
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
              <p className="mb-2"><strong>Email:</strong> admin@clickanunt.ro</p>
              <p className="mb-2"><strong>Telefon:</strong> +40 XXX XXX XXX</p>
              {showCompanyLegal && (
                <p className="mb-2">
                  <strong>Adresă:</strong> Jud. Gorj, Municipiul Targu Jiu, Aleea Macului, Nr 4, Bl 4, Scara 2, Et 3, Ap 34
                </p>
              )}
            </div>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 text-center">
          <p className="text-gray-400">
            Ultima actualizare: 4 februarie 2026
          </p>
          <p className="text-sm text-gray-500 mt-2">
            © 2026 AutoPlatform. Toate drepturile rezervate.
          </p>
        </div>
      </div>
    </div>
  );
}

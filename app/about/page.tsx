import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-6xl md:text-7xl font-black mb-6">
            <span className="text-white">Despre </span>
            <span className="neon-text bg-clip-text text-transparent bg-gradient-to-r from-[#FF7900] to-[#FFB84D]">
              ClickAnunț
            </span>
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Platforma #1 de anunțuri gratuite din România. Conectăm cumpărători și vânzători
            din toată țara într-un mediu sigur și transparent.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
          <div className="glass-dark rounded-2xl p-8 border-2 border-[#2A2A2A] text-center">
            <div className="text-5xl font-black bg-gradient-to-r from-[#FF7900] to-[#FFB84D] bg-clip-text text-transparent mb-2">
              50K+
            </div>
            <div className="text-gray-400 font-bold">Anunțuri active</div>
          </div>
          <div className="glass-dark rounded-2xl p-8 border-2 border-[#2A2A2A] text-center">
            <div className="text-5xl font-black bg-gradient-to-r from-[#1E90FF] to-[#4DA6FF] bg-clip-text text-transparent mb-2">
              100K+
            </div>
            <div className="text-gray-400 font-bold">Utilizatori</div>
          </div>
          <div className="glass-dark rounded-2xl p-8 border-2 border-[#2A2A2A] text-center">
            <div className="text-5xl font-black bg-gradient-to-r from-[#39FF14] to-[#00FF00] bg-clip-text text-transparent mb-2">
              1M+
            </div>
            <div className="text-gray-400 font-bold">Vizitatori/lună</div>
          </div>
          <div className="glass-dark rounded-2xl p-8 border-2 border-[#2A2A2A] text-center">
            <div className="text-5xl font-black bg-gradient-to-r from-[#B537F2] to-[#7B2BF9] bg-clip-text text-transparent mb-2">
              4.8★
            </div>
            <div className="text-gray-400 font-bold">Rating mediu</div>
          </div>
        </div>

        {/* Mission */}
        <div className="glass-dark rounded-3xl p-12 border-2 border-[#2A2A2A] mb-12">
          <h2 className="text-4xl font-black text-white mb-6">Misiunea noastră</h2>
          <p className="text-lg text-gray-300 leading-relaxed mb-6">
            Am creat ClickAnunț pentru a oferi românilor o platformă modernă, rapidă și 100%
            gratuită unde pot vinde și cumpăra orice, de la mașini și apartamente până la
            telefoane și biciclete.
          </p>
          <p className="text-lg text-gray-300 leading-relaxed">
            Credem în transparență, siguranță și simplitate. De aceea, fiecare anunț este
            verificat automat, iar utilizatorii noștri beneficiază de protecție completă
            împotriva fraudelor.
          </p>
        </div>

        {/* Values */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="glass-dark rounded-2xl p-8 border-2 border-[#2A2A2A] hover:border-[#FF7900] transition-all">
            <div className="w-16 h-16 bg-gradient-to-br from-[#FF7900] to-[#E66D00] rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-white mb-3">100% Securitate</h3>
            <p className="text-gray-400 leading-relaxed">
              Toate anunțurile sunt verificate automat și manual pentru siguranța ta maximă.
              Zero toleranță pentru fraudă.
            </p>
          </div>

          <div className="glass-dark rounded-2xl p-8 border-2 border-[#2A2A2A] hover:border-[#1E90FF] transition-all">
            <div className="w-16 h-16 bg-gradient-to-br from-[#1E90FF] to-[#4DA6FF] rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-white mb-3">Super Rapid</h3>
            <p className="text-gray-400 leading-relaxed">
              Publică un anunț în mai puțin de 2 minute. Fără formularebirocrație sau
              complicații.
            </p>
          </div>

          <div className="glass-dark rounded-2xl p-8 border-2 border-[#2A2A2A] hover:border-[#39FF14] transition-all">
            <div className="w-16 h-16 bg-gradient-to-br from-[#39FF14] to-[#00FF00] rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-white mb-3">100% Gratuit</h3>
            <p className="text-gray-400 leading-relaxed">
              Zero costuri, zero comisioane. Publică anunțuri nelimitat, complet gratuit, pentru
              totdeauna.
            </p>
          </div>
        </div>

        {/* Team */}
        <div className="glass-dark rounded-3xl p-12 border-2 border-[#2A2A2A] mb-12">
          <h2 className="text-4xl font-black text-white mb-8 text-center">Echipa noastră</h2>
          <p className="text-lg text-gray-300 text-center max-w-3xl mx-auto leading-relaxed mb-12">
            Suntem o echipă tânără și pasionată de tehnologie, dedicată să construim cea mai
            bună platformă de anunțuri din România.
          </p>
          <div className="text-center">
            <Link
              href="/contact"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-[#FF7900] to-[#E66D00] hover:from-[#E66D00] hover:to-[#FF7900] text-white px-8 py-4 rounded-xl font-black text-lg transition-all shadow-[0_0_30px_rgba(255,121,0,0.5)]"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
              Contactează-ne
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

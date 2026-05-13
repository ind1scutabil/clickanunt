"use client";

import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import Link from "next/link";
import { Button, Card, Badge } from "@/app/components/ui";

export default function SecurityPage() {
  return (
    <>
      <Navbar />
      
      <main className="min-h-screen bg-[#0F1117]">
        {/* Hero */}
        <section className="relative py-20 md:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(0,212,255,0.1),_transparent_50%)]" />
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <Badge variant="success" className="mb-6">Securitate & Încredere</Badge>
              <h1 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight">
                Tranzacționează cu
                <span className="block mt-2 bg-gradient-to-r from-[#00D4FF] to-[#6D5BFF] bg-clip-text text-transparent">
                  încredere maximă
                </span>
              </h1>
              <p className="text-xl text-white/70 mb-8 leading-relaxed">
                Sistemul nostru multi-strat de protecție te ferește de fraudă, spam și anunțuri false. Moderare 24/7, verificări automate și echipă dedicată securității.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="#how-it-works">
                  <Button variant="primary" size="lg">
                    Vezi cum funcționează
                  </Button>
                </Link>
                <Link href="#report">
                  <Button variant="secondary" size="lg">
                    Raportează probleme
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Stats */}
        <section className="py-16 border-y border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { value: "99.2%", label: "Anunțuri legitime", icon: "✅" },
                { value: "<15min", label: "Timp mediu verificare", icon: "⚡" },
                { value: "24/7", label: "Monitorizare activă", icon: "👁️" },
                { value: "5.000+", label: "Anunțuri respinse/lună", icon: "🛡️" }
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-4xl mb-2">{stat.icon}</div>
                  <div className="text-3xl md:text-4xl font-black text-white mb-1">{stat.value}</div>
                  <div className="text-sm text-white/60">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-20 md:py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
                Cum te protejăm
              </h2>
              <p className="text-xl text-white/60">Proces în 5 etape pentru siguranță maximă</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {[
                {
                  step: "1",
                  title: "Verificare automată AI",
                  description: "Fiecare anunț este scanat de AI pentru detectarea fraudelor, prețuri suspecte și conținut duplicat.",
                  icon: "🤖"
                },
                {
                  step: "2",
                  title: "Validare imagini",
                  description: "Verificăm că imaginile nu sunt furate de pe alte site-uri și corespund descrierii anunțului.",
                  icon: "🖼️"
                },
                {
                  step: "3",
                  title: "Verificare contact",
                  description: "Validăm emailul și telefonul vânzătorului pentru a elimina bot-urile și spam-ul.",
                  icon: "📧"
                },
                {
                  step: "4",
                  title: "Moderare umană",
                  description: "Echipa noastră de moderatori revizuiește manual anunțurile flagate ca suspecte.",
                  icon: "👤"
                },
                {
                  step: "5",
                  title: "Monitorizare continuă",
                  description: "Urmărim comportamentul utilizatorilor și răspundem rapid la raportările comunității.",
                  icon: "📊"
                }
              ].map((item, i) => (
                <Card key={i} className="p-8 bg-[#161B22] border-white/5 hover:border-secondary-500/50 transition-all">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-secondary-500/20 flex items-center justify-center text-secondary-500 font-black text-xl">
                      {item.step}
                    </div>
                    <div className="text-4xl">{item.icon}</div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                  <p className="text-white/60 leading-relaxed">{item.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Protection Features */}
        <section className="py-20 md:py-32 bg-[#161B22]/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
                Măsuri de protecție
              </h2>
              <p className="text-xl text-white/60">Tehnologie și proceduri pentru siguranța ta</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {[
                {
                  icon: "🔒",
                  title: "Criptare end-to-end",
                  description: "Toate datele tale personale sunt criptate cu standard bancar (AES-256). Nu stocăm carduri sau date sensibile."
                },
                {
                  icon: "🛡️",
                  title: "Protecție DDoS",
                  description: "Infrastructură Cloudflare Enterprise pentru protecție împotriva atacurilor și downtime minim."
                },
                {
                  icon: "👁️",
                  title: "Monitorizare fraude",
                  description: "Detectăm pattern-uri suspecte: conturi multiple, anunțuri spam, phishing și tentative de escrocherie."
                },
                {
                  icon: "📝",
                  title: "GDPR Compliant",
                  description: "Respectăm strict regulamentele europene de protecție a datelor. Ai control complet asupra informațiilor tale."
                },
                {
                  icon: "🚨",
                  title: "Raportare rapidă",
                  description: "Buton \"Raportează\" pe fiecare anunț. Echipa răspunde în maxim 2 ore la raportări serioase."
                },
                {
                  icon: "🔐",
                  title: "Autentificare 2FA",
                  description: "Protecție suplimentară pentru contul tău cu autentificare în doi pași (TOTP standard)."
                }
              ].map((feature, i) => (
                <Card key={i} className="p-8 bg-[#161B22] border-white/5">
                  <div className="flex items-start gap-4">
                    <div className="text-5xl flex-shrink-0">{feature.icon}</div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                      <p className="text-white/60 leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* User Tips */}
        <section className="py-20 md:py-32">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
                Sfaturi pentru siguranță
              </h2>
              <p className="text-xl text-white/60">Cum să te protejezi când cumperi sau vinzi</p>
            </div>

            <div className="space-y-6">
              {[
                {
                  emoji: "✅",
                  title: "CE SĂ FACI",
                  tips: [
                    "Verifică profilul vânzătorului (reviews, număr anunțuri, cont verificat)",
                    "Cere poze reale și actuale (nu doar din catalog)",
                    "Întâlnește-te într-un loc public pentru tranzacție",
                    "Verifică produsul înainte de plată",
                    "Folosește metode de plată sigure (transfer bancar, ramburs)"
                  ],
                  variant: "success"
                },
                {
                  emoji: "❌",
                  title: "CE SĂ EVIȚI",
                  tips: [
                    "NU trimite bani înainte să vezi produsul",
                    "NU dai date personale sensibile (CNP, PIN, parolă)",
                    "NU accesezi link-uri suspecte trimise în mesaje",
                    "NU accepți propuneri \"prea bune ca să fie adevărate\"",
                    "NU te întâlni la adrese necunoscute fără să anunți pe cineva"
                  ],
                  variant: "error"
                }
              ].map((section, i) => (
                <Card 
                  key={i} 
                  className={`p-8 ${
                    section.variant === 'success' 
                      ? 'bg-success-500/10 border-success-500/30' 
                      : 'bg-error-500/10 border-error-500/30'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <span className="text-4xl">{section.emoji}</span>
                    <h3 className="text-2xl font-black text-white">{section.title}</h3>
                  </div>
                  <ul className="space-y-3">
                    {section.tips.map((tip, j) => (
                      <li key={j} className="flex items-start gap-3 text-white/70">
                        <span className={`inline-block w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                          section.variant === 'success' ? 'bg-success-500' : 'bg-error-500'
                        }`} />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Report CTA */}
        <section id="report" className="py-20 md:py-32 bg-[#161B22]/30">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="p-12 bg-gradient-to-br from-error-500/10 to-warning-500/10 border-error-500/20 text-center">
              <div className="text-6xl mb-6">🚨</div>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
                Ai întâlnit ceva suspect?
              </h2>
              <p className="text-xl text-white/70 mb-8">
                Raportează-ne imediat. Răspundem în maxim 2 ore la raportări serioase și luăm măsuri rapide împotriva fraudatorilor.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button variant="primary" size="lg">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Raportează Anunț
                </Button>
                <Button variant="secondary" size="lg">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  security@clickanunt.ro
                </Button>
              </div>
              <p className="text-sm text-white/50 mt-6">
                Confidențialitate garantată. Raportările sunt anonime.
              </p>
            </Card>
          </div>
        </section>

        {/* Legal Links */}
        <section className="py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap justify-center gap-6 text-white/60">
              <Link href="/terms" className="hover:text-white transition">
                Termeni și Condiții
              </Link>
              <span>•</span>
              <Link href="/privacy" className="hover:text-white transition">
                Politica de Confidențialitate
              </Link>
              <span>•</span>
              <Link href="/cookies" className="hover:text-white transition">
                Politica Cookies
              </Link>
              <span>•</span>
              <Link href="/gdpr" className="hover:text-white transition">
                Drepturi GDPR
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

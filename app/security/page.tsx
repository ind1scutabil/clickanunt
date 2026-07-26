"use client";

import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import Link from "next/link";
import { Button, Card, Badge } from "@/app/components/ui";

/**
 * Security / trust page — only claims backed by product behaviour:
 * moderation workflow, scam scoring signals, user reporting, admin 2FA.
 * Avoid invented SLAs, encryption marketing, or unverified image-theft claims.
 */
export default function SecurityPage() {
  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#0F1117]">
        <section className="relative py-20 md:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(0,212,255,0.1),_transparent_50%)]" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <Badge variant="success" className="mb-6">
                Securitate & Încredere
              </Badge>
              <h1 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight">
                Cum protejăm
                <span className="block mt-2 bg-gradient-to-r from-[#00D4FF] to-[#6D5BFF] bg-clip-text text-transparent">
                  marketplace-ul
                </span>
              </h1>
              <p className="text-xl text-white/70 mb-8 leading-relaxed">
                Anunțurile publice trec prin moderare. Semnalele de risc (scam scoring) ajută la
                prioritizarea verificărilor. Poți raporta un anunț suspect din pagina acestuia.
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

        <section id="how-it-works" className="py-20 md:py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-black text-white mb-4">Cum te protejăm</h2>
              <p className="text-xl text-white/60">Măsuri reale din produs — fără promisiuni nedemonstrate</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {[
                {
                  step: "1",
                  title: "Moderare anunțuri",
                  description:
                    "Anunțurile publice apar după aprobare. Statusurile de moderare controlează ce este vizibil în catalog.",
                  icon: "👤",
                },
                {
                  step: "2",
                  title: "Semnale de risc (scam scoring)",
                  description:
                    "Sistemul evaluează semnale de risc pe anunțuri pentru a ajuta moderatorii să prioritizeze cazurile suspecte.",
                  icon: "📊",
                },
                {
                  step: "3",
                  title: "Raportare din comunitate",
                  description:
                    "Fiecare anunț poate fi raportat. Echipa analizează sesizările și poate ascunde sau respinge conținutul problematic.",
                  icon: "🚨",
                },
                {
                  step: "4",
                  title: "Verificare contact pe cont",
                  description:
                    "Profilurile pot afișa starea de verificare email/telefon unde utilizatorul a finalizat pașii din cont.",
                  icon: "📧",
                },
                {
                  step: "5",
                  title: "2FA pentru administratori",
                  description:
                    "Conturile de administrare pot folosi autentificare în doi pași (TOTP) pentru accesul la instrumentele de moderare.",
                  icon: "🔐",
                },
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

        <section className="py-20 md:py-32 bg-[#161B22]/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-black text-white mb-4">Ce poți face tu</h2>
              <p className="text-xl text-white/60">Practici simple la cumpărare și vânzare</p>
            </div>

            <div className="space-y-6 max-w-5xl mx-auto">
              {[
                {
                  emoji: "✅",
                  title: "CE SĂ FACI",
                  tips: [
                    "Verifică profilul vânzătorului și istoricul anunțurilor",
                    "Cere poze reale și actuale",
                    "Întâlnește-te într-un loc public pentru tranzacție",
                    "Verifică produsul înainte de plată",
                    "Raportează anunțurile suspecte din pagina anunțului",
                  ],
                  variant: "success",
                },
                {
                  emoji: "❌",
                  title: "CE SĂ EVIȚI",
                  tips: [
                    "NU trimite bani înainte să vezi produsul",
                    "NU dai date personale sensibile (CNP, PIN, parolă)",
                    "NU accesezi link-uri suspecte trimise în mesaje",
                    "NU accepți propuneri „prea bune ca să fie adevărate”",
                  ],
                  variant: "error",
                },
              ].map((section, i) => (
                <Card
                  key={i}
                  className={`p-8 ${
                    section.variant === "success"
                      ? "bg-success-500/10 border-success-500/30"
                      : "bg-error-500/10 border-error-500/30"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <span className="text-4xl">{section.emoji}</span>
                    <h3 className="text-2xl font-black text-white">{section.title}</h3>
                  </div>
                  <ul className="space-y-3">
                    {section.tips.map((tip, j) => (
                      <li key={j} className="flex items-start gap-3 text-white/70">
                        <span
                          className={`inline-block w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                            section.variant === "success" ? "bg-success-500" : "bg-error-500"
                          }`}
                        />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="report" className="py-20 md:py-32 bg-[#161B22]/30">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="p-12 bg-gradient-to-br from-error-500/10 to-warning-500/10 border-error-500/20 text-center">
              <div className="text-6xl mb-6">🚨</div>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Ai întâlnit ceva suspect?</h2>
              <p className="text-xl text-white/70 mb-8">
                Folosește butonul de raportare de pe anunț sau scrie-ne. Analizăm sesizările în cadrul
                fluxului de moderare.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/listings">
                  <Button variant="primary" size="lg">
                    Deschide catalogul
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button variant="secondary" size="lg">
                    Contactează-ne
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </section>

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
              <Link href="/contact" className="hover:text-white transition">
                Contact
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

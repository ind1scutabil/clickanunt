"use client";

import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import Link from "next/link";
import { Button, Card, Badge } from "@/app/components/ui";
import { isCompanyLegalDetailsPublic } from "@/lib/company-config";

const showCompanyLegal = isCompanyLegalDetailsPublic();

export default function BusinessPage() {
  return (
    <>
      <Navbar />
      
      <main className="min-h-screen bg-[#0F1117]">
        {/* Hero */}
        <section className="relative py-20 md:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(109,91,255,0.1),_transparent_50%)]" />
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <Badge variant="primary" className="mb-6">Pentru Business & Dealeri</Badge>
              <h1 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight">
                Crește-ți vânzările cu
                <span className="block mt-2 bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] bg-clip-text text-transparent">
                  ClickAnunt Business
                </span>
              </h1>
              <p className="text-xl text-white/70 mb-8 leading-relaxed">
                Pachete dedicate pentru dealeri auto, agenții imobiliare și companii care vând în volum. Promovare maximă, conturi verificate și dashboard profesional.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="#plans">
                  <Button variant="primary" size="lg">
                    Vezi Pachete
                  </Button>
                </Link>
                <Link href="#contact">
                  <Button variant="secondary" size="lg">
                    Contactează Echipa
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-16 border-y border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { value: "1000+", label: "Dealeri activi" },
                { value: "50K+", label: "Anunțuri business" },
                { value: "95%", label: "Rată de conversie" },
                { value: "24/7", label: "Suport dedicat" }
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-4xl md:text-5xl font-black text-white mb-2">{stat.value}</div>
                  <div className="text-sm text-white/60">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-20 md:py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
                De ce ClickAnunt Business?
              </h2>
              <p className="text-xl text-white/60">Avantaje competitive pentru afacerea ta</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: "⭐",
                  title: "Promovare Maximă",
                  description: "Anunțurile tale apar în top rezultate și pe homepage cu badge \"Top Dealer\"."
                },
                {
                  icon: "✅",
                  title: "Cont Verificat",
                  description: "Badge \"Verificat\" pe toate anunțurile pentru încredere maximă de la clienți."
                },
                {
                  icon: "📊",
                  title: "Dashboard Avansat",
                  description: "Statistici detaliate: vizualizări, leads, conversii, rapoarte exportabile."
                },
                {
                  icon: "🚀",
                  title: "Publicare Rapidă",
                  description: "Încarcă anunțuri în bulk via CSV sau API. Economisești ore de muncă."
                },
                {
                  icon: "📞",
                  title: "Lead Management",
                  description: "Toate întrebările și apelurile într-un singur loc, cu notificări instant."
                },
                {
                  icon: "🧾",
                  title: "Facturare Simplificată",
                  description: "Factură lunară centralizată, export compatibil cu contabilitatea ta."
                }
              ].map((benefit, i) => (
                <Card key={i} className="p-8 bg-[#161B22] border-white/5 hover:border-primary-500/50 transition-all">
                  <div className="text-5xl mb-4">{benefit.icon}</div>
                  <h3 className="text-xl font-bold text-white mb-3">{benefit.title}</h3>
                  <p className="text-white/60 leading-relaxed">{benefit.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Plans */}
        <section id="plans" className="py-20 md:py-32 bg-[#161B22]/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
                Alege Pachetul Potrivit
              </h2>
              <p className="text-xl text-white/60">Flexibilitate și scalabilitate pentru orice dimensiune de business</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {[
                {
                  name: "Dealer Start",
                  price: "299",
                  period: "lună",
                  description: "Perfect pentru dealeri mici sau noi pe platformă",
                  features: [
                    "Până la 25 anunțuri active",
                    "Badge \"Dealer Verificat\"",
                    "Dashboard de bază",
                    "Suport email",
                    "Promovare în top 10"
                  ],
                  cta: "Începe Acum",
                  popular: false
                },
                {
                  name: "Dealer Pro",
                  price: "799",
                  period: "lună",
                  description: "Cea mai populară alegere pentru dealeri activi",
                  features: [
                    "Până la 100 anunțuri active",
                    "Badge \"Top Dealer\"",
                    "Dashboard avansat + Analytics",
                    "Suport prioritar (telefon + email)",
                    "Promovare în top 3",
                    "API Access pentru bulk upload",
                    "Lead notifications instant"
                  ],
                  cta: "Alege Pro",
                  popular: true
                },
                {
                  name: "Enterprise",
                  price: "Custom",
                  period: "la cerere",
                  description: "Soluție personalizată pentru companii mari și rețele",
                  features: [
                    "Anunțuri nelimitate",
                    "Branding personalizat",
                    "Integrare API completă",
                    "Dedicated account manager",
                    "White-label opțional",
                    "SLA garantat 99.9%",
                    "Raportare customizată"
                  ],
                  cta: "Contactează-ne",
                  popular: false
                }
              ].map((plan, i) => (
                <Card 
                  key={i} 
                  className={`p-8 relative ${
                    plan.popular 
                      ? 'bg-gradient-to-br from-primary-500/10 to-secondary-500/10 border-primary-500/50 scale-105' 
                      : 'bg-[#161B22] border-white/5'
                  }`}
                >
                  {plan.popular && (
                    <Badge variant="primary" className="absolute top-4 right-4">
                      Cel mai popular
                    </Badge>
                  )}
                  
                  <h3 className="text-2xl font-black text-white mb-2">{plan.name}</h3>
                  <p className="text-white/60 text-sm mb-6">{plan.description}</p>
                  
                  <div className="mb-6">
                    <span className="text-5xl font-black text-white">{plan.price}</span>
                    {plan.price !== "Custom" && <span className="text-white/60 ml-2">RON/{plan.period}</span>}
                  </div>
                  
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-start gap-2 text-white/70">
                        <svg className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    variant={plan.popular ? "primary" : "secondary"} 
                    fullWidth
                    className="mt-auto"
                  >
                    {plan.cta}
                  </Button>
                </Card>
              ))}
            </div>

            <div className="mt-12 text-center">
              <p className="text-white/60">
                Toate prețurile sunt exprimate în RON fără TVA. Facturare lunară sau anuală (2 luni gratuit).
              </p>
            </div>
          </div>
        </section>

        {/* CTA Final */}
        <section id="contact" className="py-20 md:py-32">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="p-12 bg-gradient-to-br from-primary-500/10 to-secondary-500/10 border-primary-500/20 text-center">
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
                Hai să creștem împreună!
              </h2>
              <p className="text-xl text-white/70 mb-8">
                Echipa noastră te ajută să configurezi contul de business în mai puțin de 24h. Fără contracte pe termen lung.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button variant="primary" size="lg">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  business@clickanunt.ro
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  type="button"
                  onClick={
                    showCompanyLegal ? () => {
                      window.location.href = "tel:+40784712496";
                    } : undefined
                  }
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {showCompanyLegal ? "+40 784 712 496" : "+40 XXX XXX XXX"}
                </Button>
              </div>
              <p className="text-sm text-white/50 mt-6">
                Program: Luni - Vineri, 09:00 - 18:00
              </p>
            </Card>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { Card, Badge, Button, Tabs, Avatar } from "@/app/components/ui";
import { ListingCard } from "@/app/components/composite";

export default function DashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    activeListings: 5,
    totalViews: 1250,
    messages: 23,
    favorites: 8,
  });
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      router.push('/auth/login?redirect=/dashboard');
      setIsLoading(false);
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      setIsAuthenticated(true);
    } catch (e) {
      console.error('Failed to parse user data:', e);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      router.push('/auth/login?redirect=/dashboard');
    }

    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300 font-medium">Se încarcă...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0A0B14] relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>
      
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-12 relative z-10">
        {/* Page Header */}
        <div className="mb-12">
          <h1 className="text-6xl font-black mb-4 text-white">
            Contul <span className="bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] bg-clip-text text-transparent">meu</span>
          </h1>
          <p className="text-gray-400 text-lg">Gestionează-ți anunțurile și setările contului</p>
        </div>

        {/* User Profile Card */}
        <Card variant="elevated" className="mb-12 bg-gradient-to-br from-slate-800/50 to-slate-900/50">
          <Card.Body className="p-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-6">
                <Avatar
                  size="lg"
                  initials={user.name ? user.name.split(' ').map((n: string) => n[0]).join('') : 'U'}
                  status="online"
                />
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-3xl font-black text-white">{user.name}</h2>
                    {user.verified && (
                      <Badge variant="success">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Verificat
                      </Badge>
                    )}
                    {user.role === 'premium' && (
                      <Badge variant="warning">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.538 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.783.57-1.838-.197-1.538-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.93 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        Premium
                      </Badge>
                    )}
                  </div>
                  <p className="text-gray-400 font-medium mb-1">{user.email}</p>
                  <p className="text-sm text-gray-500">Membru din februarie 2024</p>
                </div>
              </div>
              <Link href="/dashboard/settings">
                <Button variant="primary">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Editează profil
                </Button>
              </Link>
            </div>
          </Card.Body>
        </Card>

        {/* Stats Grid - NEW DESIGN SYSTEM */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          <Link href="/dashboard/listings">
            <Card variant="elevated" interactive className="h-full">
              <Card.Body className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <Badge variant="success" size="sm">+2</Badge>
                </div>
                <div className="text-3xl font-black text-white mb-2">{stats.activeListings}</div>
                <div className="text-sm text-gray-400">Anunțuri active</div>
              </Card.Body>
            </Card>
          </Link>

          <Card variant="elevated">
            <Card.Body className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-info-500/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-info-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-black text-white mb-2">{stats.totalViews.toLocaleString()}</div>
              <div className="text-sm text-gray-400">Vizualizări totale</div>
            </Card.Body>
          </Card>

          <Link href="/messages">
            <Card variant="elevated" interactive className="h-full">
              <Card.Body className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-warning-500/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-warning-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  {stats.messages > 0 && <Badge variant="error" size="sm">{stats.messages}</Badge>}
                </div>
                <div className="text-3xl font-black text-white mb-2">{stats.messages}</div>
                <div className="text-sm text-gray-400">Mesaje noi</div>
              </Card.Body>
            </Card>
          </Link>

          <Link href="/favorites">
            <Card variant="elevated" interactive className="h-full">
              <Card.Body className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-success-500/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-success-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-black text-white mb-2">{stats.favorites}</div>
                <div className="text-sm text-gray-400">Favorite salvate</div>
              </Card.Body>
            </Card>
          </Link>
        </div>

        {/* Tabs Section */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-12">
          <Tabs.List>
            <Tabs.Trigger value="overview">Privire generală</Tabs.Trigger>
            <Tabs.Trigger value="listings">Anunțurile mele</Tabs.Trigger>
            <Tabs.Trigger value="activity">Activitate</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="overview" className="mt-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card variant="elevated">
                <Card.Body className="p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Acțiuni rapide</h3>
                  <div className="space-y-3">
                    <Link href="/listings/new" className="block">
                      <Button variant="primary" size="lg" className="w-full justify-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Adaugă anunț nou
                      </Button>
                    </Link>
                    <Link href="/dashboard/listings" className="block">
                      <Button variant="secondary" size="lg" className="w-full justify-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Gestionează anunțuri
                      </Button>
                    </Link>
                  </div>
                </Card.Body>
              </Card>

              <Card variant="elevated">
                <Card.Body className="p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Plan actual</h3>
                  <Badge variant={user.role === 'premium' ? 'warning' : 'primary'} className="mb-4 w-fit">
                    {user.role === 'premium' ? 'Premium' : 'Gratuit'}
                  </Badge>
                  <p className="text-gray-400 text-sm mb-4">
                    {user.role === 'premium' 
                      ? 'Beneficiezi de anunțuri promovate și suport prioritar.'
                      : 'Upgrade la Premium pentru mai multe funcții.'}
                  </p>
                  {user.role !== 'premium' && (
                    <Link href="/dashboard/billing">
                      <Button variant="primary" size="sm">Upgrade la Premium</Button>
                    </Link>
                  )}
                </Card.Body>
              </Card>
            </div>
          </Tabs.Content>

          <Tabs.Content value="listings" className="mt-6">
            <div className="space-y-6">
              <p className="text-gray-400">Anunțurile tale active sunt listate mai jos.</p>
              
              {/* ListingCard Examples - NEW DESIGN SYSTEM */}
              <ListingCard
                id="1"
                title="BMW X5 2020 - Piele naturală, 150.000 km"
                price="45.900 €"
                image="https://images.unsplash.com/photo-1552820728-8ac41f1ce891?w=500&h=400&fit=crop"
                category="Auto, moto și ambarcațiuni"
                location="Cluj-Napoca, Cluj"
                description="Stare impecabilă, service complet..."
                postedAt="În urmă 2 zile"
                verified
                featured
                seller={{
                  name: "Ioan Popescu",
                  avatar: "IP",
                  verified: true
                }}
                onSave={() => console.log('Save listing 1')}
                onClick={() => router.push('/listings/1')}
              />

              <ListingCard
                id="2"
                title="Apartament 3 camere, Dorobanți"
                price="850 € / lună"
                image="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500&h=400&fit=crop"
                category="Imobiliare"
                location="București, Sector 1"
                description="Mobilat modern, curte comună..."
                postedAt="În urmă 5 zile"
                featured
                seller={{
                  name: "Real Estate Pro",
                  avatar: "RE",
                  verified: true
                }}
                onSave={() => console.log('Save listing 2')}
                onClick={() => router.push('/listings/2')}
              />
            </div>
          </Tabs.Content>

          <Tabs.Content value="activity" className="mt-6">
            <Card variant="elevated">
              <Card.Body className="p-6">
                <h3 className="text-lg font-bold text-white mb-4">Activitate recentă</h3>
                <div className="space-y-4 text-gray-400">
                  <p>✓ Ai publicat anunțul "BMW X5 2020"</p>
                  <p>✓ Ai primi 5 mesaje noi</p>
                  <p>✓ Ai promovat anunțul "Apartament Dorobanți"</p>
                </div>
              </Card.Body>
            </Card>
          </Tabs.Content>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
}

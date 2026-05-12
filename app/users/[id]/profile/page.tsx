'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { TrustBadgeDetailed } from '@/app/components/TrustBadge';
import { ListingCard } from '@/app/components/ListingCard';

interface BusinessProfile {
  id: string;
  businessName: string;
  businessLogo?: string;
  businessDescription?: string;
  businessLocation?: string;
  businessPhone?: string;
  businessWebsite?: string;
  businessEmail?: string;
  trustScore: number;
  verificationLevel: 'none' | 'email' | 'phone' | 'business';
  accountType: 'private' | 'business';
  createdAt: string;
  listings: {
    id: string;
    title: string;
    priceAmount: number;
    priceCurrency: string;
    category: string;
    photos: string[];
    createdAt: string;
    status: string;
    isPromoted: boolean;
    views: number;
  }[];
  stats: {
    totalListings: number;
    activeListings: number;
    soldListings: number;
    totalViews: number;
  };
}

export default function BusinessProfilePage() {
  const params = useParams();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch(`/api/users/${params.id}/profile`);
        if (!res.ok) throw new Error('Profil negăsit');
        const data = await res.json();
        setProfile(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      loadProfile();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0F1117] via-[#1A1D24] to-[#111827]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Profil negăsit</h1>
          <p className="text-[#9AA3B2] mb-4">{error || 'Acest profil nu există sau nu este disponibil.'}</p>
          <Link href="/" className="text-[#6D5BFF] hover:text-[#00D4FF] font-medium transition-smooth">
            ← Înapoi la pagina principală
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F1117] via-[#1A1D24] to-[#111827]">
      {/* Header Section */}
      <div className="border-b border-[#3F4654]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Logo */}
            <div className="flex-shrink-0">
              {profile.businessLogo ? (
                <img
                  src={profile.businessLogo}
                  alt={profile.businessName}
                  className="w-32 h-32 rounded-lg object-cover border-2 border-[#3F4654]"
                />
              ) : (
                <div className="w-32 h-32 rounded-lg bg-gradient-to-br from-[#6D5BFF] to-[#00D4FF] flex items-center justify-center text-white text-4xl font-bold">
                  {profile.businessName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Business Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">
                    {profile.businessName}
                  </h1>
                  <TrustBadgeDetailed
                    trustScore={profile.trustScore}
                    verificationLevel={profile.verificationLevel}
                    accountType={profile.accountType}
                    memberSince={new Date(profile.createdAt)}
                  />
                </div>
              </div>

              {profile.businessDescription && (
                <p className="text-[#C7CCD6] mb-4 whitespace-pre-line">
                  {profile.businessDescription}
                </p>
              )}

              {/* Contact Info */}
              <div className="flex flex-wrap gap-4 text-sm">
                {profile.businessLocation && (
                  <div className="flex items-center gap-2 text-[#9AA3B2]">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{profile.businessLocation}</span>
                  </div>
                )}
                
                {profile.businessPhone && (
                  <a
                    href={`tel:${profile.businessPhone}`}
                    className="flex items-center gap-2 text-[#6D5BFF] hover:text-[#00D4FF] transition-smooth"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>{profile.businessPhone}</span>
                  </a>
                )}
                
                {profile.businessWebsite && (
                  <a
                    href={profile.businessWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[#6D5BFF] hover:text-[#00D4FF] transition-smooth"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    <span>Website</span>
                  </a>
                )}
                
                {profile.businessEmail && (
                  <a
                    href={`mailto:${profile.businessEmail}`}
                    className="flex items-center gap-2 text-[#6D5BFF] hover:text-[#00D4FF] transition-smooth"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>Email</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#1C212B] border border-[#3F4654] rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-white">{profile.stats.activeListings}</div>
              <div className="text-sm text-[#9AA3B2]">Anunțuri active</div>
            </div>
            <div className="bg-[#1C212B] border border-[#3F4654] rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-white">{profile.stats.soldListings}</div>
              <div className="text-sm text-[#9AA3B2]">Vândute</div>
            </div>
            <div className="bg-[#1C212B] border border-[#3F4654] rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-white">{profile.stats.totalViews}</div>
              <div className="text-sm text-[#9AA3B2]">Vizualizări totale</div>
            </div>
            <div className="bg-[#1C212B] border border-[#3F4654] rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-white">{profile.trustScore}</div>
              <div className="text-sm text-[#9AA3B2]">Trust Score</div>
            </div>
          </div>
        </div>
      </div>

      {/* Listings Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">
            Anunțuri ({profile.listings.length})
          </h2>
        </div>

        {profile.listings.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
            {profile.listings.map((listing) => (
              <ListingCard
                key={listing.id}
                appearance="ink"
                listing={{
                  id: listing.id,
                  title: listing.title,
                  priceAmount: listing.priceAmount,
                  priceCurrency: listing.priceCurrency,
                  category: listing.category,
                  photos: listing.photos,
                  createdAt: listing.createdAt,
                  status: listing.status,
                  isPromoted: listing.isPromoted,
                  views: listing.views,
                  owner: {
                    id: profile.id,
                    businessName: profile.businessName,
                    trustScore: profile.trustScore,
                    verificationLevel: profile.verificationLevel,
                  },
                }}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-[#3F4654] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-[#9AA3B2]">Momentan nu există anunțuri active</p>
          </div>
        )}
      </div>
    </div>
  );
}

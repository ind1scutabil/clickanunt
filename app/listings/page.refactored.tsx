"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { ListingCard } from "@/app/components/composite";
import FilterPanel, { FilterOptions } from "@/app/components/composite/FilterPanel";
import { Skeleton } from "@/app/components/ui";

export default function ListingsPage() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [listings, setListings] = useState<any[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({
    sortBy: 'recent',
  });

  useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => {
      setListings([
        {
          id: "1",
          title: "BMW X5 2020 - Piele, 150.000 km",
          price: "45.900 €",
          image: "/images/default-listing.jpg",
          category: "Auto, moto și ambarcațiuni",
          location: "Cluj-Napoca, Cluj",
          verified: true,
          featured: true,
          seller: { name: "Ioan Popescu", avatar: "IP", verified: true },
        },
        {
          id: "2",
          title: "Apartament 3 camere, Dorobanți",
          price: "850 € / lună",
          image: "/images/default-listing.jpg",
          category: "Imobiliare",
          location: "București, Sector 1",
          verified: true,
          featured: false,
          seller: { name: "Real Estate Pro", avatar: "RE", verified: true },
        },
        {
          id: "3",
          title: "MacBook Pro 16\" M3 Max",
          price: "2.800 €",
          image: "/images/default-listing.jpg",
          category: "Electronice și IT",
          location: "București",
          verified: false,
          featured: false,
          seller: { name: "Tech Store", avatar: "TS", verified: true },
        },
        {
          id: "4",
          title: "Sofa piele Natuzzi 2.5m",
          price: "1.200 €",
          image: "/images/default-listing.jpg",
          category: "Casă și grădină",
          location: "Timișoara",
          verified: true,
          featured: false,
          seller: { name: "Furniture Plus", avatar: "FP", verified: true },
        },
        {
          id: "5",
          title: "Bicicletă MTB Scott 29\"",
          price: "650 €",
          image: "/images/default-listing.jpg",
          category: "Sport și hobby",
          location: "Brașov",
          verified: false,
          featured: false,
          seller: { name: "Sport Hub", avatar: "SH", verified: false },
        },
        {
          id: "6",
          title: "Mercedes C-Class 2019",
          price: "28.500 €",
          image: "/images/default-listing.jpg",
          category: "Auto, moto și ambarcațiuni",
          location: "Constanța",
          verified: true,
          featured: true,
          seller: { name: "Auto Vektor", avatar: "AV", verified: true },
        },
      ]);
      setIsLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  const handleFilter = (newFilters: FilterOptions) => {
    setFilters(newFilters);
    // Simulate filter API call
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  };

  const filteredListings = listings.filter(listing => {
    if (filters.location && !listing.location.toLowerCase().includes(filters.location.toLowerCase())) {
      return false;
    }
    if (filters.verified && !listing.verified) {
      return false;
    }
    if (filters.priceMin && parseFloat(listing.price) < filters.priceMin) {
      return false;
    }
    if (filters.priceMax && parseFloat(listing.price) > filters.priceMax) {
      return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0A0B14]">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-black text-white mb-2">
            Toate anunțurile
          </h1>
          <p className="text-gray-400">
            Explorează {listings.length} anunțuri pe platforma noastră
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Filter Panel */}
          <div className="lg:col-span-1">
            <FilterPanel onFilter={handleFilter} />
          </div>

          {/* Listings Grid */}
          <div className="lg:col-span-3">
            {isLoading ? (
              // Skeleton loaders while loading
              <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-6 bg-white/5 rounded-2xl overflow-hidden">
                    {/* Image skeleton */}
                    <Skeleton
                      variant="rounded"
                      className="w-48 h-40 flex-shrink-0"
                    />
                    {/* Content skeleton */}
                    <div className="flex-1 p-6 space-y-4">
                      <Skeleton variant="text" className="h-6 w-3/4" />
                      <Skeleton variant="text" lines={2} className="h-4" />
                      <div className="flex gap-2 pt-2">
                        <Skeleton variant="rounded" className="h-6 w-16" />
                        <Skeleton variant="rounded" className="h-6 w-20" />
                      </div>
                      <Skeleton variant="text" className="h-4 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredListings.length > 0 ? (
              <div className="space-y-6">
                {filteredListings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    id={listing.id}
                    title={listing.title}
                    price={listing.price}
                    image={listing.image}
                    category={listing.category}
                    location={listing.location}
                    verified={listing.verified}
                    featured={listing.featured}
                    seller={listing.seller}
                    onSave={() => console.log('Save:', listing.id)}
                    onClick={() => console.log('View:', listing.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <svg
                  className="w-16 h-16 mx-auto text-gray-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="text-xl font-bold text-white mb-2">
                  Niciun anunț nu corespunde filtrelor
                </h3>
                <p className="text-gray-400">
                  Încearcă să modifici criteriile de căutare
                </p>
              </div>
            )}

            {/* Pagination placeholder */}
            {!isLoading && filteredListings.length > 0 && (
              <div className="mt-12 flex justify-center gap-2">
                <button className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition font-medium">
                  Anterior
                </button>
                <button className="px-4 py-2 rounded-lg bg-primary-500 text-white font-medium">
                  1
                </button>
                <button className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition font-medium">
                  2
                </button>
                <button className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition font-medium">
                  Următorul
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function SortingControls({ listingsCount }: { listingsCount: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get("sort") || "featured";

  const handleSortChange = (newSort: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", newSort);
    router.push(`/listings?${params.toString()}`);
  };

  return (
    <div className="bg-white rounded-lg shadow px-6 py-4 mb-4 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <span className="text-gray-700 font-medium">Sortează:</span>
        <select 
          className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
          value={currentSort}
          onChange={(e) => handleSortChange(e.target.value)}
        >
          <option value="featured">Relevante</option>
          <option value="newest">Cele mai recente</option>
          <option value="price_asc">Preț crescător</option>
          <option value="price_desc">Preț descrescător</option>
          <option value="views">Cele mai vizualizate</option>
        </select>
      </div>
      
      <div className="flex items-center gap-3">
        <span className="text-gray-600 text-sm">
          {listingsCount} {listingsCount === 1 ? "anunț" : "anunțuri"}
        </span>
        <button className="p-2 hover:bg-gray-100 rounded-lg" title="Vezi ca grid">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
          </svg>
        </button>
        <button className="p-2 bg-blue-100 rounded-lg" title="Vezi ca listă">
          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}

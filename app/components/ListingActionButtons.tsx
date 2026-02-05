"use client";

import { useState } from "react";

export default function ListingActionButtons({ listingId }: { listingId: number }) {
  const [isFavorite, setIsFavorite] = useState(false);
  
  const handleFavorite = () => {
    setIsFavorite(!isFavorite);
    // TODO: Implement API call to save favorite
  };
  
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: "Anunț",
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copiat în clipboard!");
    }
  };

  return (
    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
      <button 
        onClick={handleFavorite}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 border rounded-lg transition text-sm font-medium ${
          isFavorite 
            ? "bg-red-50 border-red-300 text-red-600" 
            : "border-gray-300 hover:bg-gray-50"
        }`}
        title="Adaugă la favorite"
      >
        <span>{isFavorite ? "❤️" : "🤍"}</span>
        <span>{isFavorite ? "Salvat" : "Salvează"}</span>
      </button>
      <button 
        onClick={handleShare}
        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
        title="Distribuie"
      >
        <span>📤</span>
        <span>Distribuie</span>
      </button>
    </div>
  );
}

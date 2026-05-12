"use client";

import { CategoryMarketplaceArt } from "@/app/components/home/CategoryMarketplaceArt";
import { categoryVisualKeyFromLabel } from "@/lib/home-category-meta";

/** Premium placeholder when a listing has no usable photo — never a broken <img> or harsh copy. */
export function ListingCategoryPhotoFallback({
  category,
  compact = false,
  appearance = "ink",
}: {
  category: string;
  compact?: boolean;
  appearance?: "ink" | "paper";
}) {
  const variant = categoryVisualKeyFromLabel(category);
  const ink = appearance === "ink";

  return (
    <div
      className={`relative flex h-full w-full flex-col items-center justify-center overflow-hidden ${
        ink
          ? "bg-gradient-to-br from-[#2a303c] via-[#1c2028] to-[#12151c]"
          : "bg-gradient-to-br from-slate-100 via-slate-50 to-white"
      }`}
      role="img"
      aria-label="Previzualizare categorie"
    >
      <div
        className={`pointer-events-none absolute inset-0 ${ink ? "opacity-100" : "opacity-80"}`}
        aria-hidden
      >
        <div
          className={`absolute -left-1/4 top-0 h-[85%] w-[70%] rounded-full blur-3xl ${
            ink ? "bg-sky-500/[0.07]" : "bg-sky-400/[0.12]"
          }`}
        />
        <div
          className={`absolute -right-1/4 bottom-0 h-[70%] w-[65%] rounded-full blur-3xl ${
            ink ? "bg-orange-400/[0.05]" : "bg-orange-300/[0.1]"
          }`}
        />
      </div>
      <div
        className={`pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.06)_0%,transparent_55%)] ${
          ink ? "" : "opacity-50"
        }`}
        aria-hidden
      />
      <CategoryMarketplaceArt
        variant={variant}
        compact={compact}
        className={`relative z-[1] mx-auto ${ink ? "opacity-[0.38]" : "opacity-[0.45] text-slate-600"}`}
      />
    </div>
  );
}

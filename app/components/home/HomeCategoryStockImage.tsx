"use client";

import { useCallback, useState } from "react";
import { CategoryMarketplaceArt } from "@/app/components/home/CategoryMarketplaceArt";
import type { CategoryIconKey } from "@/lib/home-category-meta";

/**
 * Category hero thumbnails — plain `<img>` (same pattern as listing tiles) so production never
 * depends on the image optimizer remotePatterns; on failure we show SVG art, not a broken placeholder.
 */
export function HomeCategoryStockImage({
  src,
  alt,
  iconKey,
  sizes: _sizes,
  imageClassName,
  /** Luminozitate tip catalog (fundal alb + foto mai neutră). */
  catalogLook = false,
  /** Prima bandă de carduri — încărcare mai devreme ca să nu rămână „gol” la lazy + Safari. */
  priority = false,
}: {
  src: string;
  alt: string;
  iconKey: CategoryIconKey;
  sizes: string;
  imageClassName?: string;
  catalogLook?: boolean;
  priority?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  const onError = useCallback(() => setBroken(true), []);

  if (broken) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-100 via-white to-zinc-200">
        <CategoryMarketplaceArt variant={iconKey} compact className="opacity-95" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={640}
      height={360}
      sizes={_sizes}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      {...(priority ? { fetchPriority: "high" as const } : {})}
      className={`absolute inset-0 h-full w-full ${catalogLook ? "saturate-[0.85] brightness-[1.01] contrast-[0.98]" : ""} ${imageClassName ?? ""}`}
      onError={onError}
    />
  );
}

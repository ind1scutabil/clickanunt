"use client";

import React, {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  DEFAULT_LISTING_IMAGE_URL,
  LISTING_PHOTO_ONERROR_FALLBACK,
} from "@/lib/listing-photo-url";
import {
  getListingImageUrl,
  type ListingImageVariant,
} from "@/lib/listing-image-variants";
import { resolveClientApiUrl } from "@/lib/client-canonical-www";

function gallerySrc(
  photo: string | undefined,
  variant: ListingImageVariant,
): string {
  const url = getListingImageUrl(photo, variant) || DEFAULT_LISTING_IMAGE_URL;
  if (url.startsWith("/api/")) return resolveClientApiUrl(url);
  return url;
}

type ListingPhotoGalleryProps = {
  photos: string[];
  title: string;
  /** Controlled selected index (optional). */
  selectedIndex?: number;
  onSelectedIndexChange?: (index: number) => void;
};

type FgVariant = "medium" | "original" | "placeholder";
type BlurVariant = "thumb" | "medium" | "shared" | "placeholder";

/**
 * Premium listing gallery: blurred cover backdrop + contain foreground,
 * in-page stage + true viewport lightbox. Does not alter photo URLs/storage.
 *
 * Blur prefers thumb → medium. Original is never fetched solely for blur;
 * if needed, blur reuses the same URL already required by the foreground.
 */
export function ListingPhotoGallery({
  photos,
  title,
  selectedIndex: controlledIndex,
  onSelectedIndexChange,
}: ListingPhotoGalleryProps) {
  const reactId = useId();
  const labelId = `${reactId}-gallery-label`;
  const [internalIndex, setInternalIndex] = useState(0);
  const selectedIndex = controlledIndex ?? internalIndex;
  const setSelectedIndex = useCallback(
    (next: number | ((prev: number) => number)) => {
      setInternalIndex((prev) => {
        const value = typeof next === "function" ? next(prev) : next;
        const clamped =
          photos.length === 0 ? 0 : Math.max(0, Math.min(photos.length - 1, value));
        onSelectedIndexChange?.(clamped);
        return clamped;
      });
    },
    [onSelectedIndexChange, photos.length],
  );

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [thumbLoadAllowed, setThumbLoadAllowed] = useState<Set<number>>(
    () => new Set([0]),
  );
  const thumbStripRef = useRef<HTMLDivElement>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const openTriggerRef = useRef<HTMLElement | null>(null);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressOpenRef = useRef(false);
  const photosKey = photos.join("|");

  const current = photos[selectedIndex] ?? photos[0] ?? "";
  const mediumSrc = gallerySrc(current, "medium");
  const originalSrc = gallerySrc(current, "original");
  const thumbSrc = gallerySrc(current, "thumb");

  const [fgSrc, setFgSrc] = useState(mediumSrc);
  const [fgVariant, setFgVariant] = useState<FgVariant>("medium");
  const [fgReady, setFgReady] = useState(false);
  const [blurSrc, setBlurSrc] = useState(thumbSrc);
  const [blurVariant, setBlurVariant] = useState<BlurVariant>("thumb");
  const [blurReady, setBlurReady] = useState(false);
  /** When medium/thumb fail, wait for FG then share that URL (HTTP cache). */
  const [blurAwaitShare, setBlurAwaitShare] = useState(false);

  const [lbFgSrc, setLbFgSrc] = useState(originalSrc);
  const [lbFgReady, setLbFgReady] = useState(false);
  const [lbBlurSrc, setLbBlurSrc] = useState(thumbSrc);
  const [lbBlurVariant, setLbBlurVariant] = useState<BlurVariant>("thumb");
  const [lbBlurReady, setLbBlurReady] = useState(false);
  const [lbBlurAwaitShare, setLbBlurAwaitShare] = useState(false);

  useEffect(() => {
    setInternalIndex(0);
    onSelectedIndexChange?.(0);
    setThumbLoadAllowed(new Set([0]));
    setLightboxOpen(false);
  }, [photosKey, onSelectedIndexChange]);

  useEffect(() => {
    setFgSrc(mediumSrc);
    setFgVariant("medium");
    setFgReady(false);
    setBlurSrc(thumbSrc);
    setBlurVariant("thumb");
    setBlurReady(false);
    setBlurAwaitShare(false);
    setLbFgSrc(originalSrc);
    setLbFgReady(false);
    setLbBlurSrc(thumbSrc);
    setLbBlurVariant("thumb");
    setLbBlurReady(false);
    setLbBlurAwaitShare(false);
  }, [current, mediumSrc, originalSrc, thumbSrc]);

  useEffect(() => {
    setThumbLoadAllowed((prev) => {
      const next = new Set(prev);
      next.add(selectedIndex);
      if (selectedIndex > 0) next.add(selectedIndex - 1);
      if (selectedIndex < photos.length - 1) next.add(selectedIndex + 1);
      return next;
    });
  }, [selectedIndex, photos.length]);

  useEffect(() => {
    const first = photos[0];
    if (!first || typeof document === "undefined") return;
    const href = gallerySrc(first, "medium");
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = href;
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, [photos[0]]);

  useEffect(() => {
    const root = thumbStripRef.current;
    if (!root || photos.length < 2) return;
    if (typeof IntersectionObserver === "undefined") {
      setThumbLoadAllowed(new Set(photos.map((_, i) => i)));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        setThumbLoadAllowed((prev) => {
          let changed = false;
          const next = new Set(prev);
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const idx = Number(entry.target.getAttribute("data-thumb-index"));
            if (Number.isFinite(idx) && !next.has(idx)) {
              next.add(idx);
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      },
      { root, rootMargin: "64px", threshold: 0.01 },
    );
    root.querySelectorAll<HTMLElement>("[data-thumb-index]").forEach((el) =>
      io.observe(el),
    );
    return () => io.disconnect();
  }, [photos.length]);

  const goPrev = useCallback(() => {
    setSelectedIndex((i) => Math.max(0, i - 1));
  }, [setSelectedIndex]);

  const goNext = useCallback(() => {
    setSelectedIndex((i) => Math.min(photos.length - 1, i + 1));
  }, [photos.length, setSelectedIndex]);

  const openLightbox = useCallback((fromEl?: HTMLElement | null) => {
    if (suppressOpenRef.current) {
      suppressOpenRef.current = false;
      return;
    }
    openTriggerRef.current = fromEl ?? (document.activeElement as HTMLElement | null);
    setLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    const el = openTriggerRef.current;
    openTriggerRef.current = null;
    queueMicrotask(() => el?.focus?.());
  }, []);

  useEffect(() => {
    if (!lightboxOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [lightboxOpen]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const root = lightboxRef.current;
    const focusables = () =>
      root
        ? Array.from(
            root.querySelectorAll<HTMLElement>(
              'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
            ),
          )
        : [];

    queueMicrotask(() => {
      const first = focusables()[0];
      first?.focus();
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeLightbox();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
        return;
      }
      if (e.key === "Tab" && root) {
        const nodes = focusables();
        if (nodes.length === 0) return;
        const first = nodes[0]!;
        const last = nodes[nodes.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [lightboxOpen, closeLightbox, goPrev, goNext]);

  const onSwipeStart = useCallback(
    (e: React.TouchEvent) => {
      if (photos.length < 2) return;
      const t = e.touches[0];
      if (!t) return;
      swipeStartRef.current = { x: t.clientX, y: t.clientY };
    },
    [photos.length],
  );

  const onSwipeEnd = useCallback(
    (e: React.TouchEvent, source: "hero" | "lightbox") => {
      const start = swipeStartRef.current;
      swipeStartRef.current = null;
      if (photos.length < 2 || !start) return;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      if (Math.abs(dx) < 48 || Math.abs(dx) <= Math.abs(dy) * 1.15) return;
      if (source === "hero") suppressOpenRef.current = true;
      if (dx < 0) goNext();
      else goPrev();
    },
    [photos.length, goNext, goPrev],
  );

  const shareBlurFromFg = useCallback(
    (src: string, forLightbox: boolean) => {
      if (forLightbox) {
        setLbBlurSrc(src);
        setLbBlurVariant("shared");
        setLbBlurAwaitShare(false);
        setLbBlurReady(false);
      } else {
        setBlurSrc(src);
        setBlurVariant("shared");
        setBlurAwaitShare(false);
        setBlurReady(false);
      }
    },
    [],
  );

  const onFgError = useCallback(() => {
    if (fgVariant === "medium") {
      setFgReady(false);
      setFgSrc(originalSrc);
      setFgVariant("original");
      return;
    }
    setFgSrc(LISTING_PHOTO_ONERROR_FALLBACK);
    setFgVariant("placeholder");
    setFgReady(true);
    if (blurAwaitShare || blurVariant === "thumb" || blurVariant === "medium") {
      setBlurSrc(LISTING_PHOTO_ONERROR_FALLBACK);
      setBlurVariant("placeholder");
      setBlurAwaitShare(false);
      setBlurReady(true);
    }
  }, [fgVariant, originalSrc, blurAwaitShare, blurVariant]);

  const onFgLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const src = e.currentTarget.currentSrc || e.currentTarget.src;
      setFgReady(true);
      if (blurAwaitShare && src) {
        shareBlurFromFg(src, false);
      }
    },
    [blurAwaitShare, shareBlurFromFg],
  );

  const onBlurError = useCallback(() => {
    if (blurVariant === "thumb") {
      setBlurSrc(mediumSrc);
      setBlurVariant("medium");
      setBlurReady(false);
      return;
    }
    if (blurVariant === "medium") {
      // Never download original solely for blur — reuse FG URL (cache).
      if (fgReady) {
        shareBlurFromFg(fgSrc, false);
      } else {
        setBlurAwaitShare(true);
        setBlurReady(false);
      }
      return;
    }
    // shared / placeholder — stop (no loop)
    setBlurSrc(LISTING_PHOTO_ONERROR_FALLBACK);
    setBlurVariant("placeholder");
    setBlurReady(true);
  }, [blurVariant, mediumSrc, fgReady, fgSrc, shareBlurFromFg]);

  const onLbFgError = useCallback(() => {
    setLbFgSrc(LISTING_PHOTO_ONERROR_FALLBACK);
    setLbFgReady(true);
    if (lbBlurAwaitShare) {
      setLbBlurSrc(LISTING_PHOTO_ONERROR_FALLBACK);
      setLbBlurVariant("placeholder");
      setLbBlurAwaitShare(false);
      setLbBlurReady(true);
    }
  }, [lbBlurAwaitShare]);

  const onLbFgLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const src = e.currentTarget.currentSrc || e.currentTarget.src;
      setLbFgReady(true);
      if (lbBlurAwaitShare && src) {
        shareBlurFromFg(src, true);
      }
    },
    [lbBlurAwaitShare, shareBlurFromFg],
  );

  const onLbBlurError = useCallback(() => {
    if (lbBlurVariant === "thumb") {
      setLbBlurSrc(mediumSrc);
      setLbBlurVariant("medium");
      setLbBlurReady(false);
      return;
    }
    if (lbBlurVariant === "medium") {
      if (lbFgReady) {
        shareBlurFromFg(lbFgSrc, true);
      } else {
        setLbBlurAwaitShare(true);
        setLbBlurReady(false);
      }
      return;
    }
    setLbBlurSrc(LISTING_PHOTO_ONERROR_FALLBACK);
    setLbBlurVariant("placeholder");
    setLbBlurReady(true);
  }, [lbBlurVariant, mediumSrc, lbFgReady, lbFgSrc, shareBlurFromFg]);
  if (photos.length === 0) {
    return (
      <div
        className="listing-gallery-root relative overflow-hidden rounded-xl border border-zinc-700/40 bg-zinc-950 md:rounded-2xl"
        data-testid="listing-photo-gallery-empty"
      >
        <div className="listing-gallery-stage flex items-center justify-center bg-zinc-900 text-sm text-zinc-500">
          Nicio fotografie
        </div>
      </div>
    );
  }

  const counter = `${selectedIndex + 1} / ${photos.length}`;
  const showBlur = blurReady && !blurAwaitShare;
  const showLbBlur = lbBlurReady && !lbBlurAwaitShare;

  return (
    <>
      <div
        className="listing-gallery-root relative min-w-0 max-w-full overflow-hidden rounded-xl border border-zinc-700/40 bg-gradient-to-br from-zinc-900/95 to-zinc-950/95 shadow-sm ring-1 ring-white/[0.03] max-md:rounded-none max-md:border-x-0 md:rounded-2xl"
        data-testid="listing-photo-gallery"
      >
        <div id={labelId} className="sr-only">
          Galerie foto {title}
        </div>

        <div
          className="listing-gallery-stage group relative w-full min-w-0 cursor-pointer touch-manipulation overflow-hidden bg-zinc-950"
          role="button"
          tabIndex={0}
          aria-labelledby={labelId}
          aria-haspopup="dialog"
          data-testid="listing-gallery-stage"
          onClick={(e) => openLightbox(e.currentTarget)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openLightbox(e.currentTarget);
            }
            if (e.key === "ArrowLeft") {
              e.preventDefault();
              goPrev();
            }
            if (e.key === "ArrowRight") {
              e.preventDefault();
              goNext();
            }
          }}
          onTouchStart={onSwipeStart}
          onTouchEnd={(e) => onSwipeEnd(e, "hero")}
          onTouchCancel={() => {
            swipeStartRef.current = null;
          }}
        >
          {/* Gradient until blur is loaded — avoids black flash */}
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-950 to-black"
            data-testid="listing-gallery-blur-placeholder"
          />

          {!blurAwaitShare && blurSrc ? (
            <img
              key={`hero-blur-${selectedIndex}-${blurVariant}-${blurSrc.slice(-24)}`}
              src={blurSrc}
              alt=""
              aria-hidden
              data-testid="listing-gallery-blur"
              data-blur-variant={blurVariant}
              className={`listing-gallery-blur absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
                showBlur ? "opacity-80" : "opacity-0"
              }`}
              loading="eager"
              decoding="async"
              draggable={false}
              onLoad={() => setBlurReady(true)}
              onError={onBlurError}
            />
          ) : null}

          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/25 to-black/50"
          />

          <img
            key={`hero-fg-${selectedIndex}-${fgVariant}`}
            src={fgSrc}
            alt={title}
            data-testid="listing-gallery-fg"
            data-fg-variant={fgVariant}
            className="relative z-[1] mx-auto h-full max-h-full w-full max-w-full object-contain"
            loading="eager"
            decoding="async"
            fetchPriority="high"
            sizes="(max-width: 1024px) 100vw, 66vw"
            draggable={false}
            onLoad={onFgLoad}
            onError={onFgError}
          />

          <div className="pointer-events-none absolute inset-x-0 top-0 z-[3] flex items-start justify-between gap-2 p-2 sm:p-3">
            <span
              className="pointer-events-none rounded-full border border-white/10 bg-black/55 px-2.5 py-1 text-[11px] font-medium tabular-nums text-white backdrop-blur-sm sm:text-xs"
              data-testid="listing-gallery-counter"
            >
              {counter}
            </span>
            <button
              type="button"
              className="pointer-events-auto inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border border-white/15 bg-black/55 px-3 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              aria-label="Deschide ecran complet"
              data-testid="listing-gallery-fullscreen-btn"
              onClick={(e) => {
                e.stopPropagation();
                openLightbox(e.currentTarget);
              }}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" />
              </svg>
              <span className="hidden sm:inline">Ecran complet</span>
            </button>
          </div>

          {photos.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Poză anterioară"
                disabled={selectedIndex === 0}
                className="absolute left-2 top-1/2 z-[3] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white opacity-100 backdrop-blur-sm transition hover:bg-white/15 disabled:opacity-45 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Poză următoare"
                disabled={selectedIndex === photos.length - 1}
                className="absolute right-2 top-1/2 z-[3] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white opacity-100 backdrop-blur-sm transition hover:bg-white/15 disabled:opacity-45 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
        </div>

        {photos.length > 1 && (
          <div
            ref={thumbStripRef}
            className="listing-gallery-thumbs relative flex min-w-0 max-w-full snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain scroll-smooth bg-zinc-950/80 p-2 touch-pan-x [-webkit-overflow-scrolling:touch] sm:gap-2.5 sm:p-3"
            role="listbox"
            aria-label="Miniaturi fotografii"
            data-testid="listing-gallery-thumbs"
          >
            {photos.map((photo, i) => (
              <button
                key={`${i}-${photo}`}
                type="button"
                role="option"
                aria-selected={selectedIndex === i}
                data-thumb-index={i}
                data-testid={`listing-gallery-thumb-${i}`}
                className={`relative h-14 w-14 shrink-0 snap-start overflow-hidden rounded-lg border bg-zinc-800 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 sm:h-16 sm:w-16 md:h-20 md:w-20 md:rounded-xl ${
                  selectedIndex === i
                    ? "border-indigo-400/90 ring-1 ring-indigo-400/30"
                    : "border-zinc-700/50 hover:border-indigo-400/50"
                }`}
                onClick={() => setSelectedIndex(i)}
              >
                {thumbLoadAllowed.has(i) ? (
                  <ThumbImage photo={photo} active={selectedIndex === i} />
                ) : null}
              </button>
            ))}
          </div>
        )}
      </div>

      {lightboxOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={lightboxRef}
            className="listing-gallery-lightbox fixed inset-0 z-[200] flex h-[100dvh] w-[100vw] max-w-[100vw] flex-col bg-black"
            role="dialog"
            aria-modal="true"
            aria-label={`Galerie foto ecran complet — ${title}`}
            data-testid="listing-gallery-lightbox"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeLightbox();
            }}
          >
            <button
              type="button"
              aria-label="Închide galeria foto"
              data-testid="listing-gallery-lightbox-close"
              className="absolute right-[max(0.75rem,env(safe-area-inset-right))] top-[max(0.75rem,env(safe-area-inset-top))] z-[210] flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/70 text-white backdrop-blur-sm transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              onClick={closeLightbox}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Poză anterioară"
                  disabled={selectedIndex === 0}
                  className="absolute left-[max(0.5rem,env(safe-area-inset-left))] top-1/2 z-[210] flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white backdrop-blur-sm transition hover:bg-white/15 disabled:opacity-45"
                  onClick={(e) => {
                    e.stopPropagation();
                    goPrev();
                  }}
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label="Poză următoare"
                  disabled={selectedIndex === photos.length - 1}
                  className="absolute right-[max(0.5rem,env(safe-area-inset-right))] top-1/2 z-[210] flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white backdrop-blur-sm transition hover:bg-white/15 disabled:opacity-45"
                  onClick={(e) => {
                    e.stopPropagation();
                    goNext();
                  }}
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            <div
              className="relative flex min-h-0 flex-1 touch-manipulation items-center justify-center overflow-hidden"
              data-testid="listing-gallery-lightbox-stage"
              onClick={(e) => e.stopPropagation()}
              onTouchStart={onSwipeStart}
              onTouchEnd={(e) => onSwipeEnd(e, "lightbox")}
              onTouchCancel={() => {
                swipeStartRef.current = null;
              }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-zinc-900 via-black to-zinc-950"
              />

              {!lbBlurAwaitShare && lbBlurSrc ? (
                <img
                  key={`lb-blur-${selectedIndex}-${lbBlurVariant}-${lbBlurSrc.slice(-24)}`}
                  src={lbBlurSrc}
                  alt=""
                  aria-hidden
                  data-testid="listing-gallery-lightbox-blur"
                  data-blur-variant={lbBlurVariant}
                  className={`listing-gallery-blur pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
                    showLbBlur ? "opacity-70" : "opacity-0"
                  }`}
                  draggable={false}
                  onLoad={() => setLbBlurReady(true)}
                  onError={onLbBlurError}
                />
              ) : null}

              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/60"
              />
              <img
                key={`lb-fg-${selectedIndex}`}
                src={lbFgSrc}
                alt={title}
                data-testid="listing-gallery-lightbox-fg"
                className="relative z-[1] max-h-[96dvh] max-w-[96vw] object-contain"
                sizes="100vw"
                decoding="async"
                fetchPriority="high"
                draggable={false}
                onLoad={onLbFgLoad}
                onError={onLbFgError}
              />
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[210] flex justify-center">
              <span
                className="rounded-full border border-white/10 bg-black/65 px-3 py-1.5 text-xs font-medium tabular-nums text-white backdrop-blur-sm sm:text-sm"
                data-testid="listing-gallery-lightbox-counter"
              >
                {counter}
              </span>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function ThumbImage({ photo, active }: { photo: string; active: boolean }) {
  const [src, setSrc] = useState(() => gallerySrc(photo, "thumb"));
  const [stage, setStage] = useState<"thumb" | "medium" | "original" | "done">(
    "thumb",
  );

  return (
    <img
      src={src}
      alt=""
      className={`absolute inset-0 h-full w-full object-cover ${
        active ? "opacity-100" : "opacity-70"
      }`}
      loading="lazy"
      decoding="async"
      onError={() => {
        if (stage === "thumb") {
          setSrc(gallerySrc(photo, "medium"));
          setStage("medium");
          return;
        }
        if (stage === "medium") {
          setSrc(gallerySrc(photo, "original"));
          setStage("original");
          return;
        }
        setSrc(LISTING_PHOTO_ONERROR_FALLBACK);
        setStage("done");
      }}
    />
  );
}

export default ListingPhotoGallery;

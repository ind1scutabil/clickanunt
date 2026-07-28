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
import {
  isListingGalleryUrlLoaded,
  markListingGalleryUrlLoaded,
  resolveGalleryForeground,
  type GalleryFgCandidate,
} from "@/lib/listing-gallery-image-loader";

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
  /** Controlled requested index (optional). */
  selectedIndex?: number;
  onSelectedIndexChange?: (index: number) => void;
};

type FgVariant = "medium" | "original" | "placeholder";
type BlurVariant = "thumb" | "medium" | "shared" | "placeholder";

type GalleryFrame = {
  index: number;
  photo: string;
  fgSrc: string;
  fgVariant: FgVariant;
  blurSrc: string;
  blurVariant: BlurVariant;
};

const CROSSFADE_MS = 150;
const LOADING_INDICATOR_MS = 180;

function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return Math.max(0, Math.min(length - 1, index));
}

function buildFgCandidates(
  photo: string,
  preferOriginal: boolean,
): GalleryFgCandidate[] {
  const medium = gallerySrc(photo, "medium");
  const original = gallerySrc(photo, "original");
  const placeholder: GalleryFgCandidate = {
    src: LISTING_PHOTO_ONERROR_FALLBACK,
    variant: "placeholder",
  };
  if (preferOriginal) {
    return [
      { src: original, variant: "original" },
      { src: medium, variant: "medium" },
      placeholder,
    ];
  }
  return [
    { src: medium, variant: "medium" },
    { src: original, variant: "original" },
    placeholder,
  ];
}

/**
 * Blur must always represent the same photo as the foreground.
 * Prefer already-cached thumb/medium for the displayed photo; otherwise reuse FG URL.
 */
function pickBlurForFrame(
  photo: string,
  fgSrc: string,
  fgVariant: FgVariant,
): { blurSrc: string; blurVariant: BlurVariant } {
  if (fgVariant === "placeholder") {
    return { blurSrc: fgSrc, blurVariant: "placeholder" };
  }
  const thumb = gallerySrc(photo, "thumb");
  if (isListingGalleryUrlLoaded(thumb)) {
    return { blurSrc: thumb, blurVariant: "thumb" };
  }
  const medium = gallerySrc(photo, "medium");
  if (isListingGalleryUrlLoaded(medium) && medium !== fgSrc) {
    return { blurSrc: medium, blurVariant: "medium" };
  }
  return { blurSrc: fgSrc, blurVariant: "shared" };
}

function preloadQuiet(src: string): void {
  if (!src || typeof Image === "undefined") return;
  if (isListingGalleryUrlLoaded(src)) return;
  const img = new Image();
  img.decoding = "async";
  img.onload = () => {
    markListingGalleryUrlLoaded(src);
  };
  img.src = src;
}

/**
 * Premium listing gallery with atomic photo transitions:
 * blur + foreground + counter always share `displayedIndex`.
 * Navigation only updates `requestedIndex` until the new FG is decoded.
 */
export function ListingPhotoGallery({
  photos,
  title,
  selectedIndex: controlledIndex,
  onSelectedIndexChange,
}: ListingPhotoGalleryProps) {
  const reactId = useId();
  const labelId = `${reactId}-gallery-label`;
  const photosKey = photos.join("|");

  const [requestedIndex, setRequestedIndex] = useState(() =>
    clampIndex(controlledIndex ?? 0, photos.length),
  );
  const [frame, setFrame] = useState<GalleryFrame | null>(null);
  const [overlayFrame, setOverlayFrame] = useState<GalleryFrame | null>(null);
  const [overlayOpaque, setOverlayOpaque] = useState(false);
  const [pending, setPending] = useState(false);
  const [showLoadingIndicator, setShowLoadingIndicator] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [thumbLoadAllowed, setThumbLoadAllowed] = useState<Set<number>>(
    () => new Set([0]),
  );

  const thumbStripRef = useRef<HTMLDivElement>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const openTriggerRef = useRef<HTMLElement | null>(null);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressOpenRef = useRef(false);
  const mountedRef = useRef(true);
  const seqRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const lightboxOpenRef = useRef(false);
  const frameRef = useRef<GalleryFrame | null>(null);
  const crossfadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSelectedIndexChangeRef = useRef(onSelectedIndexChange);

  const displayedIndex = frame?.index ?? 0;

  useEffect(() => {
    onSelectedIndexChangeRef.current = onSelectedIndexChange;
  }, [onSelectedIndexChange]);

  useEffect(() => {
    lightboxOpenRef.current = lightboxOpen;
  }, [lightboxOpen]);

  useEffect(() => {
    frameRef.current = frame;
  }, [frame]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
      if (crossfadeTimerRef.current) clearTimeout(crossfadeTimerRef.current);
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);

  const commitFrame = useCallback(
    (next: GalleryFrame) => {
      if (!mountedRef.current) return;

      if (crossfadeTimerRef.current) {
        clearTimeout(crossfadeTimerRef.current);
        crossfadeTimerRef.current = null;
      }

      const prev = frameRef.current;
      if (!prev || reducedMotion || prev.index === next.index) {
        setFrame(next);
        setOverlayFrame(null);
        setOverlayOpaque(false);
        frameRef.current = next;
        return;
      }

      // Atomic swap via double buffer: old stays until overlay fades in.
      setOverlayFrame(next);
      setOverlayOpaque(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!mountedRef.current) return;
          setOverlayOpaque(true);
        });
      });

      crossfadeTimerRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        setFrame(next);
        frameRef.current = next;
        setOverlayFrame(null);
        setOverlayOpaque(false);
        crossfadeTimerRef.current = null;
      }, CROSSFADE_MS);
    },
    [reducedMotion],
  );

  const runTransition = useCallback(
    (index: number, preferOriginal: boolean) => {
      if (photos.length === 0) return;
      const clamped = clampIndex(index, photos.length);
      const photo = photos[clamped]!;
      const seq = ++seqRef.current;

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      setRequestedIndex(clamped);
      onSelectedIndexChangeRef.current?.(clamped);
      setPending(true);

      void (async () => {
        try {
          const resolved = await resolveGalleryForeground(
            buildFgCandidates(photo, preferOriginal),
            ac.signal,
          );
          if (!mountedRef.current || seq !== seqRef.current) return;

          const blur = pickBlurForFrame(photo, resolved.src, resolved.variant);
          commitFrame({
            index: clamped,
            photo,
            fgSrc: resolved.src,
            fgVariant: resolved.variant,
            blurSrc: blur.blurSrc,
            blurVariant: blur.blurVariant,
          });
        } catch (err) {
          const aborted =
            (err instanceof DOMException && err.name === "AbortError") ||
            (typeof err === "object" &&
              err !== null &&
              "name" in err &&
              (err as { name?: string }).name === "AbortError");
          if (aborted) return;
          if (!mountedRef.current || seq !== seqRef.current) return;
          // Controlled finish: placeholder for both layers, same index.
          commitFrame({
            index: clamped,
            photo,
            fgSrc: LISTING_PHOTO_ONERROR_FALLBACK,
            fgVariant: "placeholder",
            blurSrc: LISTING_PHOTO_ONERROR_FALLBACK,
            blurVariant: "placeholder",
          });
        } finally {
          if (mountedRef.current && seq === seqRef.current) {
            setPending(false);
          }
        }
      })().catch(() => {
        /* Abort/unmount races — never leave an unhandled rejection */
      });
    },
    [photos, commitFrame],
  );

  // Reset + load first photo when listing photos change
  useEffect(() => {
    abortRef.current?.abort();
    seqRef.current += 1;
    setLightboxOpen(false);
    setFrame(null);
    frameRef.current = null;
    setOverlayFrame(null);
    setOverlayOpaque(false);
    setPending(false);
    setShowLoadingIndicator(false);
    setThumbLoadAllowed(new Set([0]));
    const start = clampIndex(controlledIndex ?? 0, photos.length);
    setRequestedIndex(start);
    onSelectedIndexChangeRef.current?.(start);
    if (photos.length > 0) {
      runTransition(start, false);
    }
  }, [photosKey]);

  // External controlled index → request only (atomic display still waits for decode)
  useEffect(() => {
    if (controlledIndex == null) return;
    const clamped = clampIndex(controlledIndex, photos.length);
    if (clamped === requestedIndex) return;
    runTransition(clamped, lightboxOpenRef.current);
  }, [controlledIndex, photos.length, requestedIndex, runTransition]);

  useEffect(() => {
    const busy = pending || requestedIndex !== displayedIndex;
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
    if (!busy) {
      setShowLoadingIndicator(false);
      return;
    }
    loadingTimerRef.current = setTimeout(() => {
      loadingTimerRef.current = null;
      if (mountedRef.current) setShowLoadingIndicator(true);
    }, LOADING_INDICATOR_MS);
    return () => {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
    };
  }, [pending, requestedIndex, displayedIndex]);

  useEffect(() => {
    setThumbLoadAllowed((prev) => {
      const next = new Set(prev);
      next.add(displayedIndex);
      next.add(requestedIndex);
      if (displayedIndex > 0) next.add(displayedIndex - 1);
      if (displayedIndex < photos.length - 1) next.add(displayedIndex + 1);
      return next;
    });
  }, [displayedIndex, requestedIndex, photos.length]);

  // Preload adjacent mediums; when lightbox open, also adjacent originals (not all)
  useEffect(() => {
    if (photos.length === 0) return;
    const neighbors = [displayedIndex - 1, displayedIndex + 1].filter(
      (i) => i >= 0 && i < photos.length,
    );
    for (const i of neighbors) {
      const photo = photos[i]!;
      preloadQuiet(gallerySrc(photo, "medium"));
      if (lightboxOpen) {
        preloadQuiet(gallerySrc(photo, "original"));
      }
    }
  }, [displayedIndex, lightboxOpen, photos]);

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

  const goTo = useCallback(
    (index: number) => {
      runTransition(index, lightboxOpenRef.current);
    },
    [runTransition],
  );

  const goPrev = useCallback(() => {
    goTo(requestedIndex - 1);
  }, [goTo, requestedIndex]);

  const goNext = useCallback(() => {
    goTo(requestedIndex + 1);
  }, [goTo, requestedIndex]);

  const openLightbox = useCallback(
    (fromEl?: HTMLElement | null) => {
      if (suppressOpenRef.current) {
        suppressOpenRef.current = false;
        return;
      }
      openTriggerRef.current =
        fromEl ?? (document.activeElement as HTMLElement | null);
      setLightboxOpen(true);
      // Upgrade current displayed photo to original without changing index identity
      if (frameRef.current) {
        runTransition(frameRef.current.index, true);
      }
    },
    [runTransition],
  );

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    const el = openTriggerRef.current;
    openTriggerRef.current = null;
    // Keep same displayed index; refresh stage medium if still on same request
    if (frameRef.current) {
      runTransition(frameRef.current.index, false);
    }
    queueMicrotask(() => el?.focus?.());
  }, [runTransition]);

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

  const counter = `${displayedIndex + 1} / ${photos.length}`;
  const fadeMs = reducedMotion ? 0 : CROSSFADE_MS;
  const atStart = requestedIndex === 0;
  const atEnd = requestedIndex >= photos.length - 1;

  const renderLayers = (opts: {
    blurTestId: string;
    fgTestId: string;
    blurOpacityClass: string;
    fgClass: string;
  }) => {
    const layers: Array<{ frame: GalleryFrame; opaque: boolean; key: string }> =
      [];
    if (frame) {
      layers.push({
        frame,
        opaque: !overlayFrame || !overlayOpaque,
        key: "base",
      });
    }
    if (overlayFrame) {
      layers.push({
        frame: overlayFrame,
        opaque: overlayOpaque,
        key: "overlay",
      });
    }

    return (
      <>
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-950 to-black"
          data-testid="listing-gallery-blur-placeholder"
        />

        {layers.map(({ frame: f, opaque, key }) => (
          <div
            key={`${key}-${f.index}-${f.fgVariant}-${f.fgSrc.slice(-20)}`}
            className="listing-gallery-frame-stack absolute inset-0 z-[1]"
            data-frame-role={key}
            data-photo-id={f.photo}
            data-photo-index={f.index}
            style={{
              opacity: opaque ? 1 : 0,
              transitionProperty: "opacity",
              transitionDuration: `${fadeMs}ms`,
              transitionTimingFunction: "ease",
            }}
          >
            <img
              src={f.blurSrc}
              alt=""
              aria-hidden
              data-testid={key === "base" ? opts.blurTestId : undefined}
              data-blur-variant={f.blurVariant}
              data-photo-id={f.photo}
              data-photo-index={f.index}
              className={`listing-gallery-blur absolute inset-0 h-full w-full object-cover ${opts.blurOpacityClass}`}
              decoding="async"
              draggable={false}
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/25 to-black/50"
            />
            <img
              src={f.fgSrc}
              alt={title}
              data-testid={key === "base" ? opts.fgTestId : undefined}
              data-fg-variant={f.fgVariant}
              data-photo-id={f.photo}
              data-photo-index={f.index}
              className={`absolute inset-0 z-[1] m-auto ${opts.fgClass}`}
              decoding="async"
              fetchPriority={key === "base" ? "high" : "auto"}
              draggable={false}
            />
          </div>
        ))}
      </>
    );
  };

  return (
    <>
      <div
        className="listing-gallery-root relative min-w-0 max-w-full overflow-hidden rounded-xl border border-zinc-700/40 bg-gradient-to-br from-zinc-900/95 to-zinc-950/95 shadow-sm ring-1 ring-white/[0.03] max-md:rounded-none max-md:border-x-0 md:rounded-2xl"
        data-testid="listing-photo-gallery"
        data-displayed-index={displayedIndex}
        data-requested-index={requestedIndex}
        data-pending={pending ? "true" : "false"}
      >
        <div id={labelId} className="sr-only">
          Galerie foto {title}
        </div>

        <div
          className="listing-gallery-stage group relative w-full min-w-0 cursor-pointer touch-manipulation overflow-hidden bg-zinc-950"
          aria-labelledby={labelId}
          aria-busy={pending || undefined}
          data-testid="listing-gallery-stage"
          onClick={(e) => {
            // Avoid nested-interactive: controls inside stay real <button>s; stage opens lightbox on background click only.
            const t = e.target as HTMLElement | null;
            if (t?.closest("button, a, input, textarea, select")) return;
            openLightbox(e.currentTarget);
          }}
          onTouchStart={onSwipeStart}
          onTouchEnd={(e) => onSwipeEnd(e, "hero")}
          onTouchCancel={() => {
            swipeStartRef.current = null;
          }}
        >
          {renderLayers({
            blurTestId: "listing-gallery-blur",
            fgTestId: "listing-gallery-fg",
            blurOpacityClass: "opacity-80",
            fgClass: "h-full max-h-full w-full max-w-full object-contain",
          })}

          <div className="pointer-events-none absolute inset-x-0 top-0 z-[3] flex items-start justify-between gap-2 p-2 sm:p-3">
            <span
              className="pointer-events-none rounded-full border border-white/10 bg-black/55 px-2.5 py-1 text-[11px] font-medium tabular-nums text-white backdrop-blur-sm sm:text-xs"
              data-testid="listing-gallery-counter"
              data-photo-id={frame?.photo}
              data-photo-index={displayedIndex}
              data-displayed-index={displayedIndex}
              data-requested-index={requestedIndex}
            >
              {counter}
            </span>
            <div className="flex items-center gap-2">
              {showLoadingIndicator ? (
                <span
                  className="listing-gallery-loading pointer-events-none inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white"
                  data-testid="listing-gallery-loading"
                  aria-hidden
                >
                  <span className="listing-gallery-loading-dot h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white" />
                </span>
              ) : null}
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
          </div>

          {photos.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Poză anterioară"
                disabled={atStart}
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
                disabled={atEnd}
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
            {photos.map((photo, i) => {
              const isDisplayed = displayedIndex === i;
              const isRequested = requestedIndex === i && !isDisplayed;
              return (
                <button
                  key={`${i}-${photo}`}
                  type="button"
                  role="option"
                  aria-selected={isDisplayed}
                  aria-busy={isRequested || undefined}
                  data-thumb-index={i}
                  data-pending={isRequested ? "true" : "false"}
                  data-testid={`listing-gallery-thumb-${i}`}
                  className={`relative h-14 w-14 shrink-0 snap-start overflow-hidden rounded-lg border bg-zinc-800 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 sm:h-16 sm:w-16 md:h-20 md:w-20 md:rounded-xl ${
                    isDisplayed
                      ? "border-indigo-400/90 ring-1 ring-indigo-400/30"
                      : isRequested
                        ? "border-indigo-300/50 ring-1 ring-indigo-300/20"
                        : "border-zinc-700/50 hover:border-indigo-400/50"
                  }`}
                  onClick={() => goTo(i)}
                >
                  {thumbLoadAllowed.has(i) ? (
                    <ThumbImage photo={photo} active={isDisplayed} />
                  ) : null}
                </button>
              );
            })}
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
            aria-busy={pending || undefined}
            data-testid="listing-gallery-lightbox"
            data-displayed-index={displayedIndex}
            data-requested-index={requestedIndex}
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
                  disabled={atStart}
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
                  disabled={atEnd}
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
              {renderLayers({
                blurTestId: "listing-gallery-lightbox-blur",
                fgTestId: "listing-gallery-lightbox-fg",
                blurOpacityClass: "opacity-70 pointer-events-none",
                fgClass: "max-h-[96dvh] max-w-[96vw] object-contain",
              })}

              {showLoadingIndicator ? (
                <span
                  className="listing-gallery-loading pointer-events-none absolute z-[5] inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white"
                  data-testid="listing-gallery-lightbox-loading"
                  aria-hidden
                >
                  <span className="listing-gallery-loading-dot h-4 w-4 rounded-full border-2 border-white/30 border-t-white" />
                </span>
              ) : null}
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[210] flex justify-center">
              <span
                className="rounded-full border border-white/10 bg-black/65 px-3 py-1.5 text-xs font-medium tabular-nums text-white backdrop-blur-sm sm:text-sm"
                data-testid="listing-gallery-lightbox-counter"
                data-photo-id={frame?.photo}
                data-photo-index={displayedIndex}
                data-displayed-index={displayedIndex}
                data-requested-index={requestedIndex}
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
      onLoad={() => {
        markListingGalleryUrlLoaded(src);
      }}
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

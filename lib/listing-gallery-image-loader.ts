/**
 * Decode-aware image preload for listing gallery atomic transitions.
 * Display-only helper — does not change storage, upload, or image APIs.
 *
 * Abort behavior:
 * - Prefer `fetch(src, { signal })` when possible so AbortController cancels the network request.
 * - Fall back to `Image()` when fetch is unavailable / fails CORS; Image cannot always be
 *   cancelled, so callers MUST also gate commits with a sequence token (gallery does).
 * - Event handlers are cleared on settle/abort; blob object URLs are always revoked.
 */

const loadedUrlCache = new Set<string>();

export function markListingGalleryUrlLoaded(src: string): void {
  if (src) loadedUrlCache.add(src);
}

export function isListingGalleryUrlLoaded(src: string): boolean {
  return Boolean(src) && loadedUrlCache.has(src);
}

/** Test helper — clears in-memory decode cache. */
export function clearListingGalleryUrlCache(): void {
  loadedUrlCache.clear();
}

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === "AbortError") ||
    (typeof err === "object" &&
      err !== null &&
      "name" in err &&
      (err as { name?: string }).name === "AbortError")
  );
}

function abortError(): DOMException {
  return new DOMException("Aborted", "AbortError");
}

function canAttemptFetch(src: string): boolean {
  if (typeof fetch !== "function") return false;
  if (src.startsWith("data:") || src.startsWith("blob:")) return false;
  // Relative same-origin paths and absolute http(s) — try fetch first (abortable).
  return src.startsWith("/") || /^https?:\/\//i.test(src);
}

function decodeViaImageElement(
  src: string,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }

    const img = new Image();
    let settled = false;

    const cleanup = () => {
      signal?.removeEventListener("abort", onAbort);
      img.onload = null;
      img.onerror = null;
      img.onabort = null;
    };

    const finish = (err?: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      // Best-effort cancel of further Image work (not always effective for in-flight HTTP).
      try {
        img.src = "";
      } catch {
        /* ignore */
      }
      if (err) reject(err);
      else resolve();
    };

    const onAbort = () => {
      finish(abortError());
    };

    signal?.addEventListener("abort", onAbort, { once: true });

    img.onload = () => {
      if (signal?.aborted) {
        finish(abortError());
        return;
      }
      if (typeof img.decode === "function") {
        img
          .decode()
          .then(() => {
            if (signal?.aborted) {
              finish(abortError());
              return;
            }
            finish();
          })
          .catch(() => {
            // decode() can reject for some formats; paintable load is still usable
            if (signal?.aborted) {
              finish(abortError());
              return;
            }
            finish();
          });
        return;
      }
      finish();
    };

    img.onerror = () => {
      finish(new Error(`Failed to load image: ${src}`));
    };

    img.src = src;

    if (img.complete && img.naturalWidth > 0) {
      if (typeof img.decode === "function") {
        img
          .decode()
          .then(() => finish())
          .catch(() => finish());
      } else {
        finish();
      }
    }
  });
}

async function loadViaFetch(src: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch(src, {
    signal,
    credentials: "same-origin",
    cache: "force-cache",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch image: ${src} (${res.status})`);
  }
  const blob = await res.blob();
  if (signal?.aborted) throw abortError();

  const objectUrl = URL.createObjectURL(blob);
  try {
    await decodeViaImageElement(objectUrl, signal);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }

  markListingGalleryUrlLoaded(src);
  return src;
}

/**
 * Load + decode an image URL. Resolves with the original `src` (HTTP cache reuse).
 * Rejects with AbortError when `signal` aborts; callers must also use a sequence token
 * because Image() fallback cannot always cancel the underlying network request.
 */
export function loadDecodedImage(
  src: string,
  signal?: AbortSignal,
): Promise<string> {
  if (!src) {
    return Promise.reject(new Error("empty src"));
  }
  if (signal?.aborted) {
    return Promise.reject(abortError());
  }

  if (src.startsWith("data:")) {
    markListingGalleryUrlLoaded(src);
    return Promise.resolve(src);
  }

  if (canAttemptFetch(src)) {
    return loadViaFetch(src, signal).catch((err) => {
      if (isAbortError(err)) throw err;
      // CORS / network / opaque — fall back to Image() (abort may only clear handlers).
      return decodeViaImageElement(src, signal).then(() => {
        markListingGalleryUrlLoaded(src);
        return src;
      });
    });
  }

  return decodeViaImageElement(src, signal).then(() => {
    markListingGalleryUrlLoaded(src);
    return src;
  });
}

export type GalleryFgCandidate = {
  src: string;
  variant: "medium" | "original" | "placeholder";
};

/**
 * Resolve the first decodeable foreground candidate.
 * Propagates AbortError; other failures fall through the candidate chain.
 */
export async function resolveGalleryForeground(
  candidates: GalleryFgCandidate[],
  signal?: AbortSignal,
): Promise<GalleryFgCandidate> {
  let lastError: unknown;
  for (const candidate of candidates) {
    if (signal?.aborted) {
      throw abortError();
    }
    if (candidate.variant === "placeholder") {
      markListingGalleryUrlLoaded(candidate.src);
      return candidate;
    }
    try {
      await loadDecodedImage(candidate.src, signal);
      return candidate;
    } catch (err) {
      if (isAbortError(err)) throw err;
      lastError = err;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("No gallery foreground candidate resolved");
}

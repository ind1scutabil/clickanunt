/** @jest-environment jsdom */
import {
  clearListingGalleryUrlCache,
  isListingGalleryUrlLoaded,
  loadDecodedImage,
  markListingGalleryUrlLoaded,
  resolveGalleryForeground,
} from "@/lib/listing-gallery-image-loader";

describe("listing-gallery-image-loader", () => {
  const originalImage = global.Image;
  const originalFetch = global.fetch;

  beforeEach(() => {
    clearListingGalleryUrlCache();
    global.fetch = originalFetch;
    global.Image = originalImage;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    global.Image = originalImage;
  });

  it("marks and queries loaded URLs", () => {
    expect(isListingGalleryUrlLoaded("/a.jpg")).toBe(false);
    markListingGalleryUrlLoaded("/a.jpg");
    expect(isListingGalleryUrlLoaded("/a.jpg")).toBe(true);
  });

  it("loadDecodedImage resolves data URLs without network", async () => {
    await expect(loadDecodedImage("data:image/svg+xml,x")).resolves.toBe(
      "data:image/svg+xml,x",
    );
    expect(isListingGalleryUrlLoaded("data:image/svg+xml,x")).toBe(true);
  });

  it("loadDecodedImage uses abortable fetch then revokes object URL", async () => {
    const revokeFn = jest.fn();
    const createFn = jest.fn().mockReturnValue("blob:test");
    // jsdom may lack blob URL helpers
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: createFn,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: revokeFn,
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }),
    }) as unknown as typeof fetch;

    class FakeImage {
      onload: ((ev?: unknown) => void) | null = null;
      onerror: ((ev?: unknown) => void) | null = null;
      onabort: ((ev?: unknown) => void) | null = null;
      decode = jest.fn().mockResolvedValue(undefined);
      complete = false;
      naturalWidth = 0;
      set src(_v: string) {
        this.complete = true;
        this.naturalWidth = 10;
        queueMicrotask(() => this.onload?.());
      }
    }
    // @ts-expect-error stub
    global.Image = FakeImage;

    await expect(loadDecodedImage("/ok.jpg")).resolves.toBe("/ok.jpg");
    expect(global.fetch).toHaveBeenCalledWith(
      "/ok.jpg",
      expect.objectContaining({ credentials: "same-origin" }),
    );
    expect(createFn).toHaveBeenCalled();
    expect(revokeFn).toHaveBeenCalledWith("blob:test");
    expect(isListingGalleryUrlLoaded("/ok.jpg")).toBe(true);
  });

  it("loadDecodedImage aborts via fetch AbortController", async () => {
    global.fetch = jest.fn().mockImplementation((_url, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    }) as unknown as typeof fetch;

    const ac = new AbortController();
    const p = loadDecodedImage("/slow.jpg", ac.signal);
    ac.abort();
    await expect(p).rejects.toMatchObject({ name: "AbortError" });
  });

  it("Image fallback clears handlers on abort when fetch unavailable", async () => {
    // @ts-expect-error force Image path
    global.fetch = undefined;

    class FakeImage {
      onload: ((ev?: unknown) => void) | null = null;
      onerror: ((ev?: unknown) => void) | null = null;
      onabort: ((ev?: unknown) => void) | null = null;
      complete = false;
      naturalWidth = 0;
      set src(_v: string) {
        /* hang */
      }
    }
    // @ts-expect-error stub
    global.Image = FakeImage;

    const ac = new AbortController();
    const p = loadDecodedImage("/slow.jpg", ac.signal);
    ac.abort();
    await expect(p).rejects.toMatchObject({ name: "AbortError" });
  });

  it("resolveGalleryForeground falls through failures then placeholder", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 }) as unknown as typeof fetch;

    class FakeImage {
      onload: ((ev?: unknown) => void) | null = null;
      onerror: ((ev?: unknown) => void) | null = null;
      onabort: ((ev?: unknown) => void) | null = null;
      complete = false;
      naturalWidth = 0;
      set src(v: string) {
        if (String(v).includes("fail") || String(v).includes("/fail")) {
          queueMicrotask(() => this.onerror?.());
        } else if (String(v).startsWith("data:")) {
          this.complete = true;
          this.naturalWidth = 1;
          queueMicrotask(() => this.onload?.());
        } else {
          queueMicrotask(() => this.onerror?.());
        }
      }
    }
    // @ts-expect-error stub
    global.Image = FakeImage;

    const result = await resolveGalleryForeground([
      { src: "/fail-medium.jpg", variant: "medium" },
      { src: "/fail-original.jpg", variant: "original" },
      { src: "data:image/svg+xml,ph", variant: "placeholder" },
    ]);
    expect(result.variant).toBe("placeholder");
  });

  it("resolveGalleryForeground propagates AbortError and skips stale commit path", async () => {
    global.fetch = jest.fn().mockImplementation((_url, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    }) as unknown as typeof fetch;

    const ac = new AbortController();
    const p = resolveGalleryForeground(
      [
        { src: "/a.jpg", variant: "medium" },
        { src: "data:image/svg+xml,ph", variant: "placeholder" },
      ],
      ac.signal,
    );
    ac.abort();
    await expect(p).rejects.toMatchObject({ name: "AbortError" });
  });
});

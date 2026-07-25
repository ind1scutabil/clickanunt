/** @jest-environment jsdom */
import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
  cleanup,
} from "@testing-library/react";
import { ListingPhotoGallery } from "@/app/components/listing/ListingPhotoGallery";
import {
  clearListingGalleryUrlCache,
  markListingGalleryUrlLoaded,
} from "@/lib/listing-gallery-image-loader";

const resolveMock = jest.fn();

jest.mock("@/lib/listing-gallery-image-loader", () => {
  const actual = jest.requireActual("@/lib/listing-gallery-image-loader");
  return {
    ...actual,
    resolveGalleryForeground: (...args: unknown[]) => resolveMock(...args),
  };
});

jest.mock("@/lib/listing-image-variants", () => ({
  getListingImageUrl: (photo: string, variant: string) =>
    photo ? `/img/${variant}/${encodeURIComponent(photo)}` : "",
  applyListingImageFallback: (el: HTMLImageElement) => {
    el.src = "/fallback.jpg";
  },
}));

jest.mock("@/lib/listing-photo-url", () => ({
  DEFAULT_LISTING_IMAGE_URL: "/fallback.jpg",
  LISTING_PHOTO_ONERROR_FALLBACK: "data:image/svg+xml,placeholder",
  normalizeListingPhotosArray: (p: unknown) => (Array.isArray(p) ? p : []),
}));

jest.mock("@/lib/client-canonical-www", () => ({
  resolveClientApiUrl: (u: string) => u,
}));

const portrait = ["portrait-a.jpg", "portrait-b.jpg", "portrait-c.jpg"];
const landscape = ["land-1.jpg", "land-2.jpg"];
const square = ["square.jpg"];
const twenty = Array.from({ length: 20 }, (_, i) => `photo-${i}.jpg`);

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (err?: unknown) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (err?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function syncPhotoIds(scope?: HTMLElement | Document) {
  const root = scope ?? document;
  const blur = root.querySelector('[data-testid="listing-gallery-blur"]');
  const fg = root.querySelector('[data-testid="listing-gallery-fg"]');
  const counter = root.querySelector('[data-testid="listing-gallery-counter"]');
  return {
    blur: blur?.getAttribute("data-photo-id") ?? null,
    fg: fg?.getAttribute("data-photo-id") ?? null,
    counter: counter?.getAttribute("data-photo-id") ?? null,
    blurIndex: blur?.getAttribute("data-photo-index") ?? null,
    fgIndex: fg?.getAttribute("data-photo-index") ?? null,
    counterIndex: counter?.getAttribute("data-photo-index") ?? null,
  };
}

function expectAtomicSync() {
  const ids = syncPhotoIds();
  expect(ids.blur).toBe(ids.fg);
  expect(ids.fg).toBe(ids.counter);
  expect(ids.blurIndex).toBe(ids.fgIndex);
  expect(ids.fgIndex).toBe(ids.counterIndex);
}

describe("ListingPhotoGallery atomic transitions", () => {
  beforeAll(() => {
    class IO {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    // @ts-expect-error test polyfill
    global.IntersectionObserver = IO;
  });

  beforeEach(() => {
    document.body.style.overflow = "";
    clearListingGalleryUrlCache();
    resolveMock.mockReset();
    resolveMock.mockImplementation(async (candidates: Array<{ src: string; variant: string }>) => {
      const first = candidates[0]!;
      markListingGalleryUrlLoaded(first.src);
      return first;
    });
  });

  afterEach(() => {
    cleanup();
  });

  async function waitDisplayed(photo: string) {
    await waitFor(() => {
      expect(screen.getByTestId("listing-gallery-fg")).toHaveAttribute(
        "data-photo-id",
        photo,
      );
    });
  }

  it("renders empty state with no photos", () => {
    render(<ListingPhotoGallery photos={[]} title="Test" />);
    expect(screen.getByTestId("listing-photo-gallery-empty")).toBeInTheDocument();
  });

  it("renders portrait set with counter and blur backdrop", async () => {
    render(<ListingPhotoGallery photos={portrait} title="Portrait car" />);
    await waitDisplayed("portrait-a.jpg");
    expect(screen.getByTestId("listing-photo-gallery")).toBeInTheDocument();
    expect(screen.getByTestId("listing-gallery-counter")).toHaveTextContent("1 / 3");
    expect(screen.getByTestId("listing-gallery-blur")).toBeInTheDocument();
    expectAtomicSync();
  });

  it("1) background does not change before foreground", async () => {
    const d0 = deferred<{ src: string; variant: string }>();
    const d1 = deferred<{ src: string; variant: string }>();
    resolveMock
      .mockImplementationOnce(() => d0.promise)
      .mockImplementationOnce(() => d1.promise);

    render(<ListingPhotoGallery photos={portrait} title="Lag" />);
    await act(async () => {
      d0.resolve({
        src: "/img/medium/portrait-a.jpg",
        variant: "medium",
      });
    });
    await waitDisplayed("portrait-a.jpg");
    const before = syncPhotoIds();

    fireEvent.click(screen.getByRole("button", { name: "Poză următoare" }));
    expect(screen.getByTestId("listing-photo-gallery")).toHaveAttribute(
      "data-requested-index",
      "1",
    );
    expect(screen.getByTestId("listing-gallery-counter")).toHaveTextContent("1 / 3");
    expect(syncPhotoIds()).toEqual(before);

    await act(async () => {
      d1.resolve({
        src: "/img/medium/portrait-b.jpg",
        variant: "medium",
      });
    });
    await waitDisplayed("portrait-b.jpg");
    expectAtomicSync();
    expect(screen.getByTestId("listing-gallery-counter")).toHaveTextContent("2 / 3");
  });

  it("2) counter does not change before decode", async () => {
    const d0 = deferred<{ src: string; variant: string }>();
    const d1 = deferred<{ src: string; variant: string }>();
    resolveMock
      .mockImplementationOnce(() => d0.promise)
      .mockImplementationOnce(() => d1.promise);

    render(<ListingPhotoGallery photos={portrait} title="Counter lag" />);
    await act(async () => {
      d0.resolve({ src: "/img/medium/portrait-a.jpg", variant: "medium" });
    });
    await waitDisplayed("portrait-a.jpg");

    fireEvent.click(screen.getByTestId("listing-gallery-thumb-1"));
    expect(screen.getByTestId("listing-gallery-counter")).toHaveTextContent("1 / 3");

    await act(async () => {
      d1.resolve({ src: "/img/medium/portrait-b.jpg", variant: "medium" });
    });
    await waitFor(() => {
      expect(screen.getByTestId("listing-gallery-counter")).toHaveTextContent("2 / 3");
    });
  });

  it("3) after decode background/foreground/counter share the same index", async () => {
    render(<ListingPhotoGallery photos={portrait} title="Sync" />);
    await waitDisplayed("portrait-a.jpg");
    fireEvent.click(screen.getByRole("button", { name: "Poză următoare" }));
    await waitDisplayed("portrait-b.jpg");
    expectAtomicSync();
    expect(screen.getByTestId("listing-gallery-fg")).toHaveAttribute(
      "data-photo-index",
      "1",
    );
  });

  it("4) slow medium keeps old frame until decode", async () => {
    const d0 = deferred<{ src: string; variant: string }>();
    const d1 = deferred<{ src: string; variant: string }>();
    resolveMock
      .mockImplementationOnce(() => d0.promise)
      .mockImplementationOnce(() => d1.promise);

    render(<ListingPhotoGallery photos={portrait} title="Slow medium" />);
    await act(async () => {
      d0.resolve({ src: "/img/medium/portrait-a.jpg", variant: "medium" });
    });
    await waitDisplayed("portrait-a.jpg");

    fireEvent.keyDown(screen.getByTestId("listing-gallery-stage"), {
      key: "ArrowRight",
    });
    expect(screen.getByTestId("listing-gallery-fg")).toHaveAttribute(
      "data-photo-id",
      "portrait-a.jpg",
    );
    expect(screen.getByTestId("listing-gallery-blur")).toHaveAttribute(
      "data-photo-id",
      "portrait-a.jpg",
    );

    await act(async () => {
      d1.resolve({ src: "/img/medium/portrait-b.jpg", variant: "medium" });
    });
    await waitDisplayed("portrait-b.jpg");
    expectAtomicSync();
  });

  it("5) thumb request is pending while medium is slow; selection stays on displayed", async () => {
    const d0 = deferred<{ src: string; variant: string }>();
    const d1 = deferred<{ src: string; variant: string }>();
    resolveMock
      .mockImplementationOnce(() => d0.promise)
      .mockImplementationOnce(() => d1.promise);

    render(<ListingPhotoGallery photos={portrait} title="Thumb pending" />);
    await act(async () => {
      d0.resolve({ src: "/img/medium/portrait-a.jpg", variant: "medium" });
    });
    await waitDisplayed("portrait-a.jpg");

    fireEvent.click(screen.getByTestId("listing-gallery-thumb-2"));
    expect(screen.getByTestId("listing-gallery-thumb-0")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByTestId("listing-gallery-thumb-2")).toHaveAttribute(
      "data-pending",
      "true",
    );
    expect(screen.getByTestId("listing-gallery-counter")).toHaveTextContent("1 / 3");

    await act(async () => {
      d1.resolve({ src: "/img/medium/portrait-c.jpg", variant: "medium" });
    });
    await waitDisplayed("portrait-c.jpg");
    expect(screen.getByTestId("listing-gallery-thumb-2")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expectAtomicSync();
  });

  it("6) medium 404 falls through to original candidate", async () => {
    resolveMock.mockImplementation(async (candidates: Array<{ src: string; variant: string }>) => {
      const original = candidates.find((c) => c.variant === "original");
      if (!original) throw new Error("missing original");
      markListingGalleryUrlLoaded(original.src);
      return original;
    });

    render(<ListingPhotoGallery photos={portrait} title="Medium 404" />);
    await waitFor(() => {
      expect(screen.getByTestId("listing-gallery-fg")).toHaveAttribute(
        "data-fg-variant",
        "original",
      );
    });
    expectAtomicSync();
  });

  it("7) all sources 404 → placeholder and controlled finish", async () => {
    resolveMock.mockImplementation(async (candidates: Array<{ src: string; variant: string }>) => {
      const ph = candidates.find((c) => c.variant === "placeholder");
      if (!ph) throw new Error("missing placeholder");
      return ph;
    });

    render(<ListingPhotoGallery photos={["broken.jpg"]} title="All 404" />);
    await waitFor(() => {
      expect(screen.getByTestId("listing-gallery-fg")).toHaveAttribute(
        "data-fg-variant",
        "placeholder",
      );
    });
    expect(screen.getByTestId("listing-gallery-blur")).toHaveAttribute(
      "data-blur-variant",
      "placeholder",
    );
    expectAtomicSync();
  });

  it("8+9) rapid 1→2→3 ignores stale response for photo 2", async () => {
    const d0 = deferred<{ src: string; variant: string }>();
    const d1 = deferred<{ src: string; variant: string }>();
    const d2 = deferred<{ src: string; variant: string }>();
    resolveMock
      .mockImplementationOnce(() => d0.promise)
      .mockImplementationOnce(() => d1.promise)
      .mockImplementationOnce(() => d2.promise);

    render(<ListingPhotoGallery photos={portrait} title="Race" />);
    await act(async () => {
      d0.resolve({ src: "/img/medium/portrait-a.jpg", variant: "medium" });
    });
    await waitDisplayed("portrait-a.jpg");

    fireEvent.click(screen.getByRole("button", { name: "Poză următoare" })); // →1
    fireEvent.click(screen.getByRole("button", { name: "Poză următoare" })); // →2
    expect(screen.getByTestId("listing-photo-gallery")).toHaveAttribute(
      "data-requested-index",
      "2",
    );

    // Stale photo 2 arrives after photo 3 was requested
    await act(async () => {
      d1.resolve({ src: "/img/medium/portrait-b.jpg", variant: "medium" });
    });
    expect(screen.getByTestId("listing-gallery-fg")).toHaveAttribute(
      "data-photo-id",
      "portrait-a.jpg",
    );

    await act(async () => {
      d2.resolve({ src: "/img/medium/portrait-c.jpg", variant: "medium" });
    });
    await waitDisplayed("portrait-c.jpg");
    expect(screen.getByTestId("listing-gallery-counter")).toHaveTextContent("3 / 3");
    expectAtomicSync();
  });

  it("10) arrow navigation", async () => {
    render(<ListingPhotoGallery photos={portrait} title="Arrows" />);
    await waitDisplayed("portrait-a.jpg");
    fireEvent.click(screen.getByRole("button", { name: "Poză următoare" }));
    await waitDisplayed("portrait-b.jpg");
    fireEvent.click(screen.getByRole("button", { name: "Poză anterioară" }));
    await waitDisplayed("portrait-a.jpg");
    expectAtomicSync();
  });

  it("11) thumbnail navigation", async () => {
    render(<ListingPhotoGallery photos={twenty} title="Many" />);
    await waitDisplayed("photo-0.jpg");
    fireEvent.click(screen.getByTestId("listing-gallery-thumb-4"));
    await waitDisplayed("photo-4.jpg");
    expect(screen.getByTestId("listing-gallery-counter")).toHaveTextContent("5 / 20");
    expectAtomicSync();
  });

  it("12) keyboard navigation", async () => {
    render(<ListingPhotoGallery photos={portrait} title="Keys" />);
    await waitDisplayed("portrait-a.jpg");
    const stage = screen.getByTestId("listing-gallery-stage");
    stage.focus();
    fireEvent.keyDown(stage, { key: "ArrowRight" });
    await waitDisplayed("portrait-b.jpg");
    expect(screen.queryByTestId("listing-gallery-lightbox")).not.toBeInTheDocument();
    expectAtomicSync();
  });

  it("13) swipe navigation", async () => {
    render(<ListingPhotoGallery photos={portrait} title="Swipe" />);
    await waitDisplayed("portrait-a.jpg");
    const stage = screen.getByTestId("listing-gallery-stage");
    fireEvent.touchStart(stage, { touches: [{ clientX: 200, clientY: 100 }] });
    fireEvent.touchEnd(stage, {
      changedTouches: [{ clientX: 80, clientY: 105 }],
    });
    await waitDisplayed("portrait-b.jpg");
    expect(screen.queryByTestId("listing-gallery-lightbox")).not.toBeInTheDocument();
    expectAtomicSync();
  });

  it("14) fullscreen shares displayed index and stays atomic", async () => {
    render(<ListingPhotoGallery photos={portrait} title="FS" />);
    await waitDisplayed("portrait-a.jpg");
    fireEvent.click(screen.getByRole("button", { name: "Poză următoare" }));
    await waitDisplayed("portrait-b.jpg");

    fireEvent.click(screen.getByTestId("listing-gallery-fullscreen-btn"));
    expect(screen.getByTestId("listing-gallery-lightbox")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("listing-gallery-lightbox-counter")).toHaveTextContent(
        "2 / 3",
      );
    });
    const lbBlur = screen.getByTestId("listing-gallery-lightbox-blur");
    const lbFg = screen.getByTestId("listing-gallery-lightbox-fg");
    const lbCounter = screen.getByTestId("listing-gallery-lightbox-counter");
    expect(lbBlur.getAttribute("data-photo-id")).toBe(
      lbFg.getAttribute("data-photo-id"),
    );
    expect(lbFg.getAttribute("data-photo-id")).toBe(
      lbCounter.getAttribute("data-photo-id"),
    );

    fireEvent.keyDown(document, { key: "ArrowRight" });
    await waitFor(() => {
      expect(screen.getByTestId("listing-gallery-lightbox-counter")).toHaveTextContent(
        "3 / 3",
      );
    });
    expect(screen.getByTestId("listing-gallery-lightbox")).toHaveAttribute(
      "data-displayed-index",
      "2",
    );
  });

  it("15) listing change / unmount does not apply stale loads", async () => {
    const d0 = deferred<{ src: string; variant: string }>();
    const dSlow = deferred<{ src: string; variant: string }>();
    resolveMock
      .mockImplementationOnce(() => d0.promise)
      .mockImplementationOnce(() => dSlow.promise)
      .mockImplementation(async (candidates: Array<{ src: string; variant: string }>) => {
        const first = candidates[0]!;
        markListingGalleryUrlLoaded(first.src);
        return first;
      });

    const { rerender, unmount } = render(
      <ListingPhotoGallery photos={portrait} title="Unmount" />,
    );
    await act(async () => {
      d0.resolve({ src: "/img/medium/portrait-a.jpg", variant: "medium" });
    });
    await waitDisplayed("portrait-a.jpg");

    fireEvent.click(screen.getByRole("button", { name: "Poză următoare" }));
    rerender(<ListingPhotoGallery photos={landscape} title="Other" />);
    await waitDisplayed("land-1.jpg");

    await act(async () => {
      dSlow.resolve({ src: "/img/medium/portrait-b.jpg", variant: "medium" });
    });
    expect(screen.getByTestId("listing-gallery-fg")).toHaveAttribute(
      "data-photo-id",
      "land-1.jpg",
    );

    unmount();
    await act(async () => {
      /* flush */
    });
    expect(document.body).toBeTruthy();
  });

  it("16) prefers-reduced-motion still commits atomically", async () => {
    const listeners: Array<() => void> = [];
    // @ts-expect-error test stub
    window.matchMedia = (query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      addEventListener: (_: string, cb: () => void) => listeners.push(cb),
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
    });

    render(<ListingPhotoGallery photos={portrait} title="Reduced" />);
    await waitDisplayed("portrait-a.jpg");
    fireEvent.click(screen.getByRole("button", { name: "Poză următoare" }));
    await waitDisplayed("portrait-b.jpg");
    expectAtomicSync();
  });

  it("opens lightbox, navigates, closes on Escape", async () => {
    render(<ListingPhotoGallery photos={portrait} title="Nav" />);
    await waitDisplayed("portrait-a.jpg");
    fireEvent.click(screen.getByTestId("listing-gallery-fullscreen-btn"));
    expect(screen.getByTestId("listing-gallery-lightbox")).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.keyDown(document, { key: "ArrowRight" });
    await waitFor(() => {
      expect(screen.getByTestId("listing-gallery-lightbox-counter")).toHaveTextContent(
        "2 / 3",
      );
    });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByTestId("listing-gallery-lightbox")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });

  it("restores focus after closing lightbox", async () => {
    render(<ListingPhotoGallery photos={portrait} title="Focus" />);
    await waitDisplayed("portrait-a.jpg");
    const btn = screen.getByTestId("listing-gallery-fullscreen-btn");
    btn.focus();
    fireEvent.click(btn);
    fireEvent.click(screen.getByTestId("listing-gallery-lightbox-close"));
    await waitFor(() => {
      expect(document.activeElement).toBe(btn);
    });
  });

  it("renders landscape thumbs and single square without thumbs", async () => {
    const { rerender } = render(
      <ListingPhotoGallery photos={landscape} title="Landscape" />,
    );
    await waitDisplayed("land-1.jpg");
    expect(screen.getByTestId("listing-gallery-thumbs")).toBeInTheDocument();
    rerender(<ListingPhotoGallery photos={square} title="Square" />);
    await waitDisplayed("square.jpg");
    expect(screen.queryByTestId("listing-gallery-thumbs")).not.toBeInTheDocument();
  });

  it("traps Tab focus inside the lightbox", async () => {
    render(<ListingPhotoGallery photos={portrait} title="Trap" />);
    await waitDisplayed("portrait-a.jpg");
    fireEvent.click(screen.getByTestId("listing-gallery-fullscreen-btn"));
    const lb = screen.getByTestId("listing-gallery-lightbox");
    const buttons = lb.querySelectorAll("button");
    expect(buttons.length).toBeGreaterThan(1);
    const first = buttons[0]!;
    const last = buttons[buttons.length - 1]!;
    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(first);
    first.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it("shows delayed loading indicator while pending", async () => {
    const d0 = deferred<{ src: string; variant: string }>();
    const d1 = deferred<{ src: string; variant: string }>();
    resolveMock
      .mockImplementationOnce(() => d0.promise)
      .mockImplementationOnce(() => d1.promise);

    render(<ListingPhotoGallery photos={portrait} title="Loading" />);
    await act(async () => {
      d0.resolve({ src: "/img/medium/portrait-a.jpg", variant: "medium" });
    });
    await waitDisplayed("portrait-a.jpg");

    fireEvent.click(screen.getByRole("button", { name: "Poză următoare" }));
    expect(screen.queryByTestId("listing-gallery-loading")).not.toBeInTheDocument();

    await act(async () => {
      await new Promise((r) => setTimeout(r, 200));
    });
    expect(screen.getByTestId("listing-gallery-loading")).toBeInTheDocument();

    await act(async () => {
      d1.resolve({ src: "/img/medium/portrait-b.jpg", variant: "medium" });
    });
    await waitDisplayed("portrait-b.jpg");
    await waitFor(() => {
      expect(screen.queryByTestId("listing-gallery-loading")).not.toBeInTheDocument();
    });
  });
});

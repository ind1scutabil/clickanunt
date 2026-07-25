/** @jest-environment jsdom */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ListingPhotoGallery } from "@/app/components/listing/ListingPhotoGallery";

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

describe("ListingPhotoGallery", () => {
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
  });

  it("renders empty state with no photos", () => {
    render(<ListingPhotoGallery photos={[]} title="Test" />);
    expect(screen.getByTestId("listing-photo-gallery-empty")).toBeInTheDocument();
  });

  it("renders portrait set with counter and blur backdrop", () => {
    render(<ListingPhotoGallery photos={portrait} title="Portrait car" />);
    expect(screen.getByTestId("listing-photo-gallery")).toBeInTheDocument();
    expect(screen.getByTestId("listing-gallery-counter")).toHaveTextContent("1 / 3");
    expect(screen.getByTestId("listing-gallery-blur")).toBeInTheDocument();
    expect(screen.getByTestId("listing-gallery-blur-placeholder")).toBeInTheDocument();
    expect(screen.getByAltText("Portrait car")).toBeInTheDocument();
  });

  it("blur starts on thumb and falls back to medium without looping to original alone", () => {
    render(<ListingPhotoGallery photos={portrait} title="Blur chain" />);
    const blur = screen.getByTestId("listing-gallery-blur");
    expect(blur.getAttribute("data-blur-variant")).toBe("thumb");
    fireEvent.error(blur);
    expect(screen.getByTestId("listing-gallery-blur").getAttribute("data-blur-variant")).toBe(
      "medium",
    );
    fireEvent.error(screen.getByTestId("listing-gallery-blur"));
    // awaits FG share — blur img may unmount while awaiting
    const after = screen.queryByTestId("listing-gallery-blur");
    if (after) {
      expect(after.getAttribute("data-blur-variant")).not.toBe("thumb");
    }
    fireEvent.load(screen.getByTestId("listing-gallery-fg"));
    const shared = screen.getByTestId("listing-gallery-blur");
    expect(shared.getAttribute("data-blur-variant")).toBe("shared");
  });

  it("renders landscape and square single photo without thumbs", () => {
    const { rerender } = render(
      <ListingPhotoGallery photos={landscape} title="Landscape" />,
    );
    expect(screen.getByTestId("listing-gallery-thumbs")).toBeInTheDocument();
    rerender(<ListingPhotoGallery photos={square} title="Square" />);
    expect(screen.queryByTestId("listing-gallery-thumbs")).not.toBeInTheDocument();
    expect(screen.getByTestId("listing-gallery-counter")).toHaveTextContent("1 / 1");
  });

  it("supports 20 photos and thumbnail navigation", () => {
    render(<ListingPhotoGallery photos={twenty} title="Many" />);
    expect(screen.getByTestId("listing-gallery-counter")).toHaveTextContent("1 / 20");
    fireEvent.click(screen.getByTestId("listing-gallery-thumb-4"));
    expect(screen.getByTestId("listing-gallery-counter")).toHaveTextContent("5 / 20");
  });

  it("opens lightbox, navigates with arrows/keyboard, closes on Escape", () => {
    render(<ListingPhotoGallery photos={portrait} title="Nav" />);
    fireEvent.click(screen.getByTestId("listing-gallery-fullscreen-btn"));
    expect(screen.getByTestId("listing-gallery-lightbox")).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");
    expect(screen.getByTestId("listing-gallery-lightbox-counter")).toHaveTextContent(
      "1 / 3",
    );

    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(screen.getByTestId("listing-gallery-lightbox-counter")).toHaveTextContent(
      "2 / 3",
    );
    fireEvent.keyDown(document, { key: "ArrowLeft" });
    expect(screen.getByTestId("listing-gallery-lightbox-counter")).toHaveTextContent(
      "1 / 3",
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByTestId("listing-gallery-lightbox")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });

  it("marks active thumbnail with aria-selected", () => {
    render(<ListingPhotoGallery photos={portrait} title="Thumbs" />);
    expect(screen.getByTestId("listing-gallery-thumb-0")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    fireEvent.click(screen.getByTestId("listing-gallery-thumb-2"));
    expect(screen.getByTestId("listing-gallery-thumb-2")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByTestId("listing-gallery-thumb-0")).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("restores focus after closing lightbox", () => {
    render(<ListingPhotoGallery photos={portrait} title="Focus" />);
    const btn = screen.getByTestId("listing-gallery-fullscreen-btn");
    btn.focus();
    fireEvent.click(btn);
    fireEvent.click(screen.getByTestId("listing-gallery-lightbox-close"));
    expect(document.activeElement).toBe(btn);
  });

  it("handles image error via fallback without throwing", () => {
    render(<ListingPhotoGallery photos={["broken.jpg"]} title="Broken" />);
    fireEvent.error(screen.getByTestId("listing-gallery-fg")); // medium → original
    expect(screen.getByTestId("listing-gallery-fg")).toHaveAttribute(
      "data-fg-variant",
      "original",
    );
    fireEvent.error(screen.getByTestId("listing-gallery-fg")); // original → placeholder
    expect(screen.getByTestId("listing-gallery-fg")).toHaveAttribute(
      "data-fg-variant",
      "placeholder",
    );
    expect(screen.getByTestId("listing-gallery-fg").getAttribute("src") || "").toContain(
      "data:image/svg+xml",
    );
  });

  it("lightbox has aria-modal and can open/close repeatedly", () => {
    render(<ListingPhotoGallery photos={landscape} title="Repeat" />);
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByTestId("listing-gallery-fullscreen-btn"));
      const lb = screen.getByTestId("listing-gallery-lightbox");
      expect(lb).toHaveAttribute("aria-modal", "true");
      fireEvent.keyDown(document, { key: "Escape" });
      expect(screen.queryByTestId("listing-gallery-lightbox")).not.toBeInTheDocument();
    }
  });

  it("stage keyboard arrows change photo without opening lightbox", () => {
    render(<ListingPhotoGallery photos={portrait} title="Keys" />);
    const stage = screen.getByTestId("listing-gallery-stage");
    stage.focus();
    fireEvent.keyDown(stage, { key: "ArrowRight" });
    expect(screen.getByTestId("listing-gallery-counter")).toHaveTextContent("2 / 3");
    expect(screen.queryByTestId("listing-gallery-lightbox")).not.toBeInTheDocument();
  });

  it("swipes on mobile to change photo without opening lightbox", () => {
    render(<ListingPhotoGallery photos={portrait} title="Swipe" />);
    const stage = screen.getByTestId("listing-gallery-stage");
    fireEvent.touchStart(stage, { touches: [{ clientX: 200, clientY: 100 }] });
    fireEvent.touchEnd(stage, {
      changedTouches: [{ clientX: 80, clientY: 105 }],
    });
    expect(screen.getByTestId("listing-gallery-counter")).toHaveTextContent("2 / 3");
    expect(screen.queryByTestId("listing-gallery-lightbox")).not.toBeInTheDocument();
  });

  it("traps Tab focus inside the lightbox", () => {
    render(<ListingPhotoGallery photos={portrait} title="Trap" />);
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
});

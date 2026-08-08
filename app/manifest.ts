import type { MetadataRoute } from "next";

/** App manifest at `/manifest.webmanifest` (Next.js MetadataRoute). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ClickAnunț — Anunțuri gratuite în România",
    short_name: "ClickAnunț",
    description: "Platforma de anunțuri gratuite din România",
    start_url: "/",
    display: "standalone",
    background_color: "#111111",
    theme_color: "#111111",
    icons: [
      {
        src: "/brand/clickanunt-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/clickanunt-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}

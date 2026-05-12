import type { CategoryIconKey } from "@/lib/home-category-meta";

/**
 * Fotografii reale tematice (editorial, calitate mai mare). Fără ilustrații AI — doar stock foto.
 * Parametri: w=960, q=82 pentru claritate pe tile-uri mari.
 */
const Q = "w=960&q=82&auto=format&fit=crop";

export const CATEGORY_STOCK_PHOTO: Record<CategoryIconKey, { src: string; alt: string }> = {
  auto: {
    src: `https://images.unsplash.com/photo-1503376780353-7e6692767b70?${Q}`,
    alt: "Autoturism — vedere dinamică pe șosea",
  },
  home: {
    src: `https://images.unsplash.com/photo-1600585154340-be6161a56a0c?${Q}`,
    alt: "Locuință și arhitectură rezidențială",
  },
  device: {
    src: `https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?${Q}`,
    alt: "Telefon mobil în mână",
  },
  fashion: {
    src: `https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?${Q}`,
    alt: "Raft cu îmbrăcăminte",
  },
  sofa: {
    src: `https://images.unsplash.com/photo-1555041469-a586c61ea9bc?${Q}`,
    alt: "Living cu canapea și lumină naturală",
  },
  sport: {
    src: `https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?${Q}`,
    alt: "Sport în aer liber",
  },
  child: {
    src: `https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?${Q}`,
    alt: "Copil la joacă în natură",
  },
  pet: {
    src: `https://images.unsplash.com/photo-1548199973-03cce0bbc87b?${Q}`,
    alt: "Câine la plimbare",
  },
  work: {
    src: `https://images.unsplash.com/photo-1522071820081-009f0129c71c?${Q}`,
    alt: "Întâlnire echipă în birou",
  },
  service: {
    src: `https://images.unsplash.com/photo-1504307651254-35680f356dfd?${Q}`,
    alt: "Șantier și echipament de lucru",
  },
  farm: {
    src: `https://images.unsplash.com/photo-1625246333195-78d9c38ad449?${Q}`,
    alt: "Utilaj agricol pe câmp",
  },
  other: {
    src: `https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?${Q}`,
    alt: "Birou și documente diverse",
  },
};

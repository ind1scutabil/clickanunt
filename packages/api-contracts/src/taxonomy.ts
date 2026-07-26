/**
 * Canonical marketplace taxonomy CONTRACT (category + subcategory + UI-safe attributes).
 *
 * Shared client projection of lib/taxonomy.ts AttributeFieldDef (no moderation, no RegExp).
 * Web and mobile MUST derive category pickers and attribute forms from this tree.
 */

export type AttributeFieldTypeContract =
  | 'text'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'boolean'
  | 'year'
  | 'range';

export interface AttributeFieldDefContract {
  key: string;
  label: string;
  type: AttributeFieldTypeContract;
  options?: readonly string[];
  unit?: string;
  min?: number;
  max?: number;
  required?: boolean;
  placeholder?: string;
}

export interface TaxonomySubcategoryContract {
  label: string;
  slug: string;
  attributes?: readonly AttributeFieldDefContract[];
}

export interface TaxonomyCategoryContract {
  label: string;
  slug: string;
  sharedAttributes?: readonly AttributeFieldDefContract[];
  subcategories: readonly TaxonomySubcategoryContract[];
}

export const MARKETPLACE_TAXONOMY: readonly TaxonomyCategoryContract[] = [

  {
    label: "Auto, moto și ambarcațiuni",
    slug: "auto",
    sharedAttributes: [
      {
        key: "condition",
        label: "Stare",
        type: "select",
        options: ["Nou", "Utilizat", "Avariat", "Dezmembrat"],
      },
    ],
    subcategories: [
      {
        label: "Autoturisme",
        slug: "autoturisme",
      },
      {
        label: "Autoutilitare",
        slug: "autoutilitare",
      },
      {
        label: "SUV/Off-road",
        slug: "suv-offroad",
      },
      {
        label: "Camioane",
        slug: "camioane",
      },
      {
        label: "Rulote și remorci",
        slug: "rulote-remorci",
      },
      {
        label: "Motociclete/Scutere",
        slug: "motociclete-scutere",
      },
      {
        label: "ATV",
        slug: "atv",
      },
      {
        label: "Scutere/UTV",
        slug: "scutere-utv",
      },
      {
        label: "Ambarcațiuni",
        slug: "ambarcatiuni",
      },
      {
        label: "Piese auto",
        slug: "piese-auto",
      },
      {
        label: "Accesorii auto",
        slug: "accesorii-auto",
      },
      {
        label: "Service auto",
        slug: "service-auto",
      },
      {
        label: "Dezmembrări",
        slug: "dezmembrari",
      },
      {
        label: "Roți/Jante/Anvelope",
        slug: "roti-jante-anvelope",
      },
      {
        label: "Mecanică/Electrică",
        slug: "mecanica-electrica",
      },
      {
        label: "Caroserie/Interior",
        slug: "caroserie-interior",
      },
      {
        label: "Consumabile/Accesorii",
        slug: "consumabile-accesorii",
      },
    ],
  },
  {
    label: "Imobiliare",
    slug: "imobiliare",
    sharedAttributes: [
      {
        key: "rooms",
        label: "Camere",
        type: "number",
        min: 1,
        max: 20,
      },
      {
        key: "surface_sqm",
        label: "Suprafață (mp)",
        type: "number",
        unit: "mp",
        min: 1,
        max: 100000,
      },
      {
        key: "floor",
        label: "Etaj",
        type: "text",
        placeholder: "ex: 3 din 8",
      },
      {
        key: "construction_year",
        label: "An construcție",
        type: "year",
        min: 1800,
        max: 2030,
      },
      {
        key: "heating_type",
        label: "Încălzire",
        type: "select",
        options: ["Centrală proprie", "Centralizat", "Sobă", "Electrică", "Altele"],
      },
      {
        key: "furnished",
        label: "Mobilat",
        type: "select",
        options: ["Nemobilat", "Parțial mobilat", "Mobilat complet"],
      },
      {
        key: "parking",
        label: "Parcare",
        type: "select",
        options: ["Inclus", "Neinclus", "Garaj"],
      },
    ],
    subcategories: [
      {
        label: "Apartamente de vânzare",
        slug: "apartamente-vanzare",
      },
      {
        label: "Apartamente de închiriat",
        slug: "apartamente-inchiriere",
      },
      {
        label: "Case de vânzare",
        slug: "case-vile-vanzare",
      },
      {
        label: "Case de închiriat",
        slug: "case-inchiriere",
      },
      {
        label: "Terenuri",
        slug: "terenuri",
      },
      {
        label: "Spații comerciale",
        slug: "spatii-comerciale",
      },
      {
        label: "Spații comerciale de închiriat",
        slug: "spatii-comerciale-inchiriere",
      },
      {
        label: "Birouri",
        slug: "birouri",
      },
      {
        label: "Hale/Depozite",
        slug: "hale-depozite",
      },
      {
        label: "Garaje",
        slug: "garaje-parcari",
      },
      {
        label: "Camere de închiriat",
        slug: "camere-inchiriat",
      },
      {
        label: "Cazare/Chirii temporare",
        slug: "cazare-chirii-temporare",
      },
    ],
  },
  {
    label: "Electronice și electrocasnice",
    slug: "electronice",
    subcategories: [
      {
        label: "Telefoane mobile",
        slug: "telefoane",
        attributes: [
          {
            key: "brand",
            label: "Brand",
            type: "select",
            options: ["Apple", "Samsung", "Xiaomi", "Huawei", "OnePlus", "Google", "Motorola", "Nokia", "Oppo", "Realme", "Altul"],
          },
          {
            key: "model",
            label: "Model",
            type: "text",
            placeholder: "ex: iPhone 15 Pro Max",
          },
          {
            key: "storage_gb",
            label: "Stocare (GB)",
            type: "select",
            options: ["16", "32", "64", "128", "256", "512", "1024"],
          },
          {
            key: "ram_gb",
            label: "RAM (GB)",
            type: "select",
            options: ["2", "3", "4", "6", "8", "12", "16"],
          },
          {
            key: "color",
            label: "Culoare",
            type: "text",
          },
          {
            key: "warranty",
            label: "Garanție",
            type: "select",
            options: ["Da", "Nu", "Expirat"],
          },
          {
            key: "dual_sim",
            label: "Dual SIM",
            type: "boolean",
          },
        ],
      },
      {
        label: "Tablete",
        slug: "tablete",
      },
      {
        label: "Laptopuri",
        slug: "laptopuri",
        attributes: [
          {
            key: "brand",
            label: "Brand",
            type: "select",
            options: ["Apple", "Lenovo", "HP", "Dell", "ASUS", "Acer", "MSI", "Huawei", "Altul"],
          },
          {
            key: "processor",
            label: "Procesor",
            type: "text",
            placeholder: "ex: Intel i7-13700H",
          },
          {
            key: "ram_gb",
            label: "RAM (GB)",
            type: "select",
            options: ["4", "8", "16", "32", "64"],
          },
          {
            key: "storage_gb",
            label: "Stocare (GB)",
            type: "select",
            options: ["128", "256", "512", "1024", "2048"],
          },
          {
            key: "screen_size",
            label: "Diagonală ecran",
            type: "select",
            options: ["13\"", "14\"", "15.6\"", "16\"", "17\""],
          },
        ],
      },
      {
        label: "Computere desktop",
        slug: "calculatoare",
      },
      {
        label: "Gaming",
        slug: "gaming",
      },
      {
        label: "TV",
        slug: "tv",
      },
      {
        label: "Audio/Video",
        slug: "audio-video",
      },
      {
        label: "Console jocuri",
        slug: "console",
      },
      {
        label: "Camere foto/video",
        slug: "camere-foto-video",
      },
      {
        label: "Imprimante/Scannere",
        slug: "imprimante-scannere",
      },
      {
        label: "Smart Home",
        slug: "smart-home",
      },
      {
        label: "Drone",
        slug: "drone",
      },
      {
        label: "Componente PC",
        slug: "componente-pc",
      },
      {
        label: "Accesorii telefoane/tablete",
        slug: "accesorii-telefoane",
      },
      {
        label: "Frigidere",
        slug: "frigidere",
      },
      {
        label: "Mașini de spălat",
        slug: "masini-spalat",
      },
      {
        label: "Aspiratoare",
        slug: "aspiratoare",
      },
      {
        label: "Aparate de aer condiționat",
        slug: "aer-conditionat",
      },
      {
        label: "Echipamente IT",
        slug: "echipamente-it",
      },
    ],
  },
  {
    label: "Modă și frumusețe",
    slug: "moda",
    subcategories: [
      {
        label: "Îmbrăcăminte femei",
        slug: "haine-femei",
      },
      {
        label: "Îmbrăcăminte bărbați",
        slug: "haine-barbati",
      },
      {
        label: "Îmbrăcăminte copii",
        slug: "haine-copii",
      },
      {
        label: "Încălțăminte",
        slug: "incaltaminte",
      },
      {
        label: "Accesorii",
        slug: "accesorii-moda",
      },
      {
        label: "Bijuterii și ceasuri",
        slug: "bijuterii-ceasuri",
      },
      {
        label: "Genți",
        slug: "genti",
      },
      {
        label: "Produse cosmetice",
        slug: "cosmetice",
      },
      {
        label: "Beauty/Îngrijire",
        slug: "beauty",
      },
    ],
  },
  {
    label: "Casă și grădină",
    slug: "casa-si-gradina",
    subcategories: [
      {
        label: "Mobilă",
        slug: "mobila",
      },
      {
        label: "Decorațiuni",
        slug: "decoratiuni",
      },
      {
        label: "Iluminat",
        slug: "iluminat",
      },
      {
        label: "Textile casă",
        slug: "textile-casa",
      },
      {
        label: "Ustensile bucătărie",
        slug: "ustensile-bucatarie",
      },
      {
        label: "Unelte și scule",
        slug: "unelte-scule",
      },
      {
        label: "Echipamente grădină",
        slug: "echipamente-gradina",
      },
      {
        label: "Plante și flori",
        slug: "plante-flori",
      },
      {
        label: "Materiale construcție",
        slug: "materiale-constructie",
      },
      {
        label: "Instalații",
        slug: "instalatii",
      },
      {
        label: "Centrale/Încălzire",
        slug: "centrale-incalzire",
      },
      {
        label: "Electrocasnice casă",
        slug: "electrocasnice-casa",
      },
    ],
  },
  {
    label: "Sport, timp liber și artă",
    slug: "sport",
    subcategories: [
      {
        label: "Biciclete",
        slug: "biciclete",
      },
      {
        label: "Echipament sport",
        slug: "echipament-sport",
      },
      {
        label: "Fitness",
        slug: "fitness",
      },
      {
        label: "Camping",
        slug: "camping",
      },
      {
        label: "Pescuit/Vânătoare",
        slug: "pescuit-vanatoare",
      },
      {
        label: "Cărți",
        slug: "carti",
      },
      {
        label: "Muzică/Film",
        slug: "muzica-film",
      },
      {
        label: "Instrumente muzicale",
        slug: "instrumente-muzicale",
      },
      {
        label: "Colecții",
        slug: "colectii",
      },
      {
        label: "Artă",
        slug: "arta",
      },
    ],
  },
  {
    label: "Copii și bebeluși",
    slug: "copii",
    subcategories: [
      {
        label: "Haine copii/bebeluși",
        slug: "haine-copii-bebelusi",
      },
      {
        label: "Încălțăminte copii",
        slug: "incaltaminte-copii",
      },
      {
        label: "Cărucioare",
        slug: "carucioare",
      },
      {
        label: "Scaune auto",
        slug: "scaune-auto-copii",
      },
      {
        label: "Jucării",
        slug: "jucarii",
      },
      {
        label: "Cărți copii",
        slug: "carti-copii",
      },
      {
        label: "Articole școlari",
        slug: "articole-scolari",
      },
      {
        label: "Mobilier copii",
        slug: "mobilier-copii",
      },
      {
        label: "Produse bebeluși",
        slug: "produse-bebelusi",
      },
    ],
  },
  {
    label: "Animale de companie",
    slug: "animale",
    subcategories: [
      {
        label: "Câini",
        slug: "caini",
      },
      {
        label: "Pisici",
        slug: "pisici",
      },
      {
        label: "Păsări",
        slug: "pasari",
      },
      {
        label: "Pești acvariu",
        slug: "acvaristica",
      },
      {
        label: "Rozătoare",
        slug: "rozatoare",
      },
      {
        label: "Accesorii animale",
        slug: "accesorii-animale",
      },
      {
        label: "Hrană animale",
        slug: "hrana-animale",
      },
      {
        label: "Servicii animale",
        slug: "servicii-animale",
      },
    ],
  },
  {
    label: "Locuri de muncă",
    slug: "locuri-de-munca",
    sharedAttributes: [
      {
        key: "contract_type",
        label: "Tip contract",
        type: "select",
        options: ["Full-time", "Part-time", "Freelance", "Internship", "Temporar"],
      },
      {
        key: "salary_range",
        label: "Salariu (RON)",
        type: "text",
        placeholder: "ex: 4000-6000 RON net",
      },
      {
        key: "work_mode",
        label: "Mod lucru",
        type: "select",
        options: ["La sediu", "Remote", "Hibrid"],
      },
      {
        key: "experience",
        label: "Experiență",
        type: "select",
        options: ["Fără experiență", "1-2 ani", "3-5 ani", "5+ ani"],
      },
      {
        key: "schedule",
        label: "Program",
        type: "select",
        options: ["Luni-Vineri", "Ture", "Flexibil", "Weekend"],
      },
    ],
    subcategories: [
      {
        label: "IT/Software",
        slug: "it-software",
      },
      {
        label: "Vânzări/Marketing",
        slug: "vanzari-marketing",
      },
      {
        label: "Construcții",
        slug: "constructii-joburi",
      },
      {
        label: "Educație",
        slug: "educatie-joburi",
      },
      {
        label: "Turism/Horeca",
        slug: "turism-horeca",
      },
      {
        label: "Transport/Logistică",
        slug: "transport-logistica",
      },
      {
        label: "Medical",
        slug: "medical-joburi",
      },
      {
        label: "Șoferi/Transport",
        slug: "soferi",
      },
      {
        label: "Curățenie",
        slug: "curatenie-joburi",
      },
      {
        label: "Îngrijire persoane",
        slug: "ingrijire-persoane",
      },
      {
        label: "Call center",
        slug: "call-center",
      },
      {
        label: "Agricultură",
        slug: "agricultura-joburi",
      },
      {
        label: "Alte domenii",
        slug: "alte-domenii",
      },
    ],
  },
  {
    label: "Servicii și afaceri",
    slug: "servicii",
    sharedAttributes: [
      {
        key: "service_type",
        label: "Tip serviciu",
        type: "select",
        options: ["La domiciliu", "La sediu", "Online", "La cerere"],
      },
      {
        key: "coverage_area",
        label: "Zonă acoperire",
        type: "text",
        placeholder: "ex: București și Ilfov",
      },
      {
        key: "availability",
        label: "Disponibilitate",
        type: "select",
        options: ["Imediat", "La programare", "Luni-Vineri", "Non-stop"],
      },
      {
        key: "pricing_type",
        label: "Tip preț",
        type: "select",
        options: ["Fix", "Negociabil", "Pe oră", "La cerere"],
      },
    ],
    subcategories: [
      {
        label: "Servicii IT",
        slug: "servicii-it",
      },
      {
        label: "Construcții/Renovări",
        slug: "constructii-renovari",
      },
      {
        label: "Reparații",
        slug: "reparatii",
      },
      {
        label: "Reparații electronice",
        slug: "reparatii-electronice",
      },
      {
        label: "Transport/Mutări",
        slug: "transport-mutari",
      },
      {
        label: "Curățenie",
        slug: "curatenie-servicii",
      },
      {
        label: "Beauty/Salon",
        slug: "beauty-salon",
      },
      {
        label: "Evenimente",
        slug: "evenimente",
      },
      {
        label: "Educație/Cursuri",
        slug: "educatie-cursuri",
      },
      {
        label: "Servicii juridice",
        slug: "servicii-juridice",
      },
      {
        label: "Servicii medicale",
        slug: "servicii-medicale",
      },
      {
        label: "Auto service",
        slug: "auto-service",
      },
      {
        label: "Servicii business",
        slug: "servicii-business",
      },
      {
        label: "Afaceri de vânzare",
        slug: "afaceri-vanzare",
      },
    ],
  },
  {
    label: "Agricultură",
    slug: "agricultura",
    subcategories: [
      {
        label: "Tractoare",
        slug: "tractoare",
      },
      {
        label: "Utilaje agricole",
        slug: "utilaje-agricole",
      },
      {
        label: "Animale de fermă",
        slug: "animale-ferma",
      },
      {
        label: "Produse agricole",
        slug: "produse-agricole",
      },
      {
        label: "Terenuri agricole",
        slug: "terenuri-agricole",
      },
      {
        label: "Furaje",
        slug: "furaje",
      },
      {
        label: "Semințe/Plante",
        slug: "seminte-plante",
      },
      {
        label: "Echipamente",
        slug: "echipamente-agricole",
      },
    ],
  },
  {
    label: "Altele",
    slug: "altele",
    subcategories: [
      {
        label: "Diverse",
        slug: "diverse",
      },
      {
        label: "Pierdut/Găsit",
        slug: "pierdut-gasit",
      },
      {
        label: "Schimb",
        slug: "schimb",
      },
      {
        label: "Donații",
        slug: "donatii",
      },
    ],
  },
] as const;

/** All top-level category labels (stable set; matches `Listing.category` DB values). */
export const TAXONOMY_CATEGORY_LABELS: readonly string[] = MARKETPLACE_TAXONOMY.map(
  (c) => c.label,
);

/** Subcategory labels for a given category label (empty array if unknown). */
export function taxonomySubcategoryLabels(categoryLabel: string): string[] {
  const cat = MARKETPLACE_TAXONOMY.find((c) => c.label === categoryLabel);
  return cat ? cat.subcategories.map((s) => s.label) : [];
}

/** UI-safe attribute defs for category + optional subcategory (shared + sub-specific). */
export function getContractAttributeDefsFor(
  categoryLabel: string,
  subcategoryLabel?: string | null,
): AttributeFieldDefContract[] {
  const cat = MARKETPLACE_TAXONOMY.find((c) => c.label === categoryLabel);
  if (!cat) return [];
  const shared = [...(cat.sharedAttributes ?? [])];
  if (subcategoryLabel) {
    const sub = cat.subcategories.find((s) => s.label === subcategoryLabel);
    if (sub?.attributes?.length) {
      return [...shared, ...sub.attributes];
    }
  }
  return shared;
}

/** True when the category tree defines at least one subcategory. */
export function contractCategoryRequiresSubcategory(categoryLabel: string): boolean {
  const cat = MARKETPLACE_TAXONOMY.find((c) => c.label === categoryLabel);
  return Boolean(cat && cat.subcategories.length > 0);
}

/**
 * Neutral price-field copy for clients (no DB migration).
 * Jobs: do not claim structured salary.
 */
export function getMarketplacePriceFieldCopy(categoryLabel: string | null | undefined): {
  label: string;
  hint: string;
} {
  const slug = categoryLabel
    ? MARKETPLACE_TAXONOMY.find((c) => c.label === categoryLabel)?.slug
    : undefined;
  switch (slug) {
    case 'locuri-de-munca':
      return {
        label: 'Valoare numerică (compatibilitate)',
        hint: 'Limitare tehnică: trebuie un număr > 0. Nu este salariu structurat.',
      };
    case 'servicii':
      return {
        label: 'Tarif (RON/EUR)',
        hint: 'Tipul de tarif e în atribute; valoarea numerică rămâne obligatorie (> 0).',
      };
    case 'altele':
      return {
        label: 'Preț',
        hint: 'Nu există tip „gratuit” în DB — valoarea trebuie să fie > 0.',
      };
    default:
      return { label: 'Preț', hint: '' };
  }
}

/**
 * Enterprise taxonomy system for ClickAnunt.
 *
 * This is the SINGLE SOURCE OF TRUTH for:
 * - Category/subcategory tree
 * - Per-category attribute schemas (stored in JSON `attributes` column)
 * - Prohibited content rules
 * - Slug mappings
 *
 * IMPORTANT: Top-level category LABELS must never be renamed or removed —
 * they are stored verbatim in the Listing.category DB column.
 * Only ADDITIONS are safe.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AttributeFieldType =
  | 'text'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'boolean'
  | 'year'
  | 'range';

export interface AttributeFieldDef {
  key: string;
  label: string;
  type: AttributeFieldType;
  options?: string[];
  unit?: string;
  min?: number;
  max?: number;
  required?: boolean;
  placeholder?: string;
}

export interface SubcategoryDef {
  label: string;
  slug: string;
  attributes?: AttributeFieldDef[];
  /** If true, listings in this subcategory go to manual moderation. */
  requiresModeration?: boolean;
}

export interface CategoryDef {
  label: string;
  slug: string;
  subcategories: SubcategoryDef[];
  /** Shared attributes for ALL subcategories in this category. */
  sharedAttributes?: AttributeFieldDef[];
  /** If true, listings in this category go to manual moderation regardless of trust. */
  requiresModeration?: boolean;
}

export interface ProhibitedRule {
  pattern: RegExp;
  reason: string;
  severity: 'block' | 'flag';
}

// ---------------------------------------------------------------------------
// Enterprise Category Tree
// ---------------------------------------------------------------------------

export const TAXONOMY: CategoryDef[] = [
  {
    label: 'Auto, moto și ambarcațiuni',
    slug: 'auto',
    sharedAttributes: [
      { key: 'condition', label: 'Stare', type: 'select', options: ['Nou', 'Utilizat', 'Avariat', 'Dezmembrat'] },
    ],
    subcategories: [
      { label: 'Autoturisme', slug: 'autoturisme' },
      { label: 'Autoutilitare', slug: 'autoutilitare' },
      { label: 'SUV/Off-road', slug: 'suv-offroad' },
      { label: 'Camioane', slug: 'camioane' },
      { label: 'Rulote și remorci', slug: 'rulote-remorci' },
      { label: 'Motociclete/Scutere', slug: 'motociclete-scutere' },
      { label: 'ATV', slug: 'atv' },
      { label: 'Scutere/UTV', slug: 'scutere-utv' },
      { label: 'Ambarcațiuni', slug: 'ambarcatiuni' },
      { label: 'Piese auto', slug: 'piese-auto' },
      { label: 'Accesorii auto', slug: 'accesorii-auto' },
      { label: 'Service auto', slug: 'service-auto' },
      { label: 'Dezmembrări', slug: 'dezmembrari' },
      { label: 'Roți/Jante/Anvelope', slug: 'roti-jante-anvelope' },
      { label: 'Mecanică/Electrică', slug: 'mecanica-electrica' },
      { label: 'Caroserie/Interior', slug: 'caroserie-interior' },
      { label: 'Consumabile/Accesorii', slug: 'consumabile-accesorii' },
    ],
  },
  {
    label: 'Imobiliare',
    slug: 'imobiliare',
    sharedAttributes: [
      { key: 'rooms', label: 'Camere', type: 'number', min: 1, max: 20 },
      { key: 'surface_sqm', label: 'Suprafață (mp)', type: 'number', min: 1, max: 100000, unit: 'mp' },
      { key: 'floor', label: 'Etaj', type: 'text', placeholder: 'ex: 3 din 8' },
      { key: 'construction_year', label: 'An construcție', type: 'year', min: 1800, max: 2030 },
      { key: 'heating_type', label: 'Încălzire', type: 'select', options: ['Centrală proprie', 'Centralizat', 'Sobă', 'Electrică', 'Altele'] },
      { key: 'furnished', label: 'Mobilat', type: 'select', options: ['Nemobilat', 'Parțial mobilat', 'Mobilat complet'] },
      { key: 'parking', label: 'Parcare', type: 'select', options: ['Inclus', 'Neinclus', 'Garaj'] },
    ],
    subcategories: [
      { label: 'Apartamente de vânzare', slug: 'apartamente-vanzare' },
      { label: 'Apartamente de închiriat', slug: 'apartamente-inchiriere' },
      { label: 'Case de vânzare', slug: 'case-vile-vanzare' },
      { label: 'Case de închiriat', slug: 'case-inchiriere' },
      { label: 'Terenuri', slug: 'terenuri' },
      { label: 'Spații comerciale', slug: 'spatii-comerciale' },
      { label: 'Spații comerciale de închiriat', slug: 'spatii-comerciale-inchiriere' },
      { label: 'Birouri', slug: 'birouri' },
      { label: 'Hale/Depozite', slug: 'hale-depozite' },
      { label: 'Garaje', slug: 'garaje-parcari' },
      { label: 'Camere de închiriat', slug: 'camere-inchiriat' },
      { label: 'Cazare/Chirii temporare', slug: 'cazare-chirii-temporare' },
    ],
  },
  {
    label: 'Electronice și electrocasnice',
    slug: 'electronice',
    subcategories: [
      { label: 'Telefoane mobile', slug: 'telefoane', attributes: [
        { key: 'brand', label: 'Brand', type: 'select', options: ['Apple', 'Samsung', 'Xiaomi', 'Huawei', 'OnePlus', 'Google', 'Motorola', 'Nokia', 'Oppo', 'Realme', 'Altul'] },
        { key: 'model', label: 'Model', type: 'text', placeholder: 'ex: iPhone 15 Pro Max' },
        { key: 'storage_gb', label: 'Stocare (GB)', type: 'select', options: ['16', '32', '64', '128', '256', '512', '1024'] },
        { key: 'ram_gb', label: 'RAM (GB)', type: 'select', options: ['2', '3', '4', '6', '8', '12', '16'] },
        { key: 'color', label: 'Culoare', type: 'text' },
        { key: 'warranty', label: 'Garanție', type: 'select', options: ['Da', 'Nu', 'Expirat'] },
        { key: 'dual_sim', label: 'Dual SIM', type: 'boolean' },
      ]},
      { label: 'Tablete', slug: 'tablete' },
      { label: 'Laptopuri', slug: 'laptopuri', attributes: [
        { key: 'brand', label: 'Brand', type: 'select', options: ['Apple', 'Lenovo', 'HP', 'Dell', 'ASUS', 'Acer', 'MSI', 'Huawei', 'Altul'] },
        { key: 'processor', label: 'Procesor', type: 'text', placeholder: 'ex: Intel i7-13700H' },
        { key: 'ram_gb', label: 'RAM (GB)', type: 'select', options: ['4', '8', '16', '32', '64'] },
        { key: 'storage_gb', label: 'Stocare (GB)', type: 'select', options: ['128', '256', '512', '1024', '2048'] },
        { key: 'screen_size', label: 'Diagonală ecran', type: 'select', options: ['13"', '14"', '15.6"', '16"', '17"'] },
      ]},
      { label: 'Computere desktop', slug: 'calculatoare' },
      { label: 'Gaming', slug: 'gaming' },
      { label: 'TV', slug: 'tv' },
      { label: 'Audio/Video', slug: 'audio-video' },
      { label: 'Console jocuri', slug: 'console' },
      { label: 'Camere foto/video', slug: 'camere-foto-video' },
      { label: 'Imprimante/Scannere', slug: 'imprimante-scannere' },
      { label: 'Smart Home', slug: 'smart-home' },
      { label: 'Drone', slug: 'drone' },
      { label: 'Componente PC', slug: 'componente-pc' },
      { label: 'Accesorii telefoane/tablete', slug: 'accesorii-telefoane' },
      { label: 'Frigidere', slug: 'frigidere' },
      { label: 'Mașini de spălat', slug: 'masini-spalat' },
      { label: 'Aspiratoare', slug: 'aspiratoare' },
      { label: 'Aparate de aer condiționat', slug: 'aer-conditionat' },
      { label: 'Echipamente IT', slug: 'echipamente-it' },
    ],
  },
  {
    label: 'Modă și frumusețe',
    slug: 'moda',
    subcategories: [
      { label: 'Îmbrăcăminte femei', slug: 'haine-femei' },
      { label: 'Îmbrăcăminte bărbați', slug: 'haine-barbati' },
      { label: 'Îmbrăcăminte copii', slug: 'haine-copii' },
      { label: 'Încălțăminte', slug: 'incaltaminte' },
      { label: 'Accesorii', slug: 'accesorii-moda' },
      { label: 'Bijuterii și ceasuri', slug: 'bijuterii-ceasuri' },
      { label: 'Genți', slug: 'genti' },
      { label: 'Produse cosmetice', slug: 'cosmetice' },
      { label: 'Beauty/Îngrijire', slug: 'beauty' },
    ],
  },
  {
    label: 'Casă și grădină',
    slug: 'casa-si-gradina',
    subcategories: [
      { label: 'Mobilă', slug: 'mobila' },
      { label: 'Decorațiuni', slug: 'decoratiuni' },
      { label: 'Iluminat', slug: 'iluminat' },
      { label: 'Textile casă', slug: 'textile-casa' },
      { label: 'Ustensile bucătărie', slug: 'ustensile-bucatarie' },
      { label: 'Unelte și scule', slug: 'unelte-scule' },
      { label: 'Echipamente grădină', slug: 'echipamente-gradina' },
      { label: 'Plante și flori', slug: 'plante-flori' },
      { label: 'Materiale construcție', slug: 'materiale-constructie' },
      { label: 'Instalații', slug: 'instalatii' },
      { label: 'Centrale/Încălzire', slug: 'centrale-incalzire' },
      { label: 'Electrocasnice casă', slug: 'electrocasnice-casa' },
    ],
  },
  {
    label: 'Sport, timp liber și artă',
    slug: 'sport',
    subcategories: [
      { label: 'Biciclete', slug: 'biciclete' },
      { label: 'Echipament sport', slug: 'echipament-sport' },
      { label: 'Fitness', slug: 'fitness' },
      { label: 'Camping', slug: 'camping' },
      { label: 'Pescuit/Vânătoare', slug: 'pescuit-vanatoare' },
      { label: 'Cărți', slug: 'carti' },
      { label: 'Muzică/Film', slug: 'muzica-film' },
      { label: 'Instrumente muzicale', slug: 'instrumente-muzicale' },
      { label: 'Colecții', slug: 'colectii' },
      { label: 'Artă', slug: 'arta' },
    ],
  },
  {
    label: 'Copii și bebeluși',
    slug: 'copii',
    subcategories: [
      { label: 'Haine copii/bebeluși', slug: 'haine-copii-bebelusi' },
      { label: 'Încălțăminte copii', slug: 'incaltaminte-copii' },
      { label: 'Cărucioare', slug: 'carucioare' },
      { label: 'Scaune auto', slug: 'scaune-auto-copii' },
      { label: 'Jucării', slug: 'jucarii' },
      { label: 'Cărți copii', slug: 'carti-copii' },
      { label: 'Articole școlari', slug: 'articole-scolari' },
      { label: 'Mobilier copii', slug: 'mobilier-copii' },
      { label: 'Produse bebeluși', slug: 'produse-bebelusi' },
    ],
  },
  {
    label: 'Animale de companie',
    slug: 'animale',
    subcategories: [
      { label: 'Câini', slug: 'caini' },
      { label: 'Pisici', slug: 'pisici' },
      { label: 'Păsări', slug: 'pasari' },
      { label: 'Pești acvariu', slug: 'acvaristica' },
      { label: 'Rozătoare', slug: 'rozatoare' },
      { label: 'Accesorii animale', slug: 'accesorii-animale' },
      { label: 'Hrană animale', slug: 'hrana-animale' },
      { label: 'Servicii animale', slug: 'servicii-animale' },
    ],
  },
  {
    label: 'Locuri de muncă',
    slug: 'locuri-de-munca',
    sharedAttributes: [
      { key: 'contract_type', label: 'Tip contract', type: 'select', options: ['Full-time', 'Part-time', 'Freelance', 'Internship', 'Temporar'] },
      { key: 'salary_range', label: 'Salariu (RON)', type: 'text', placeholder: 'ex: 4000-6000 RON net' },
      { key: 'work_mode', label: 'Mod lucru', type: 'select', options: ['La sediu', 'Remote', 'Hibrid'] },
      { key: 'experience', label: 'Experiență', type: 'select', options: ['Fără experiență', '1-2 ani', '3-5 ani', '5+ ani'] },
      { key: 'schedule', label: 'Program', type: 'select', options: ['Luni-Vineri', 'Ture', 'Flexibil', 'Weekend'] },
    ],
    subcategories: [
      { label: 'IT/Software', slug: 'it-software' },
      { label: 'Vânzări/Marketing', slug: 'vanzari-marketing' },
      { label: 'Construcții', slug: 'constructii-joburi' },
      { label: 'Educație', slug: 'educatie-joburi' },
      { label: 'Turism/Horeca', slug: 'turism-horeca' },
      { label: 'Transport/Logistică', slug: 'transport-logistica' },
      { label: 'Medical', slug: 'medical-joburi' },
      { label: 'Șoferi/Transport', slug: 'soferi' },
      { label: 'Curățenie', slug: 'curatenie-joburi' },
      { label: 'Îngrijire persoane', slug: 'ingrijire-persoane' },
      { label: 'Call center', slug: 'call-center' },
      { label: 'Agricultură', slug: 'agricultura-joburi' },
      { label: 'Alte domenii', slug: 'alte-domenii' },
    ],
  },
  {
    label: 'Servicii și afaceri',
    slug: 'servicii',
    sharedAttributes: [
      { key: 'service_type', label: 'Tip serviciu', type: 'select', options: ['La domiciliu', 'La sediu', 'Online', 'La cerere'] },
      { key: 'coverage_area', label: 'Zonă acoperire', type: 'text', placeholder: 'ex: București și Ilfov' },
      { key: 'availability', label: 'Disponibilitate', type: 'select', options: ['Imediat', 'La programare', 'Luni-Vineri', 'Non-stop'] },
      { key: 'pricing_type', label: 'Tip preț', type: 'select', options: ['Fix', 'Negociabil', 'Pe oră', 'La cerere'] },
    ],
    subcategories: [
      { label: 'Servicii IT', slug: 'servicii-it' },
      { label: 'Construcții/Renovări', slug: 'constructii-renovari' },
      { label: 'Reparații', slug: 'reparatii' },
      { label: 'Reparații electronice', slug: 'reparatii-electronice' },
      { label: 'Transport/Mutări', slug: 'transport-mutari' },
      { label: 'Curățenie', slug: 'curatenie-servicii' },
      { label: 'Beauty/Salon', slug: 'beauty-salon' },
      { label: 'Evenimente', slug: 'evenimente' },
      { label: 'Educație/Cursuri', slug: 'educatie-cursuri' },
      { label: 'Servicii juridice', slug: 'servicii-juridice' },
      { label: 'Servicii medicale', slug: 'servicii-medicale', requiresModeration: true },
      { label: 'Auto service', slug: 'auto-service' },
      { label: 'Servicii business', slug: 'servicii-business' },
      { label: 'Afaceri de vânzare', slug: 'afaceri-vanzare' },
    ],
  },
  {
    label: 'Agricultură',
    slug: 'agricultura',
    subcategories: [
      { label: 'Tractoare', slug: 'tractoare' },
      { label: 'Utilaje agricole', slug: 'utilaje-agricole' },
      { label: 'Animale de fermă', slug: 'animale-ferma' },
      { label: 'Produse agricole', slug: 'produse-agricole' },
      { label: 'Terenuri agricole', slug: 'terenuri-agricole' },
      { label: 'Furaje', slug: 'furaje' },
      { label: 'Semințe/Plante', slug: 'seminte-plante' },
      { label: 'Echipamente', slug: 'echipamente-agricole' },
    ],
  },
  {
    label: 'Altele',
    slug: 'altele',
    subcategories: [
      { label: 'Diverse', slug: 'diverse' },
      { label: 'Pierdut/Găsit', slug: 'pierdut-gasit' },
      { label: 'Schimb', slug: 'schimb' },
      { label: 'Donații', slug: 'donatii' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Prohibited Content Rules
// ---------------------------------------------------------------------------

export const PROHIBITED_CONTENT_RULES: ProhibitedRule[] = [
  // Hard blocks
  { pattern: /\b(arme?\b|pistol|pușc[aă]|muniți[ei]|gloan[tț]e|grenad[aă]|explozibil)/i, reason: 'Arme, muniție sau explozibili', severity: 'block' },
  { pattern: /\b(droguri?|marijuana|canabis|cocain[aă]|heroină|metamfetamin[aă]|ecstasy|mdma)\b/i, reason: 'Substanțe interzise/droguri', severity: 'block' },
  { pattern: /\b(viagra|cialis|xanax|diazepam|tramadol|codeină|morfin[aă]|oxycodon[eă]?)\b/i, reason: 'Medicamente cu prescripție medicală', severity: 'block' },
  { pattern: /\b(servicii\s*sexuale|escortă?|masaj\s*erotic|prostitu[tț]ie)\b/i, reason: 'Servicii interzise (adult)', severity: 'block' },
  { pattern: /\b(certificat\s*fals|diplom[aă]\s*fals[aă]|permis\s*fals|buletine?\s*fals[eă]?)\b/i, reason: 'Documente false', severity: 'block' },
  { pattern: /\b(organe?\s*(umane|la\s*vânzare)|traficanți?|trafic\s*de\s*persoane)\b/i, reason: 'Trafic de persoane/organe', severity: 'block' },
  { pattern: /\b(spălare?\s*(de\s*)?bani|money\s*laundering)\b/i, reason: 'Spălare de bani', severity: 'block' },
  { pattern: /\b(cont\s*bancar\s*(vând|cumpăr)|card\s*clonat|skimmer)\b/i, reason: 'Fraudă financiară', severity: 'block' },
  // Soft flags (go to moderation queue)
  { pattern: /\b(contrafăcut[eă]?|replica|fake|imitați[ei])\b/i, reason: 'Produse contrafăcute', severity: 'flag' },
  { pattern: /\b(furat[eă]?|proveniență\s*ilegală|fără\s*acte)\b/i, reason: 'Bunuri furate sau fără proveniență legală', severity: 'flag' },
  { pattern: /\b(pirotehnic[eă]?|artificii|petard[eă]?|pocnitor)/i, reason: 'Articole pirotehnice (necesită verificare)', severity: 'flag' },
  { pattern: /\b(cuțit\s*de\s*vânătoare|spray\s*lacrimogen|electro[sș]oc|box\s*metalic)\b/i, reason: 'Obiecte cu potențial periculos', severity: 'flag' },
  { pattern: /\b(western\s*union|money\s*gram|plata?\s*în\s*avans|trimite\s*banii?\s*înainte)\b/i, reason: 'Indicii fraudă plată', severity: 'flag' },
  { pattern: /\b(câștig\s*garantat|venit\s*pasiv\s*garantat|schema?\s*ponzi|piramid[aă])\b/i, reason: 'Schema financiară suspectă', severity: 'flag' },
  { pattern: /\b(fără\s*contract|la\s*negru|muncă?\s*ilegală)\b/i, reason: 'Muncă fără contract (Jobs)', severity: 'flag' },
];

/** Category-specific prohibited rules (applied only when listing is in that category). */
export const CATEGORY_PROHIBITED_RULES: { categoryLabel: string; rules: ProhibitedRule[] }[] = [
  {
    categoryLabel: 'Animale de companie',
    rules: [
      { pattern: /\b(lupte?\s*(de\s*)?câini|dog\s*fight|cocoș[ei]?\s*de\s*luptă)\b/i, reason: 'Lupte de animale (interzise)', severity: 'block' },
      { pattern: /\b(specii?\s*protejat[eă]|cites|papagal\s*ara|maimuț[eă])\b/i, reason: 'Animale protejate (CITES)', severity: 'flag' },
    ],
  },
  {
    categoryLabel: 'Locuri de muncă',
    rules: [
      { pattern: /\b(fără\s*experiență.*\d{4,}\s*(eur|€|usd|\$))/i, reason: 'Job suspect: salariu nerealist', severity: 'flag' },
      { pattern: /\b(videochat|cam\s*model|studio\s*adult)\b/i, reason: 'Job adult', severity: 'flag' },
    ],
  },
  {
    categoryLabel: 'Electronice și electrocasnice',
    rules: [
      { pattern: /\b(deblocat?\s*icloud|bypass\s*frp|cont\s*furat|activation\s*lock)\b/i, reason: 'Dispozitiv furat/blocat', severity: 'flag' },
    ],
  },
];

/** Check listing text against prohibited content rules (including category-specific). */
export function checkProhibitedContent(
  title: string,
  description: string,
  categoryLabel?: string
): { blocked: boolean; flags: { reason: string; severity: 'block' | 'flag' }[] } {
  const text = `${title} ${description}`;
  const flags: { reason: string; severity: 'block' | 'flag' }[] = [];

  for (const rule of PROHIBITED_CONTENT_RULES) {
    if (rule.pattern.test(text)) {
      flags.push({ reason: rule.reason, severity: rule.severity });
    }
  }

  // Apply category-specific rules
  if (categoryLabel) {
    const catRules = CATEGORY_PROHIBITED_RULES.find((r) => r.categoryLabel === categoryLabel);
    if (catRules) {
      for (const rule of catRules.rules) {
        if (rule.pattern.test(text)) {
          flags.push({ reason: rule.reason, severity: rule.severity });
        }
      }
    }
  }

  const blocked = flags.some((f) => f.severity === 'block');
  return { blocked, flags };
}

// ---------------------------------------------------------------------------
// Lookup Helpers
// ---------------------------------------------------------------------------

/** Map: category label -> CategoryDef (for O(1) lookup) */
const _categoryByLabel = new Map<string, CategoryDef>();
/** Map: category slug -> CategoryDef */
const _categoryBySlug = new Map<string, CategoryDef>();
/** Map: "categoryLabel::subcategoryLabel" -> SubcategoryDef */
const _subcategoryMap = new Map<string, SubcategoryDef>();

for (const cat of TAXONOMY) {
  _categoryByLabel.set(cat.label, cat);
  _categoryBySlug.set(cat.slug, cat);
  for (const sub of cat.subcategories) {
    _subcategoryMap.set(`${cat.label}::${sub.label}`, sub);
  }
}

/** All valid top-level category labels (stable set — matches DB values). */
export const VALID_CATEGORY_LABELS: ReadonlySet<string> = new Set(TAXONOMY.map((c) => c.label));

/** All valid subcategory labels for a given category. */
export function validSubcategoryLabelsFor(categoryLabel: string): string[] {
  const cat = _categoryByLabel.get(categoryLabel);
  if (!cat) return [];
  return cat.subcategories.map((s) => s.label);
}

/** Check if a category label is valid. */
export function isValidCategory(label: string): boolean {
  return VALID_CATEGORY_LABELS.has(label);
}

/** Check if a subcategory is valid for the given category. */
export function isValidSubcategory(categoryLabel: string, subcategoryLabel: string): boolean {
  return _subcategoryMap.has(`${categoryLabel}::${subcategoryLabel}`);
}

/** Get category definition by label. */
export function getCategoryDef(label: string): CategoryDef | undefined {
  return _categoryByLabel.get(label);
}

/** Get category definition by slug. */
export function getCategoryDefBySlug(slug: string): CategoryDef | undefined {
  return _categoryBySlug.get(slug);
}

/** Get attribute definitions for a category + optional subcategory. */
export function getAttributeDefsFor(
  categoryLabel: string,
  subcategoryLabel?: string | null
): AttributeFieldDef[] {
  const cat = _categoryByLabel.get(categoryLabel);
  if (!cat) return [];

  const shared = cat.sharedAttributes ?? [];

  if (subcategoryLabel) {
    const sub = _subcategoryMap.get(`${categoryLabel}::${subcategoryLabel}`);
    if (sub?.attributes) {
      return [...shared, ...sub.attributes];
    }
  }

  return shared;
}

/** Flat list of all subcategory labels across all categories (for legacy compat). */
export function allSubcategoryLabels(): string[] {
  return TAXONOMY.flatMap((cat) => cat.subcategories.map((s) => s.label));
}

/** Resolve a subcategory slug within a given category slug. Returns subcategory def or null. */
export function resolveSubcategoryBySlug(
  categorySlug: string,
  subcategorySlug: string
): { category: CategoryDef; subcategory: SubcategoryDef } | null {
  const cat = _categoryBySlug.get(categorySlug);
  if (!cat) return null;
  const sub = cat.subcategories.find((s) => s.slug === subcategorySlug);
  if (!sub) return null;
  return { category: cat, subcategory: sub };
}

/** Get all subcategory slug/label pairs for a given category slug. */
export function subcategorySlugsForCategory(categorySlug: string): { slug: string; label: string }[] {
  const cat = _categoryBySlug.get(categorySlug);
  if (!cat) return [];
  return cat.subcategories.map((s) => ({ slug: s.slug, label: s.label }));
}

/** Iterate all category + subcategory slug pairs (for sitemap generation). */
export function iterateAllSubcategorySlugs(): { categorySlug: string; subcategorySlug: string; categoryLabel: string; subcategoryLabel: string }[] {
  const out: { categorySlug: string; subcategorySlug: string; categoryLabel: string; subcategoryLabel: string }[] = [];
  for (const cat of TAXONOMY) {
    for (const sub of cat.subcategories) {
      out.push({
        categorySlug: cat.slug,
        subcategorySlug: sub.slug,
        categoryLabel: cat.label,
        subcategoryLabel: sub.label,
      });
    }
  }
  return out;
}

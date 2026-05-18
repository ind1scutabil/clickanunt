/**
 * Admin command center — rute existente și etichete (fără logică de business).
 * Folosit de AdminCommandCenter și teste unitare.
 */

export type AdminCommandCenterStats = {
  pendingListings: number;
  activeListings: number;
  registeredUsers: number;
  reportsReceived: number;
};

export type AdminCommandCardConfig = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: string;
  iconWrapClass: string;
  /** Afișează număr doar dacă count este definit și >= 0 */
  countKey?: keyof AdminCommandCenterStats;
  countLabel?: string;
  openLabel?: string;
};

export type AdminModerationQuickLink = {
  id: string;
  label: string;
  href: string;
  countKey?: keyof AdminCommandCenterStats;
};

export const ADMIN_COMMAND_CENTER_HEADING = "Admin Command Center";

export const ADMIN_COMMAND_CARDS: AdminCommandCardConfig[] = [
  {
    id: "moderation",
    title: "Moderare",
    description: "Coadă anunțuri, utilizatori, raportări",
    href: "/admin/moderation?tab=pending",
    icon: "🛡️",
    iconWrapClass: "bg-violet-500/15",
    countKey: "pendingListings",
    countLabel: "în așteptare",
    openLabel: "Deschide moderarea",
  },
  {
    id: "catalog",
    title: "Anunțuri / Catalog",
    description: "Anunțuri active și vizualizare publică",
    href: "/listings",
    icon: "📋",
    iconWrapClass: "bg-cyan-500/12",
    countKey: "activeListings",
    countLabel: "active",
    openLabel: "Deschide catalogul",
  },
  {
    id: "users",
    title: "Utilizatori",
    description: "Conturi, beneficii, suspendări",
    href: "/admin/moderation?tab=users",
    icon: "👥",
    iconWrapClass: "bg-[var(--accent-primary)]/12",
    countKey: "registeredUsers",
    countLabel: "înregistrați",
    openLabel: "Listă utilizatori",
  },
  {
    id: "promotions",
    title: "Promoții",
    description: "Pachete, vizibilitate, instrumente admin",
    href: "/admin/promotions",
    icon: "✨",
    iconWrapClass: "bg-amber-500/15",
    openLabel: "Deschide promoții",
  },
  {
    id: "invoices",
    title: "Facturi & venituri",
    description: "Plăți, facturare, conformitate ANAF",
    href: "/admin/invoices",
    icon: "💵",
    iconWrapClass: "bg-rose-500/10",
    openLabel: "Deschide facturi",
  },
  {
    id: "messaging",
    title: "Mesagerie & notificări",
    description: "Diagnostic mesaje, broadcast, alerte",
    href: "/admin/messaging",
    icon: "📡",
    iconWrapClass: "bg-sky-500/15",
    openLabel: "Deschide mesagerie",
  },
];

export const ADMIN_MODERATION_QUICK_LINKS: AdminModerationQuickLink[] = [
  {
    id: "pending",
    label: "Anunțuri în așteptare",
    href: "/admin/moderation?tab=pending",
    countKey: "pendingListings",
  },
  {
    id: "users",
    label: "Utilizatori",
    href: "/admin/moderation?tab=users",
    countKey: "registeredUsers",
  },
  {
    id: "reports",
    label: "Raportări",
    href: "/admin/moderation?tab=reports",
    countKey: "reportsReceived",
  },
  {
    id: "rejected",
    label: "Respinse",
    href: "/admin/moderation?tab=rejected",
  },
  {
    id: "approved",
    label: "Aprobate",
    href: "/admin/moderation?tab=approved",
  },
  {
    id: "appeals",
    label: "Apeluri",
    href: "/admin/moderation?tab=appeals",
  },
];

export const ADMIN_SECONDARY_LINKS = [
  {
    id: "dashboard-ops",
    label: "Operațiuni globale (broadcast)",
    href: "/admin/dashboard#admin-global-ops",
  },
  {
    id: "dashboard-self",
    label: "Dashboard metrici",
    href: "/admin/dashboard#admin-kpi-section",
  },
] as const;

export function resolveAdminCardCount(
  card: AdminCommandCardConfig,
  stats: AdminCommandCenterStats
): number | null {
  if (!card.countKey) return null;
  const v = stats[card.countKey];
  return typeof v === "number" && !Number.isNaN(v) ? v : null;
}

export function resolveQuickLinkCount(
  link: AdminModerationQuickLink,
  stats: AdminCommandCenterStats
): number | null {
  if (!link.countKey) return null;
  const v = stats[link.countKey];
  return typeof v === "number" && !Number.isNaN(v) ? v : null;
}

/** Toate href-urile trebuie să fie rute admin existente (sau /listings catalog). */
export const ADMIN_COMMAND_CENTER_ROUTES = [
  ...ADMIN_COMMAND_CARDS.map((c) => c.href.split("?")[0]!.split("#")[0]!),
  ...ADMIN_MODERATION_QUICK_LINKS.map((l) => l.href.split("?")[0]!),
  "/admin/dashboard",
  "/admin/messaging",
  "/listings",
] as const;

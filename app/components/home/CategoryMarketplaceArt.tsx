import type { CategoryIconKey } from "@/lib/home-category-meta";

/**
 * Category-specific illustration panels (SVG) — restrained, single accent, no emoji.
 * Used on homepage category cards (right column) and listing photo fallbacks.
 */
export function CategoryMarketplaceArt({
  variant,
  className = "",
  compact = false,
}: {
  variant: CategoryIconKey;
  className?: string;
  compact?: boolean;
}) {
  const h = compact ? 72 : 112;
  const w = compact ? 88 : 120;
  const base = `text-white/[0.14]`;
  const accent = "text-sky-500/35";

  const body = (() => {
    switch (variant) {
      case "auto":
        return (
          <g fill="none" stroke="currentColor" strokeWidth={1.25} className={base}>
            <path
              className={accent}
              d="M18 78c2-18 12-28 28-32h28c16 4 26 14 28 32v8H18v-8z"
              strokeLinejoin="round"
            />
            <path d="M26 86h68M34 62h52c4 0 8 3 9 8M38 54l-6-10M82 54l6-10" strokeLinecap="round" />
            <circle cx={38} cy={86} r={7} fill="currentColor" className="text-white/[0.08]" stroke="none" />
            <circle cx={82} cy={86} r={7} fill="currentColor" className="text-white/[0.08]" stroke="none" />
            <path d="M44 48h32l4 8" className={accent} strokeLinecap="round" />
          </g>
        );
      case "home":
        return (
          <g fill="none" stroke="currentColor" strokeWidth={1.25} className={base}>
            <path className={accent} d="M60 28L22 56v48h76V56L60 28z" strokeLinejoin="round" />
            <path d="M38 104V72h44v32" strokeLinejoin="round" />
            <path d="M52 88h16M52 96h10" strokeLinecap="round" />
            <path d="M60 28v-8M44 40l16-12 16 12" strokeLinecap="round" className={accent} />
          </g>
        );
      case "device":
        return (
          <g fill="none" stroke="currentColor" strokeWidth={1.25} className={base}>
            <rect x={34} y={22} width={52} height={76} rx={6} className={accent} strokeLinejoin="round" />
            <rect x={40} y={30} width={40} height={52} rx={2} opacity={0.35} />
            <path d="M52 100h16" strokeLinecap="round" />
          </g>
        );
      case "fashion":
        return (
          <g fill="none" stroke="currentColor" strokeWidth={1.25} className={base}>
            <path
              className={accent}
              d="M44 26l8 12h16l8-12 10 8-6 70H40l-6-70 10-8z"
              strokeLinejoin="round"
            />
            <path d="M52 38h16" strokeLinecap="round" />
          </g>
        );
      case "sofa":
        return (
          <g fill="none" stroke="currentColor" strokeWidth={1.25} className={base}>
            <path
              d="M22 72c0-8 8-14 18-14h40c10 0 18 6 18 14v20H22V72z"
              strokeLinejoin="round"
              className={accent}
            />
            <path d="M26 92v12h68V92" strokeLinejoin="round" />
            <path d="M30 64c0-10 8-18 30-18s30 8 30 18" strokeLinecap="round" />
          </g>
        );
      case "sport":
        return (
          <g fill="none" stroke="currentColor" strokeWidth={1.25} className={base}>
            <circle cx={60} cy={58} r={28} className={accent} />
            <path d="M60 30v56M32 58h56" strokeLinecap="round" />
            <circle cx={60} cy={58} r={8} fill="currentColor" className="text-white/[0.07]" stroke="none" />
          </g>
        );
      case "child":
        return (
          <g fill="none" stroke="currentColor" strokeWidth={1.25} className={base}>
            <circle cx={60} cy={36} r={12} className={accent} strokeLinejoin="round" />
            <path d="M36 96c4-24 16-36 24-36s20 12 24 36" strokeLinejoin="round" />
            <path d="M48 52l-8 8M72 52l8 8" strokeLinecap="round" />
          </g>
        );
      case "pet":
        return (
          <g fill="none" stroke="currentColor" strokeWidth={1.25} className={base}>
            <ellipse cx={52} cy={40} rx={14} ry={12} className={accent} />
            <ellipse cx={74} cy={44} rx={10} ry={9} className={accent} />
            <path d="M38 52c-6 16-4 40 22 48M70 56c12 8 18 28 8 44" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M44 34l-6-8M62 32l4-10" strokeLinecap="round" />
          </g>
        );
      case "work":
        return (
          <g fill="none" stroke="currentColor" strokeWidth={1.25} className={base}>
            <rect x={28} y={34} width={64} height={48} rx={4} className={accent} strokeLinejoin="round" />
            <path d="M36 34V28c0-4 4-8 8-8h32c4 0 8 4 8 8v6" strokeLinejoin="round" />
            <path d="M44 52h32M44 62h24" strokeLinecap="round" />
          </g>
        );
      case "service":
        return (
          <g fill="none" stroke="currentColor" strokeWidth={1.25} className={base}>
            <circle cx={60} cy={56} r={26} className={accent} />
            <path d="M60 38v36M42 56h36" strokeLinecap="round" />
            <path d="M48 48l24 16M72 48L48 64" strokeLinecap="round" opacity={0.5} />
          </g>
        );
      case "farm":
        return (
          <g fill="none" stroke="currentColor" strokeWidth={1.25} className={base}>
            <path d="M20 88h80" strokeLinecap="round" className={base} />
            <path d="M28 88L44 52l20 36 16-28 12 28" strokeLinejoin="round" className={accent} />
            <circle cx={72} cy={38} r={6} className={accent} />
            <path d="M52 88V72" strokeLinecap="round" />
          </g>
        );
      default:
        return (
          <g fill="none" stroke="currentColor" strokeWidth={1.25} className={base}>
            <rect x={32} y={32} width={56} height={56} rx={6} className={accent} strokeLinejoin="round" />
            <path d="M44 48h32M44 60h24M44 72h16" strokeLinecap="round" />
          </g>
        );
    }
  })();

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 120 112"
      className={`shrink-0 ${className}`}
      aria-hidden
    >
      <rect width="120" height="112" fill="rgba(255,255,255,0.03)" rx="8" />
      <g transform="translate(0 4)">{body}</g>
    </svg>
  );
}

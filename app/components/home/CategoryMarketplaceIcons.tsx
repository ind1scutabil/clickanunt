/** Minimal 20×20 stroke icons — single neutral style, no emoji. */

export function CategoryMarketplaceIcon({ name }: { name: string }) {
  const cls = "h-5 w-5 text-white/45";
  switch (name) {
    case "auto":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M8 17h8M6 17H5a2 2 0 01-2-2V9a2 2 0 012-2h1l1.5-3h7L17 7h1a2 2 0 012 2v6a2 2 0 01-2 2h-1m-8 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
        </svg>
      );
    case "home":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z" />
        </svg>
      );
    case "device":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    case "fashion":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M16 7V3H8v4l-4 5h16l-4-5zM8 12v9h8v-9" />
        </svg>
      );
    case "sofa":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V8a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 01-2 2M5 12v6h14v-6M7 18v2m10-2v2" />
        </svg>
      );
    case "sport":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <circle cx={12} cy={12} r={9} strokeWidth={1.5} />
          <path strokeWidth={1.5} strokeLinecap="round" d="M12 3v4m0 10v4M3 12h4m10 0h4" />
        </svg>
      );
    case "child":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M12 11a2 2 0 100-4 2 2 0 000 4zm-6 9a6 6 0 1112 0H6z" />
        </svg>
      );
    case "pet":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M9 11V9a3 3 0 016 0v2m-9 4h12l-1 5H10l-1-5zm3-4h6" />
        </svg>
      );
    case "work":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M21 13v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5m18-4V8a2 2 0 00-2-2h-3V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2H5a2 2 0 00-2 2v1m18 0H3" />
        </svg>
      );
    case "service":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
        </svg>
      );
    case "farm":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M6 9l6-6 6 6M6 21h12" />
        </svg>
      );
    default:
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" />
        </svg>
      );
  }
}

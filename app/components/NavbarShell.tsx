import { Suspense } from "react";
import NavbarContent from "./NavbarContent";

/** `<header>` e randat pe server — evită mismatch hidratare la HMR pe clasa shell. */
export default function NavbarShell() {
  return (
    <header className="site-header-shell w-full text-zinc-100" role="banner">
      <Suspense
        fallback={
          <div className="mx-auto max-w-7xl px-3 py-2 sm:px-4 md:px-5 md:py-2">
            <div className="h-11 rounded-lg border border-white/[0.06] bg-zinc-900/40 backdrop-blur-sm animate-pulse" aria-hidden />
          </div>
        }
      >
        <NavbarContent />
      </Suspense>
    </header>
  );
}

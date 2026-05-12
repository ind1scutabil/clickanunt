import NavbarContent from "./NavbarContent";

/** `<header>` e randat pe server — evită mismatch hidratare la HMR pe clasa shell. */
export default function NavbarShell() {
  return (
    <header className="site-header-shell w-full text-zinc-100" role="banner">
      <NavbarContent />
    </header>
  );
}

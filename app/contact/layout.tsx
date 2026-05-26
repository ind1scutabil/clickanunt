import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact — ClickAnunț",
  description: "Contactează echipa ClickAnunț pentru întrebări, sugestii sau raportări.",
  alternates: { canonical: "/contact" },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

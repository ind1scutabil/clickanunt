import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Business — pachete și servicii pentru dealeri | ClickAnunț",
  description: "Pachete dedicate dealerilor auto și business-urilor pe ClickAnunț.",
  alternates: { canonical: "/business" },
};

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

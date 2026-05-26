import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Siguranță și protecție — ClickAnunț",
  description: "Sfaturi de siguranță și protecție anti-fraudă pe platforma ClickAnunț.",
  alternates: { canonical: "/security" },
};

export default function SecurityLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

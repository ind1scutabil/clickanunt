import type { ReactNode } from "react";
import { ListingJsonLd } from "./ListingJsonLd";

export default async function ListingDetailLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      <ListingJsonLd listingId={id} />
      {children}
    </>
  );
}

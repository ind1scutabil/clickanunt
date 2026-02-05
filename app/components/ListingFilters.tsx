"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function ListingFilters({ initial = {} as any }) {
  const [q, setQ] = useState(initial.q || "");
  const [make, setMake] = useState(initial.make || "");
  const [minPrice, setMinPrice] = useState(initial.minPrice || "");
  const [maxPrice, setMaxPrice] = useState(initial.maxPrice || "");
  const router = useRouter();

  function apply(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (make) params.set('make', make);
    if (minPrice) params.set('minPrice', minPrice.toString());
    if (maxPrice) params.set('maxPrice', maxPrice.toString());
    router.push(`/listings?${params.toString()}`);
  }

  return (
    <form onSubmit={apply} style={{ marginBottom: 12 }}>
      <input placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)} />
      <input placeholder="Make" value={make} onChange={(e) => setMake(e.target.value)} />
      <input placeholder="Min price" value={minPrice as any} onChange={(e) => setMinPrice(e.target.value)} type="number" />
      <input placeholder="Max price" value={maxPrice as any} onChange={(e) => setMaxPrice(e.target.value)} type="number" />
      <button type="submit">Filter</button>
    </form>
  );
}

"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Lightweight filters. Auto "Make" only when category is Auto (or unset on /auto hubs).
 */
export default function ListingFilters({
  initial = {} as { q?: string; make?: string; minPrice?: string; maxPrice?: string; category?: string },
}) {
  const [q, setQ] = useState(initial.q || "");
  const [make, setMake] = useState(initial.make || "");
  const [minPrice, setMinPrice] = useState(initial.minPrice || "");
  const [maxPrice, setMaxPrice] = useState(initial.maxPrice || "");
  const router = useRouter();

  const isAuto =
    !initial.category ||
    initial.category === "Auto, moto și ambarcațiuni" ||
    /auto/i.test(initial.category);

  function apply(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (isAuto && make) params.set("make", make);
    if (minPrice) params.set("minPrice", minPrice.toString());
    if (maxPrice) params.set("maxPrice", maxPrice.toString());
    if (initial.category) params.set("category", initial.category);
    router.push(`/listings?${params.toString()}`);
  }

  return (
    <form onSubmit={apply} style={{ marginBottom: 12 }}>
      <input placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)} />
      {isAuto ? (
        <input placeholder="Make" value={make} onChange={(e) => setMake(e.target.value)} />
      ) : null}
      <input
        placeholder="Min price"
        value={minPrice as string}
        onChange={(e) => setMinPrice(e.target.value)}
        type="number"
      />
      <input
        placeholder="Max price"
        value={maxPrice as string}
        onChange={(e) => setMaxPrice(e.target.value)}
        type="number"
      />
      <button type="submit">Filter</button>
    </form>
  );
}

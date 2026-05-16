'use client';

import Link from 'next/link';
import React, { useMemo } from 'react';

import { buildListingSpecRows, type ListingSpecSource } from '@/lib/listing-category-specs';

type Props = {
  listing: ListingSpecSource;
  /** Optional SEO hub link for city label */
  cityHref?: string | null;
};

function SpecRow({
  label,
  value,
  cityHref,
}: {
  label: string;
  value: string;
  cityHref?: string | null;
}): React.JSX.Element {
  const isCity = label === 'Oraș' && cityHref;

  return (
    <div className="listing-spec-row">
      <span className="listing-spec-row__label">{label}</span>
      <span className="listing-spec-row__value" data-spec-value>
        {isCity ? (
          <Link href={cityHref} className="listing-spec-row__value-link">
            {value}
          </Link>
        ) : (
          value
        )}
      </span>
    </div>
  );
}

export function ListingTechnicalDetails({ listing, cityHref }: Props): React.JSX.Element | null {
  const rows = useMemo(() => buildListingSpecRows(listing), [listing]);

  if (rows.length === 0) {
    return null;
  }

  return (
    <section
      className="listing-technical-details relative rounded-xl border border-zinc-700/40 bg-zinc-900 p-3.5 shadow-sm md:rounded-2xl md:bg-gradient-to-br md:from-zinc-900/95 md:to-zinc-950/95 md:p-5"
      aria-labelledby="listing-technical-details-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 hidden rounded-xl bg-gradient-to-br from-zinc-800/35 to-transparent md:block md:rounded-2xl"
        aria-hidden
      />
      <div className="listing-technical-details__content relative z-[1]">
        <h2
          id="listing-technical-details-heading"
          className="mb-2 flex items-center gap-2 text-sm font-semibold tracking-tight text-white md:mb-3 md:gap-2.5 md:text-base"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-[#6D5BFF] to-[#4E3CFF] text-xs text-white md:h-9 md:w-9 md:rounded-lg md:text-sm">
            📋
          </span>
          Detalii Tehnice
        </h2>
        <div className="listing-technical-details__grid">
          {rows.map((row, index) => (
            <SpecRow
              key={`${row.label}-${index}`}
              label={row.label}
              value={row.value}
              cityHref={row.label === 'Oraș' ? cityHref : undefined}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

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
    <div className="listing-spec-row flex items-start justify-between gap-3 rounded-md border border-zinc-700/40 bg-zinc-900/55 px-3 py-2.5">
      <span className="listing-spec-row__label shrink-0 text-sm font-medium text-zinc-400">{label}</span>
      <span className="listing-spec-row__value min-w-0 flex-1 text-right text-sm font-semibold leading-snug text-zinc-50">
        {isCity ? (
          <Link
            href={cityHref}
            className="text-zinc-50 underline-offset-4 transition-colors hover:text-cyan-200 hover:underline"
          >
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
    <div className="relative rounded-xl border border-zinc-700/40 bg-gradient-to-br from-zinc-900/95 to-zinc-950/95 p-3.5 shadow-sm backdrop-blur-sm md:rounded-2xl md:p-5">
      <div
        className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-zinc-800/35 to-transparent md:rounded-2xl"
        aria-hidden
      />
      <div className="relative z-[1]">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold tracking-tight text-white md:mb-3 md:gap-2.5 md:text-base">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-[#6D5BFF] to-[#4E3CFF] text-xs text-white md:h-9 md:w-9 md:rounded-lg md:text-sm">
            📋
          </span>
          Detalii Tehnice
        </h2>
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 md:gap-3">
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
    </div>
  );
}

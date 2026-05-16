import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';

import type { ListingSpecRow } from '@/lib/listing-category-specs';

/** Inline paint — Safari/iOS must not rely on Tailwind text utilities for spec values. */
const VALUE_STYLE: CSSProperties = {
  color: '#ffffff',
  WebkitTextFillColor: '#ffffff',
  opacity: 1,
  visibility: 'visible',
  display: 'block',
  margin: 0,
  padding: 0,
  fontSize: '0.875rem',
  fontWeight: 600,
  lineHeight: 1.35,
  wordBreak: 'break-word',
};

const LABEL_STYLE: CSSProperties = {
  color: '#a1a1aa',
  WebkitTextFillColor: '#a1a1aa',
  display: 'block',
  margin: 0,
  fontSize: '0.875rem',
  fontWeight: 500,
  lineHeight: 1.35,
};

type Props = {
  rows: ListingSpecRow[];
  cityHref?: string | null;
  headingId?: string;
  footer?: ReactNode;
};

export function ListingSpecRowsView({
  rows,
  cityHref,
  headingId = 'listing-technical-details-heading',
  footer,
}: Props): React.JSX.Element | null {
  if (rows.length === 0) {
    return null;
  }

  return (
    <section
      className="listing-technical-details rounded-xl border border-zinc-700/40 bg-zinc-900 p-3.5 shadow-sm md:rounded-2xl md:bg-gradient-to-br md:from-zinc-900/95 md:to-zinc-950/95 md:p-5"
      aria-labelledby={headingId}
    >
      <h2
        id={headingId}
        className="mb-2 flex items-center gap-2 text-sm font-semibold tracking-tight text-white md:mb-3 md:gap-2.5 md:text-base"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-[#6D5BFF] to-[#4E3CFF] text-xs text-white md:h-9 md:w-9 md:rounded-lg md:text-sm">
          📋
        </span>
        Detalii Tehnice
      </h2>
      <dl className="listing-technical-details__list m-0 flex flex-col gap-2.5 p-0 md:grid md:grid-cols-2 md:gap-3">
        {rows.map((row, index) => {
          const isCity = row.label === 'Oraș' && cityHref;
          return (
            <div
              key={`${row.label}-${index}`}
              className="listing-spec-entry rounded-md border border-zinc-700/40 bg-zinc-900/55 px-3 py-2.5"
            >
              <dt style={LABEL_STYLE}>{row.label}</dt>
              <dd style={VALUE_STYLE} className="listing-spec-entry__value mt-1">
                {isCity ? (
                  <Link href={cityHref} style={VALUE_STYLE} className="underline-offset-4 hover:underline">
                    {row.value}
                  </Link>
                ) : (
                  row.value
                )}
              </dd>
            </div>
          );
        })}
      </dl>
      {footer}
    </section>
  );
}

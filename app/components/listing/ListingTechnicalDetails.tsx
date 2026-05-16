'use client';

import React, { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

import { ListingSpecRowsView } from '@/app/components/listing/ListingSpecRowsView';
import { buildListingSpecRows, type ListingSpecSource } from '@/lib/listing-category-specs';

type Props = {
  listing: ListingSpecSource;
  cityHref?: string | null;
  /** When SSR mobile block is absent (e.g. in-memory DB), show on all breakpoints. */
  forceVisible?: boolean;
};

/**
 * Client-rendered technical details — desktop (md+) only.
 * Mobile uses ListingTechnicalDetailsServer (SSR) in page.tsx.
 */
export function ListingTechnicalDetails({
  listing,
  cityHref,
  forceVisible = false,
}: Props): React.JSX.Element | null {
  const searchParams = useSearchParams();
  const specDebug = searchParams.get('spec_debug') === '1';
  const rows = useMemo(() => buildListingSpecRows(listing), [listing]);

  if (rows.length === 0) {
    return null;
  }

  const debugFooter = specDebug ? (
    <div className="mt-3 rounded border border-cyan-500/40 bg-cyan-950/40 p-2 text-xs text-cyan-100">
      <p className="mb-2 font-semibold">[spec_debug] CSR desktop — raw fields</p>
      <p>
        county={String(listing.county ?? '')} | city={String(listing.city ?? '')} | make=
        {String(listing.make ?? '')} | model={String(listing.model ?? '')}
      </p>
      <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all text-[10px]">
        {JSON.stringify({ rows, listing }, null, 2)}
      </pre>
    </div>
  ) : null;

  return (
    <div className={forceVisible ? undefined : 'hidden md:block'}>
      <ListingSpecRowsView
        rows={rows}
        cityHref={cityHref}
        headingId="listing-technical-details-heading-desktop"
        footer={debugFooter}
      />
    </div>
  );
}

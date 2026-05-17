"use client";

import {
  LISTING_COUNTRY_OF_ORIGIN_OPTIONS,
  normalizeCountryOfOriginValue,
} from "@/lib/listing-country-options";

type CountryOfOriginSelectProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
  emptyLabel?: string;
};

export default function CountryOfOriginSelect({
  value,
  onChange,
  className,
  id,
  emptyLabel = "Selectează",
}: CountryOfOriginSelectProps) {
  const normalized = normalizeCountryOfOriginValue(value);

  return (
    <select
      id={id}
      value={normalized}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    >
      <option value="">{emptyLabel}</option>
      {LISTING_COUNTRY_OF_ORIGIN_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

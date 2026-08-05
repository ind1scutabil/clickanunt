# Google Jobs audit (JobPosting)

**Status:** JobPosting JSON-LD exists for Jobs category listings when data is sufficient (`ListingJsonLd` + `buildJobBaseSalaryJsonLd`).

**FAZA 21E update (2026-07-29):** `validThrough` and `employmentType` were
previously listed as "when present / optional" but not actually mapped in
`ListingJsonLd.tsx`. Both are now implemented from real, existing data:
- `validThrough` ← `Listing.expiresAt` (real column, set on publish via
  `listingPublishExpiryFields`, +30 days). Verified live against a real job
  listing (dev server, hot reload): emitted correctly when `expiresAt` is set.
- `employmentType` ← `attributes.contract_type` (taxonomy field for "Locuri de
  muncă": Full-time/Part-time/Freelance/Internship/Temporar), mapped via
  `buildJobEmploymentType()` to the schema.org enum
  (FULL_TIME/PART_TIME/CONTRACTOR/INTERN/TEMPORARY). Omitted (never invented)
  when `contract_type` is absent or unrecognized — confirmed via unit tests
  (`tests/unit/listing-offer-jsonld.test.ts`) and live check against a job
  listing with empty attributes (field correctly absent from output).

## Required fields checklist

| Field | Source | Notes |
|-------|--------|-------|
| title | listing.title | required |
| description | listing.description | required, public only |
| datePosted | createdAt | required |
| validThrough | expiresAt | implemented — emitted when `expiresAt` is set |
| hiringOrganization | seller display name / org | must be factual |
| jobLocation | city/county | required for most |
| baseSalary | salaryMin/Max + period + currency | only structured; never from priceAmount placeholder |
| employmentType | attributes.contract_type | implemented — mapped to schema.org enum when present, omitted otherwise |
| apply URL | listing canonical URL | contact on-platform |

## Classification

- **COMPATIBIL** — Jobs category + title/description/location + optional structured salary
- **INCOMPLET** — missing location or organization identity
- **INVALID** — salary invented from commercial priceAmount
- **NEELIGIBIL** — non-Jobs listing (must not emit JobPosting)

## Indexing API

**OUT OF SCOPE** until owner approval. Do not use Google Indexing API for general listing URLs.

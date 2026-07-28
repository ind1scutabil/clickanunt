# Google Jobs audit (JobPosting)

**Status:** JobPosting JSON-LD exists for Jobs category listings when data is sufficient (`ListingJsonLd` + `buildJobBaseSalaryJsonLd`).

## Required fields checklist

| Field | Source | Notes |
|-------|--------|-------|
| title | listing.title | required |
| description | listing.description | required, public only |
| datePosted | createdAt | required |
| validThrough | expiresAt | when present |
| hiringOrganization | seller display name / org | must be factual |
| jobLocation | city/county | required for most |
| baseSalary | salaryMin/Max + period + currency | only structured; never from priceAmount placeholder |
| employmentType | attributes if present | optional |
| apply URL | listing canonical URL | contact on-platform |

## Classification

- **COMPATIBIL** — Jobs category + title/description/location + optional structured salary
- **INCOMPLET** — missing location or organization identity
- **INVALID** — salary invented from commercial priceAmount
- **NEELIGIBIL** — non-Jobs listing (must not emit JobPosting)

## Indexing API

**OUT OF SCOPE** until owner approval. Do not use Google Indexing API for general listing URLs.

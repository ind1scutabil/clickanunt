# Merchant Center — feasibility only (no live feed)

**Status:** `OUT_OF_SCOPE` for connection in FAZA 21.

ClickAnunț is a **classified marketplace** with mostly second-hand / C2C inventory. Official Merchant Center eligibility for marketplace/third-party sellers depends on Google policy, merchant identity, shipping/returns, and product consistency — **we cannot confirm eligibility without an official Google review and a Merchant Center account**.

## Category matrix (preliminary, non-binding)

| Category | Tentative class | Notes |
|----------|-----------------|-------|
| Electronics (new, with brand/GTIN) | REQUIRES POLICY REVIEW | Needs merchant identity, shipping, returns |
| Auto vehicles | NOT ELIGIBLE / REVIEW | Vehicles typically outside standard Shopping |
| Real estate | NOT ELIGIBLE | Not Shopping products |
| Jobs | NOT ELIGIBLE | Use Google Jobs / JobPosting path |
| Free / ON_REQUEST listings | NOT ELIGIBLE | No reliable Offer.price |
| Second-hand C2C | REQUIRES POLICY REVIEW | Seller responsibility + condition |
| Business dealer stock | ELIGIBLE FOR PILOT (maybe) | Only with verified business identity |

## Consistency requirements if ever piloted

Feed ↔ page ↔ JSON-LD must match for price, currency, availability, condition, identity.

**Verdict:** Do not connect Merchant Center or publish a live feed in this phase.

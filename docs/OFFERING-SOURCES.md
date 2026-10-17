# Real offering source snapshots

These records are separate from the frozen synthetic hackathon experiment. `src/lib/offering-seeds.ts` contains ten manually reviewed primary-source records: nine pages reporting an active offering and one closed/funded campaign. Public page content is issuer/platform reported, not a verification of eligibility, financial accuracy or investment merit. Visit the original offering before relying on its terms.

| Company / platform | Source-reported state | Individual minimum | Primary offering page |
|---|---|---:|---|
| Bito / Wefunder | You can still invest | Unknown | [Offering](https://wefunder.com/bito) |
| Riemann Computing / Wefunder | You can still invest | Unknown | [Offering](https://wefunder.com/riecomp) |
| Namecoach / Wefunder | You can still invest | Unknown | [Offering](https://wefunder.com/namecoach) |
| RISE Robotics / Wefunder | Almost Fully Funded | Unknown | [Offering](https://wefunder.com/riserobotics) |
| LPPFusion / Wefunder | You can still invest | Unknown | [Offering](https://wefunder.com/lppfusion) |
| Emission Free Generators / Wefunder | Almost Fully Funded | Unknown | [Offering](https://wefunder.com/emissionfreegenerators) |
| Miso Robotics / Republic | 11 days left; October 29, 2026 deadline | $1,052.16 | [Offering](https://republic.com/miso-robotics) |
| TRADEFUNDED LLC / Republic | 58 days left; December 15, 2026 deadline | $350 | [Offering](https://republic.com/tradefunded) |
| The Gifted / Republic | 74 days left; December 31, 2026 deadline | $100 | [Offering](https://republic.com/xprize) |
| Canopii / Wefunder | Funded — closed | Unknown | [Campaign](https://wefunder.com/canopii) |

Checks occurred October 17, 2026, around 15:38–15:42 UTC; each record retains a timestamp, original URLs and a status excerpt. Web retrieval may serve cached content; a check timestamp is not a guarantee that the origin was freshly fetched. Wefunder direct server retrieval returned HTTP 403. Republic public detail pages returned HTTP 200. No login, payment, reservation or investment was attempted.

The Gifted's issuer is OPTIMISTIC PRODUCTIONS LLC; its page did not provide a separate issuer website, so `website` is empty. Its instrument is a revenue participation agreement; it is not represented as startup equity. Mintworks was excluded because the page reports reservations before the offering starts; its $100 reservation is not used as an investment minimum. Canopii's current detail page says funded even though an older search excerpt still advertised a raise.

## Unknowns remain unknown

Funding stage is `Unknown` for every seed; security type or valuation does not establish a seed/Series A stage. All annual revenue, ARR and financial as-of fields are null. Bito and Namecoach display ARR claims without a clear reporting date; RISE displays cumulative revenue rather than a dated annual period. Those figures were not converted into dated financial metrics. Perk thresholds, price per share, total target raise and investor comments are not individual minimum checks.

Strict budget filters therefore exclude unknown minima instead of pretending those deals fit. A user can still inspect their source pages and request a separate evidence-backed dossier.

## Automated refresh boundaries

[Republic's terms](https://republic.com/terms) require prior consent for scraping. [Wefunder's terms](https://wefunder.com/terms), section 6, prohibit automated bots/spiders/scrapers. Robots rules are a separate condition and do not establish authorization. We stopped further extraction after identifying these restrictions. The capability helper validates a narrow allowlist and source provenance, then marks the attempted platform refresh unverified while retaining the old terms. It makes no network request and does not claim a live sync. It is not presented as the app's working import flow.

Actual company-URL research/import is independent. An approved platform API/feed could replace this guarded capability later. No undocumented endpoints, login/session reuse, proxy bypass or challenge circumvention are used.

## SEC import investigation

The SEC expressly publishes [Crowdfunding Offerings Data Sets](https://www.sec.gov/data-research/sec-markets-data/crowdfunding-offerings-data-sets), including 2026 Q3, for analysis. Its [data dictionary](https://www.sec.gov/dera/data/crowdfund.pdf) describes tab-delimited submission, issuer and disclosure tables. [EDGAR access guidance](https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data) documents declared user agents, efficient requests and fair access.

A bounded viability check used an identifiable FirstCheque project-URL user agent and fewer than two requests per second. The official current Form C Atom endpoint, dataset page/download and submissions API returned HTTP 403 from this environment. We did not bypass the block or claim a successful SEC import. A recent Form C or future filed deadline would be labeled filed/unverified until a current offering source confirms it; it would not establish a live raise, individual minimum, eligibility or company financial reporting period.

The source snapshot and capability remain useful without representing a blocked regulator feed as working. Website imports, sourced diligence and saved dossiers supply the operational workflow.

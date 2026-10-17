# Catalog coverage and collection

Checked October 17, 2026. The shipped catalog combines 80 venture research profiles, 34 profile-ready Money Talks handoff entries, and the 10 existing dated offering snapshots. It does not mix in the synthetic experiment catalog.

| Disclosed stage | AI & software | Cybersecurity | Fintech | Healthcare | Climate & energy | Total |
|---|---:|---:|---:|---:|---:|---:|
| Series A | 4 | 4 | 4 | 4 | 4 | 20 |
| Series B | 4 | 4 | 4 | 4 | 4 | 20 |
| Series C | 4 | 4 | 4 | 4 | 4 | 20 |
| Series D | 4 | 4 | 4 | 4 | 4 | 20 |
| Total | 16 | 16 | 16 | 16 | 16 | 80 |

These are five active venture sectors selected for breadth, not a claim of an objectively ranked global “top five.” The selection considered [NVCA's 2026 Yearbook](https://nvca.org/2026-nvca-yearbook/), [KPMG Venture Pulse](https://kpmg.com/xx/en/what-we-do/industries/private-enterprise/venture-pulse.html), [Momentum Cyber's Q1 2026 market review](https://momentumcyber.com/wp-content/uploads/2026/04/Momentum-Cyber-Cybersecurity-Market-Review-Q1-2026-1.pdf), and [Dealroom's climate dataset](https://dealroom.co/guides/climate). Each company has one primary industry for coverage counts, with additional product tags. Energy includes nuclear, storage, grid technology and power electronics; it is not a certification that every company or technology has a positive climate impact.

## Sources and meaning

- `src/data/venture-companies.json`: 80 curated profiles. Description, capabilities, audience, founder attribution, dated funding and source URLs are available to basic search. 58 profiles have at least one sourced founder; 16 have explicit headquarters and 20 have explicit founding years. No headquarters is inferred from a press-release dateline or investor location.
- `src/data/event-handoff.json`: the supplied handoff's 34 `profile_ready` entries, preserving its IDs, descriptions, founder-role limits, business-model notes, sources and review notes. Their funding stages, ARR, revenue, minimum investments and offering URLs remain unknown.
- `src/data/catalog-review.json`: 41 review/history company records and 13 person-only founder leads. They are retained for review, not published as discovery cards or invented companies. The supplied file's “checked” date is attributed to the handoff; it is not represented as an independent verification of every link.
- `docs/catalog-collection.json`: 303 page requests, 271 successful readable-page collections and 32 unavailable attempts. This receipt includes investigated candidates and failed earlier URLs, not just the final 80. Raw page text stays in ignored `work/catalog-pages/` or `work/catalog-enriched.json`, outside the public app and source export. Page collection confirms retrieval, not the truth of marketing claims.
- `npm run catalog:collect`: repeatable, model-free collection of published source URLs, using the same public-address, robots, timeout and size checks as live research. The new receipt is written to `work/catalog-refresh.json`. Refreshing never automatically overwrites curated facts.

The funding stage is the disclosed round located during this check, with its date and source. It does not guarantee the latest capitalization, a currently open raise, an accessible offering, valuation suitability or investment eligibility. Base Power's Series D label comes from its investor's company profile; the round amount/date are deliberately unknown. Pentera and Group14 have dated 2025 financing releases. Temporal was removed from the Series D cohort when its September 2026 Series E was found.

Debt is separate from equity (GMI Cloud, Censys and Antares). Omni's funding transaction includes a tender offer; Juspay's follow-on mixes primary and secondary investments. Utilidata's extension is distinguished from its full Series C. Lunar's prior Series C is separate from its Series D. Lower-bound amounts and date conflicts are retained in notes rather than turned into exact figures.

Only Pentera has a retained positive ARR amount: **more than $100 million**, company-reported January 6, 2026, stored with a lower-bound qualifier and a financial source URL. No new profile has an invented annual revenue figure. Fireworks' annualized revenue run rate, GMI's contracted ARR, revenue growth rates and customer counts remain separately labeled company-reported traction. They do not pass annual-revenue or ARR filters. Socket's conflicting founding years (2020 in the release, 2021 on its about page) leave the structured year unknown.

Source methods distinguish public-page collection, primary-source review, supplied handoff evidence and failed collection attempts. A readable navigation shell does not count as funding evidence: Censys' release facts were checked through its indexed primary release. Failed requests are not presented as scraped evidence.

## Product boundary

Discover, founder/product text search, stage/industry/collection controls, sorting and saved search filtering operate on the stored catalog with no model call or live scrape. Company overview displays those stored facts. Only the explicit deep-research path starts the existing live web investigation, Nicrron inference and PRISM tracing. These seed profiles have `researchStatus: not-started`; collection never manufactures a completed diligence report.

New research matches seeded companies by canonical website, preserves the profile's source facts and avoids duplicate cards. Personal searches and investment preferences remain in the user's browser; shared reports remain neutral company research. An announcement of completed financing never becomes an open investment offering.

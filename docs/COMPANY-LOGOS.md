# Company identity assets

Checked October 17, 2026. The seeded catalog retains 120 real company assets across 124 companies. `src/data/company-logos.json` records the original source, collection date, SHA-256, rendering background and retrieval method. PNGs are stored locally under `public/company-logos/` (96px, maximum 28KB). These identify companies; they do not verify investment eligibility.

The automated collector reads published website icons, explicitly named brand images and logo SVGs. It also accepts embedded image assets from those identity locations. If the website is unavailable, a domain favicon cache is attempted and labeled as cached in the profile. Cached icons can be stale. The contact-sheet review replaced Gray Swan's cached icon with its current official wordmark and excluded generic Lovable/Wix icons. Known generic icon hashes and provider defaults are rejected in the live collector too.

Public pages, redirects and assets use the same DNS pinning, public-address checks, robots policy and bounded download rules as web research. SVGs with active or external content are rejected and rasterized before presentation. Browser export was used for published assets whose CDN would not allow automated collection (Voltus, CommercialDeals, Gray Swan and Nugenix); MatrixOrigin's official linked GitHub organization supplied its avatar. ConnNext's public product site supplied the embedded icon, corroborated against the founder's product identity.

Four seeds remain explicitly unavailable: localhost:nyc, Mooss / Modascope, WealthRyse and The Gifted. The first three publish text branding without a verified company image in the retained sources; The Gifted has no supplied official website. They use a neutral building symbol, with no generated initials or fabricated logo.

## Live research

`collectCompanyLogo` runs inside the public-web diligence flow and is recorded as a PRISM retrieval span. Normalized image bytes, source URL, date, hash and method persist with the company and report. They appear in Discover, search results, Watchlist, company details and the report identity header. Refresh failures preserve the prior fetched asset. Name-only research can resolve an observed company website only when both the fetched domain brand and page title match; ambiguous identity remains unresolved.

Run `npm run catalog:logos` to retry missing seeded assets. Fetched assets are retained until deliberately refreshed. This command does not invent missing branding or synthesize company logos.

# Seed Street

**Evidence before conviction.** Discover source-listed private offerings, research a real company website, and retain an inspectable diligence workspace. Built for Money Talks 2, Money Intelligence track.

The main **Discover → Agent workspace** flow uses real company sources. A separate **Fictional demo** preserves the original synthetic companies, paper portfolio and measured hackathon experiment. The two data sets are not mixed.

## Real-company workflow

1. Browse the full sourced catalog as compact company tiles: official website icon or initials, name, short business description and starting check. Tiles are reused in search results, Watchlist, and Portfolio.
2. Click a tile to open the company profile: business description, offering terms, financial unknowns, sources and existing research. Browsing from Discover or Watchlist does not create a search.
3. Describe your budget, interests and requirements; review the filters and start a search. Each search keeps its own criteria, strictly filtered results and conversation.
4. Open company profiles and research inside that search, or add a company website. Refine the same search as you learn; New search starts with fresh criteria. Source passages, dates and unanswered questions remain inspectable.

The catalog includes **124 entries**: 80 sourced venture companies (20 each at Series A–D, four per stage in AI/software, cybersecurity, fintech, healthcare and climate/energy), 34 profile-ready Money Talks founder companies, and ten manually checked offering snapshots. Discover filters by stage, industry and collection and searches stored founder/product/audience facts. Deep research remains an explicit live investigation. The handoff’s 41 review/history company records and 13 founder-only leads are kept separate. See [catalog coverage, collection and field provenance](docs/CATALOG.md).

The ten offering snapshots include nine pages reporting active offerings and one closed campaign. These are **not a live platform feed**. Status timestamps, original URLs and unknown terms are visible. Unknown individual minimums do not pass a strict budget check. Researching a company does not establish that it currently offers securities. See [offering provenance](docs/OFFERING-SOURCES.md).

Public-web research searches company, founder, competitor, market, financial and disclosure topics, then uses actually fetched pages rather than search snippets as evidence. Nicrron synthesizes a report when available. Reports distinguish `live-web`, `sources-only` and `unavailable`, and expose incomplete coverage. Blocked pages, robots restrictions, platform restrictions and search rate limits remain visible; no substitute fictional memo is inserted into this flow.

Financial values require an attributable passage, the correct financial definition, currency and reporting basis. Annual revenue, ARR and payment volume remain separate. Source publication and retrieval dates are distinct from the financial as-of period. Missing or ambiguous evidence stays unknown; no currency conversion, annualization or revenue estimate fills the gap. A citation is a source reference, not an audit.

## Storage

The configured deployment uses **private Vercel Blob** for server-side company cards and saved dossiers. The research library is shared within this prototype; private Blob access does not mean a separate private account for each visitor. Saved shared reports remove personalized thesis-fit text. Search threads, criteria, conversations, watchlists and paper allocations remain in the current browser. They are separate from the shared company research library. Switching or reloading a search restores its own state; opening a company report does not create a new thread.

Without Blob configuration, local development saves to ignored `work/company-library/`. A deployment without persistent storage reports that limitation instead of claiming a successful save.

## Run locally

Requires Node.js 20.9 or newer.

```bash
npm ci
test -e .env.local || cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Keep all credentials server-side in `.env.local`; never use `NEXT_PUBLIC_` for secrets or overwrite an existing environment.

- `NICRRON_API_KEY`: live synthesis through `https://api.nicrron.ai/v1`. The web flow uses `NICRRON_WEB_MODEL` (default `openai/gpt-4.1-mini`); the preserved synthetic flow uses `nicrron/auto`.
- `TAVILY_API_KEY`: provisioned web discovery; `EXA_API_KEY` is an alternative. Without these, Tavily keyless search is attempted with rate limits and no availability guarantee.
- `BLOB_READ_WRITE_TOKEN`: persistent private Blob storage; the configured Vercel store can also use its supported OIDC environment.
- `PRISMTRACE_API_KEY`, `PRISMTRACE_PROJECT_ID`, `PRISMTRACE_HOST`, `PRISM_AGENT_ID`: tracing. Real web diligence uses a distinct `firstcheque-web-analyst` agent identity.

Without model credentials, the real-company flow can retain fetched sources without claiming AI synthesis. The separate fictional demo has an explicitly labeled deterministic replay.

## Deployment evidence

[Current protected workspace](https://firstcheque-9z02q1q5e-divyesh-thirukondas-projects.vercel.app) is READY from source `6ce020334424f33874834722f5e47ca7eeeb96fe`. The deployed catalog contains 124 entries, with 80 sourced venture profiles and 34 Money Talks founder companies. Ordinary discovery searches stored facts; the separate Deep research action uses the existing live Nicrron/PRISM route. The 67 offline tests, TypeScript and production build pass. Desktop and 400px mobile catalog flows were checked, and the hosted API and combined filters were verified. See the [catalog receipt](docs/catalog-verification.json) and [coverage and source methodology](docs/CATALOG.md). Earlier [exploration](docs/exploration-verification.json), [clarity](docs/clarity-verification.json), [tile/profile](docs/company-tiles-verification.json), [search-thread](docs/search-thread-verification.json) and [readability](docs/readability-verification.json) receipts remain unchanged. [Logo sources](docs/COMPANY-LOGOS.md).

The earlier [hosted research receipt](docs/live-workflow-verification.json) records actual web discovery, Nicrron synthesis, PRISM recording and private Blob readback from source `b6506bae588a4def4427e33e664f067d1836c6ef`. That run had partial coverage, seven readable pages and unknown financials; one bounded JSON correction made two actual model calls. No new product model calls were needed for this catalog update. Temporary access is supplied separately; access tokens are excluded from Git and source archives.

The [earlier deployment receipt](docs/evidence/deployment.json) remains the record of the original fictional-demo build, with its original source revision.

## Preserved experiment

The fictional Research Lab separates a genuine matched Nicrron experiment from an illustrative ARR regression replay. On 50 identical saved inputs, contract-valid live memos increased from **48/50 to 50/50**. V2 used 51 provider calls, including one retained invalid response and successful bounded correction, with no replay fallbacks. The router can choose different underlying models. PRISM's external judge failed calibration, so no judge-score or factual-grounding improvement is claimed.

The original inputs, outputs, source commits and caveats remain in [recorded evidence](docs/evidence/README.md). The experiment is not a benchmark of the new real-company research flow. See [hackathon evidence](docs/HACKATHON.md) and [demo script](docs/DEMO.md).

```bash
npm run typecheck
npm test
npm run build
```

Next.js, React, TypeScript, Tailwind, Vercel AI SDK, Nicrron, PRISM and private Vercel Blob. No money moves in Seed Street. Real offering terms and eligibility must be checked at the original intermediary; paper allocations exist only in the fictional demo.

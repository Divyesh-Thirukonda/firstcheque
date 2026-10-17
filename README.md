# Seed Street

**Evidence before conviction.** Discover source-listed private offerings, research a real company website, and retain an inspectable diligence workspace. Built for Money Talks 2, Money Intelligence track.

The main **Discover → Agent workspace** flow uses real company sources. A separate **Fictional demo** preserves the original synthetic companies, paper portfolio and measured hackathon experiment. The two data sets are not mixed.

## Real-company workflow

1. Browse the full sourced catalog as compact company tiles: official website icon or initials, name, short business description and starting check. Tiles are reused in search results, Watchlist, and Portfolio.
2. Click a tile to open the company profile: business description, offering terms, financial unknowns, sources and existing research. Browsing from Discover or Watchlist does not create a search.
3. Describe your budget, interests and requirements; review the filters and start a search. Each search keeps its own criteria, strictly filtered results and conversation.
4. Open company profiles and research inside that search, or add a company website. Refine the same search as you learn; New search starts with fresh criteria. Source passages, dates and unanswered questions remain inspectable.

The catalog includes **165 seeded entries**: 80 sourced venture companies (20 each at Series A–D, four per stage in AI/software, cybersecurity, fintech, healthcare and climate/energy), 75 Money Talks companies/projects, and ten manually checked offering snapshots. Discover filters by stage, industry and collection and searches stored founder/product/audience facts. Deep research remains an explicit live investigation. All 75 named handoff records are visible with their original readiness/history labels. The 13 founder-only leads have a separate Founder leads collection. Discover opens on the Money Talks collection; All companies is one click away. See [catalog coverage, collection and field provenance](docs/CATALOG.md).

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

[Current protected workspace](https://firstcheque-gul6nouq0-divyesh-thirukondas-projects.vercel.app) is READY from source `9b09e507f100d6b5d69065a7c2dabad21db2affa`. The product is now **Seed Street**, with a compact street-sign mark, updated favicon and matching agent labels. All 67 offline tests, TypeScript and the production build pass; hosted branding and the 124-entry catalog were verified. See the [brand receipt](docs/brand-verification.json), [brand assets](docs/BRAND.md), [catalog receipt](docs/catalog-verification.json) and [catalog coverage](docs/CATALOG.md). Earlier receipts preserve their original revisions.

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

## Company profile parity

Seeded and live-researched companies share sourced logos, product capabilities, audience, founders, headquarters/founding year when disclosed, completed financing, reported traction, and four financial fields: annual revenue, ARR, valuation and runway. Missing values stay null. Financial evidence retains its quote, source, currency, period and qualifiers; a refresh does not replace a dated disclosure with an older or missing value. Basic filters continue to use synchronized revenue/ARR fields.

The catalog includes 124 sourced logos across 165 seeds, 15 disclosed valuation snapshots and one disclosed ARR lower bound. Entries without a confirmed company logo use a neutral symbol; see `docs/COMPANY-LOGOS.md`. Live research uses the same collection path and preserves its assets in the company library. Actual Nicrron Resend research and PRISM readback verified the new profile flow; the run retained the company icon, founders, product and its dated $18M Series A. Revenue, ARR, valuation and runway remained unknown where qualifying disclosure was absent.

## Money Talks commercial evidence

The complete 75-record founder/company handoff is published in Discover with stable IDs, source links and original review/history statuses. Collection chips surface Money Talks companies and 13 person-only founder leads. Discover opens on Money Talks; event companies appear first in all-company browsing and break ties after preference fit in searches; explicit filters still apply. Historical relationships do not imply current involvement or a closed company.

Company profiles show public pilot/customer/pricing evidence and tailored questions for the event-linked founder. A planning assumption of pre-revenue is labeled separately and never becomes a zero-dollar financial observation or satisfies a sourced-revenue filter. `src/data/event-commercial.json` retains 39 exact source excerpts across 11 companies from a 56-page collection attempt (42 readable). Public plans, pilot-program scope, downstream usage and client cases do not imply paying-customer counts, realized revenue or client concentration. Deep research uses the same commercial-field validation and PRISM trace path.

## Investor proposal workspace

Open a company → **Draft proposal** to edit a cheque proposal, generate an ElevenLabs voice preview, extract grounded discussion terms from notes with Nicrron, and prepare an unsigned draft for legal review. The **Proposals** tab resumes local drafts. No founder is called, no contract is executed, and no funds move. See [the investor flow and legal boundaries](docs/INVESTOR-PROPOSALS.md).

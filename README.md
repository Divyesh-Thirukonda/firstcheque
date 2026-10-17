# FirstCheque

**Evidence before conviction.** Discover source-listed private offerings, research a real company website, and retain an inspectable diligence workspace. Built for Money Talks 2, Money Intelligence track.

The main **Discover → Agent workspace** flow uses real company sources. A separate **Fictional demo** preserves the original synthetic companies, paper portfolio and measured hackathon experiment. The two data sets are not mixed.

## Real-company workflow

1. Describe your budget, interests, risk preference and research constraints; review the editable filters.
2. Inspect a source-checked offering snapshot, or paste a public company website into the agent workspace.
3. Follow the search, source retrieval, synthesis and validation steps. Inspect the retained passages, source dates, financial fields and remaining questions.
4. Reopen the saved company dossier from the shared research library.

The catalog starts with ten manually checked primary-source snapshots: nine pages reporting active offerings and one closed campaign. These are **not a live platform feed**. Status timestamps, original URLs and unknown terms are visible. Unknown individual minimums do not pass a strict budget check. Researching a company does not establish that it currently offers securities. See [offering provenance](docs/OFFERING-SOURCES.md).

Public-web research searches company, founder, competitor, market, financial and disclosure topics, then uses actually fetched pages rather than search snippets as evidence. Nicrron synthesizes a report when available. Reports distinguish `live-web`, `sources-only` and `unavailable`, and expose incomplete coverage. Blocked pages, robots restrictions, platform restrictions and search rate limits remain visible; no substitute fictional memo is inserted into this flow.

Financial values require an attributable passage, the correct financial definition, currency and reporting basis. Annual revenue, ARR and payment volume remain separate. Source publication and retrieval dates are distinct from the financial as-of period. Missing or ambiguous evidence stays unknown; no currency conversion, annualization or revenue estimate fills the gap. A citation is a source reference, not an audit.

## Storage

The configured deployment uses **private Vercel Blob** for server-side company cards and saved dossiers. The research library is shared within this prototype; private Blob access does not mean a separate private account for each visitor. Saved shared reports remove personalized thesis-fit text. Watchlists, paper allocations and editable preferences remain browser state.

Without Blob configuration, local development saves to ignored `work/company-library/`. A deployment without persistent storage reports that limitation instead of claiming a successful save.

## Run locally

Requires Node.js 20.9 or newer.

```bash
npm ci
test -e .env.local || cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Keep all credentials server-side in `.env.local`; never use `NEXT_PUBLIC_` for secrets or overwrite an existing environment.

- `NICRRON_API_KEY`: live synthesis through `https://api.nicrron.ai/v1`, model `nicrron/auto`.
- `TAVILY_API_KEY`: provisioned web discovery; `EXA_API_KEY` is an alternative. Without these, Tavily keyless search is attempted with rate limits and no availability guarantee.
- `BLOB_READ_WRITE_TOKEN`: persistent private Blob storage; the configured Vercel store can also use its supported OIDC environment.
- `PRISMTRACE_API_KEY`, `PRISMTRACE_PROJECT_ID`, `PRISMTRACE_HOST`, `PRISM_AGENT_ID`: tracing. Real web diligence uses a distinct `firstcheque-web-analyst` agent identity.

Without model credentials, the real-company flow can retain fetched sources without claiming AI synthesis. The separate fictional demo has an explicitly labeled deterministic replay.

## Deployment evidence

[Previously verified protected demo](https://firstcheque-279dg3a87-divyesh-thirukondas-projects.vercel.app). Its recorded source is `fa9bb482f6d236119cd3c0bc2923ff24fe5101d8`; [the receipt](docs/evidence/deployment.json) covers that earlier fictional-demo build, not an end-to-end verification of the newer real-company workflow. Temporary judge access is supplied separately; no access token belongs in git.

## Preserved experiment

The fictional Research Lab separates a genuine matched Nicrron experiment from an illustrative ARR regression replay. On 50 identical saved inputs, contract-valid live memos increased from **48/50 to 50/50**. V2 used 51 provider calls, including one retained invalid response and successful bounded correction, with no replay fallbacks. The router can choose different underlying models. PRISM's external judge failed calibration, so no judge-score or factual-grounding improvement is claimed.

The original inputs, outputs, source commits and caveats remain in [recorded evidence](docs/evidence/README.md). The experiment is not a benchmark of the new real-company research flow. See [hackathon evidence](docs/HACKATHON.md) and [demo script](docs/DEMO.md).

```bash
npm run typecheck
npm test
npm run build
```

Next.js, React, TypeScript, Tailwind, Vercel AI SDK, Nicrron, PRISM and private Vercel Blob. No money moves in FirstCheque. Real offering terms and eligibility must be checked at the original intermediary; paper allocations exist only in the fictional demo.

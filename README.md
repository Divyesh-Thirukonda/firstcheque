# FirstCheque

**Evidence before conviction.** A private-market research workspace that brings a consumer investing experience to startup discovery. Built for Money Talks 2, Money Intelligence track.

Define your investment thesis, compare fictional pre-seed through Series A companies and local businesses, inspect evidence-backed analyst memos, and build a paper portfolio with budget and concentration checks. A research lab exposes how an analyst can confuse a financial metric and how claim-level grounding catches the mistake.

## Hosted demo

[Open the protected demo](https://firstcheque-279dg3a87-divyesh-thirukondas-projects.vercel.app). Guest judges can use the temporary access link supplied separately in the handoff; it expires October 18, 2026 at 10:10 a.m. Eastern. No access token is stored in this repository.

Deployment source: `fa9bb482f6d236119cd3c0bc2923ff24fe5101d8`. The final cloud check returned a live Nicrron memo with all local grounding checks passing. See `docs/evidence/deployment.json` for the receipt and the separate operational note for the post-benchmark validator fix.

## Run locally

Requires Node.js 20.9 or newer. Dependencies are pinned in `package-lock.json`.

```bash
npm ci
test -e .env.local || cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Without Nicrron credentials, research is explicitly labelled **replay** and the UI remains usable. For live inference, add `NICRRON_API_KEY` from https://nicrron.ai/dashboard/keys. The configured model is `nicrron/auto` through `https://api.nicrron.ai/v1`.

PRISM uses server-only `PRISMTRACE_API_KEY`, `PRISMTRACE_PROJECT_ID`, `PRISMTRACE_HOST`, and a stable `PRISM_AGENT_ID`. Never put keys in `NEXT_PUBLIC_` variables. The existing local environment has PRISM configured; do not overwrite it.

## What works

- Industry, stage, horizon, risk and concentration preferences with a transparent match score.
- Search, filtering, watchlist and local persistence.
- Company research with citations, explicit risk factors and follow-up diligence questions.
- Nicrron inference using the Vercel AI SDK; honest fallback when live inference is unavailable.
- PRISM model and retrieval-step HTTP instrumentation, awaited at request completion.
- Source-grounding regression evaluator with visible v1/v2 outputs on identical evidence.
- Paper portfolio allocation checks; no live investment execution.

## Validate

```bash
npm run typecheck
npm test
npm run build
```

See [docs/HACKATHON.md](docs/HACKATHON.md) for the track requirements and completed proof ledger, and [docs/DEMO.md](docs/DEMO.md) for the three-minute presentation and submission copy. The frozen inputs, source catalog, per-case results, and integration caveats are saved in `docs/evidence/`.

The Research Lab separates a real matched experiment from an illustrative ARR regression replay. JSON-contract validity, source checks, delivery mode, and external judge scores are distinct measurements. Inspect the evidence notes before quoting a score.

On 50 identical inputs, contract-valid live memos increased from **48/50 to 50/50**. V2 used 51 provider calls, including one retained invalid response and its successful bounded correction; it used no replay fallbacks. The routing slug stayed `nicrron/auto`, whose underlying model can vary. PRISM's external judge failed calibration, so its scores do not establish a factual-grounding improvement.

## Stack and boundaries

Next.js App Router, React, TypeScript, Tailwind, Lucide icons, Vercel AI SDK, Nicrron model gateway, PRISM HTTP tracing. Company information, fundraising progress and evidence are synthetic demonstration data. Match scores describe preference alignment, not predicted returns or investment eligibility. Watchlists and paper allocations are stored in the browser; there is no brokerage, custody or execution integration.

A future investment product would connect an appropriate regulated intermediary and verify offering-specific eligibility. The demo does not imply that every user can invest in every private offering.

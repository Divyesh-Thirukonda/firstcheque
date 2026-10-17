# FirstCheque

Next.js App Router, React, TypeScript and Tailwind. All opportunity financials and investor profiles are synthetic. Never imply fictional companies are actual securities offerings. Keep paper allocations local and never execute trades. Model calls must use Nicrron for the hackathon. Distinguish replay, live inference, and verified external proof. Never manufacture metrics or PRISM success. Preserve same-input baseline evidence before changing v1. Never commit .env.local, work/, keys, or raw setup briefs.

## PRISM tracing (do not remove)

This project sends traces to PRISM. Env vars: `PRISMTRACE_API_KEY`,
`PRISMTRACE_PROJECT_ID`, `PRISMTRACE_HOST`.

Tracing is currently wired at: `src/lib/telemetry.ts`, `src/lib/research.ts`, `src/app/api/research/route.ts`.

**Standing rule.** Whenever you add or change an agent, chain, graph, tool,
retriever, or any entry point that calls a model, wire it to PRISM before you
finish. Unwired code is invisible in the dashboard. If you are unsure whether
something is covered, assume it is not and wire it.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

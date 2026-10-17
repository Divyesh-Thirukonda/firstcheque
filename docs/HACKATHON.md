# FirstCheque — Money Talks 2 build and evidence plan

**Track: Money Intelligence.** FirstCheque turns a person's investment thesis into an understandable private-company shortlist, an evidence-linked research memo, and a paper portfolio. The pitch is **“Your first cheque starts with better questions.”**

The product makes early-stage research approachable: a familiar investing interface, explanations of why a company fits, visible uncertainties, source documents beside claims, and an allocation sandbox. The strongest demonstration is an attractive opportunity the system *does not* overstate when the evidence is incomplete.

## What the prototype represents

Company names, financials, documents, rounds, valuations, and portfolio balances in this prototype are synthetic demonstration data. A live model can analyze those documents; a model call does not turn the underlying demonstration data into verified facts about a real business. Paper allocations do not purchase securities or move money.

The future product could connect eligible offerings to a registered intermediary. Reg CF offerings require an SEC/FINRA registered funding portal or broker-dealer and non-accredited investor limits apply. Publicly solicited Rule 506(c) offerings require verified accredited purchasers. Funding stage alone does not determine who may invest. See [SEC Reg CF guidance](https://www.sec.gov/resources-small-businesses/small-business-compliance-guides/regulation-crowdfunding-guidance-issuers) and [SEC Rule 506(c) guidance](https://www.sec.gov/resources-small-businesses/exempt-offerings/general-solicitation-rule-506c).

## Required proof and acceptance criteria

The builder resource pack is the authority for event requirements. The following checklist reflects the observed Money Intelligence requirements; numeric judging weights and the final submission deadline are not yet confirmed here. Do not present these planning priorities as an official weighted rubric.

| Requirement | Concrete evidence to show | Completion rule |
|---|---|---|
| PRISM integration | Real research request, matching trace and trajectory | Application-generated output is visible in PRISM; a handshake alone is insufficient |
| Nicrron or Ninoo use | Research response generated through the sponsor model API | Record actual provider/model, latency, token usage when returned, and trace ID |
| Knowledge Base | Company research documents uploaded, assigned to the agent, then retrieved | Show the assigned documents and a run retrieving a relevant excerpt |
| Baseline before fixes | At least 50 real baseline research runs | Preserve original inputs, outputs, timestamps, version and trace IDs before improving the agent |
| Root Cause | Cluster of at least three failed baseline runs | Show recurring failure, affected examples, and explanation tied to prompt/retrieval/validation |
| Custom evaluator | A source-grounding rubric run on v1 and v2 | Replay exactly the same saved inputs and compare results from the same evaluator |
| Improvement | Code or prompt change motivated by observed failures | Before/after claims match completed evaluation results |
| Working product | Thesis → shortlist → research → paper allocation | Judge completes the flow without terminal intervention |

## Suggested experiment

Start with a straightforward research prompt as v1. Save at least 50 genuine research outputs before changing it. Vary the thesis across industries, stage preferences, risk tolerance and evidence gaps. Include queries for growth rates, valuation, customer concentration, runway, and questions the documents cannot answer. Synthetic company data must remain clearly marked.

Use PRISM to identify repeated failures before deciding the fix. A plausible theme to investigate is unsupported numerical claims, but the actual Root Cause result must determine what is claimed in the demo. Do not invent failure clusters, timestamps, model calls, citations, evaluator scores, or results.

For v2, make the smallest change justified by the findings: retrieve the relevant document, require source references for factual claims, distinguish calculation from quoted facts, return “not disclosed” for missing figures, and validate the output schema. Preserve the saved v1 inputs and replay those exact inputs through v2. Keep model/routing settings fixed where possible; record any change.

Suggested run budget: 50 baseline + 50 matched v2 runs, then only targeted edge cases and rehearsals. The resource pack's 200 analyzed runs/day ceiling should be checked against the workspace's current allowance before large batches. A stored trace and a completed AI analysis are different states.

### Custom evaluator: Evidence before confidence

Use the same rubric for both versions:

> Judge whether the answer is grounded in the retrieved evidence. Every company-specific numerical claim must have an identifiable supporting passage or explicitly labeled calculation using supported inputs. Facts from the user's thesis are preferences, not company evidence. Missing information must be acknowledged. Do not reward polished prose that invents traction, valuation, growth, runway, expected return, or investment eligibility. Assess risk discussion separately from evidence quality. Return a score and a concise reason identifying unsupported claims.

PRISM's evaluator placeholders can supply input, output and retrieved context. The backend must include retrieval/tool spans containing the actual retrieved text, so the judge can inspect evidence. Follow the [official PRISM integration contract](https://blockconvey.com/docs); TypeScript uses HTTP ingest and does not require a PRISM npm package.

## Judge-facing priorities — inferred, not official weights

1. **Reliability demonstrated:** make the observed failure and measured improvement the central technical story.
2. **Useful financial decision support:** show thesis fit, downside, information gaps and concentration in one flow.
3. **Sponsor integration with a purpose:** Nicrron produces the memo; PRISM makes its weaknesses inspectable and the fix measurable.
4. **Product quality:** a fast, calm investing workspace with a clear distinction between research confidence and investment risk.
5. **Feasible path:** discovery and research now; real transactions through an appropriate regulated partner later.

## Evidence ledger

Fill only from completed work. Keep secrets, API keys and private customer information out of screenshots and git.

| Item | Evidence location / observed result |
|---|---|
| PRISM project and agent | Existing Primary AI System project; stable agent ID `firstcheque-analyst`, version names `FirstCheque v1` / `FirstCheque v2` |
| Credential handshake | HTTP 200 verified during setup; this does not prove a live model run |
| Live application trace | Pending verification |
| KB document upload and assignment | 18 synthetic source documents uploaded and assigned; readback confirms all 18 ready |
| Retrieval run | KB search returned the VoltGrid financial excerpt; a live model retrieval trajectory remains pending |
| Baseline commit / version | Pending verification |
| Baseline run count and trace IDs | Pending verification |
| Root Cause cluster and 3+ examples | Pending verification |
| Fix commit / version | Pending verification |
| Matched evaluator v1 result | Pending verification |
| Matched evaluator v2 result | Pending verification |
| Repository URL | Pending verification |
| Live demo URL | Pending verification |
| Final submission receipt | Pending verification |

### PRISM evidence commands

The helper reads local environment variables and saves non-secret proof artifacts under ignored `work/`. The app and the helper use the same stable agent ID. Uploaded documents are the corpus exported by `npx tsx scripts/export-corpus.ts`.

```sh
node scripts/prism-proof.mjs status
node scripts/prism-proof.mjs search-kb 'VoltGrid revenue'
node scripts/prism-proof.mjs preview v1 50
node scripts/prism-proof.mjs run-eval v1 50
node scripts/prism-proof.mjs eval-status v1
node scripts/prism-proof.mjs eval-results v1
node scripts/prism-proof.mjs root-ready
node scripts/prism-proof.mjs root-run
node scripts/prism-proof.mjs root-status
node scripts/prism-proof.mjs root-clusters
```

Custom evaluator **FirstCheque · Every number has evidence** and one-time v1/v2 tasks have been created and read back. The first baseline preview correctly reports zero candidate runs. Creating a task is not a completed evaluation. Run the v1 task after the genuine baseline; run Root Cause after failures are analyzed. After implementing the observed fix, use the same evaluator and saved inputs for v2. Preview reports the candidate count and credit estimate before running; v1 and v2 commands consume PRISM credits when actual traces are scored. Check allowance before launching a batch. The helper does not run polling loops or generate model traces.

Submission details are distributed through the event's Discord and Builderbase according to the supplied event announcement. No event-specific public submission URL or deadline is asserted in this document. Finish the working app and evidence package before submitting, and retain the actual confirmation receipt.

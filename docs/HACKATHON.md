# FirstCheque — Money Talks 2 evidence

**Track: Money Intelligence.** FirstCheque turns an investment thesis into a private-company shortlist, source-linked research memos and a paper portfolio. The product pitch is **“Your first cheque starts with better questions.”**

All companies, financials, documents, rounds and balances are synthetic. The experiment used genuine Nicrron model requests to analyze those demonstration documents. Paper allocations do not purchase securities or move money.

## Completed experiment

| Independently checked outcome | v1 | v2 |
|---|---:|---:|
| Fixed user inputs | 50 | 50 |
| Genuine provider calls | 50 | 51 |
| Contract-valid delivered memos | 48 | 50 |
| Delivered live memos | 48 | 50 |
| Application errors | 2 | 0 |
| Replay fallbacks | 0 | 0 |
| Bounded repair attempts | 0 | 1 |

The dataset contains 25 normal and 25 explicitly adversarial requests. Its SHA256 is `3a109e456069150baeed7ea79cb069ce92fe889fef54bfdd5a4bdc5b35a29bc1`. All 50 baseline responses were recorded before the observed-failure fix. The original v1 ledger remains unchanged; its SHA256 is `91376483b97ef2e408e7264a26ff4f3ee6bf7314060fa7f97cafdc8993122182`.

- Baseline source: `a61eccc6ab3ea1f0d930feaa27f1141eaf4a05a3`.
- Improved source: `7e8ff256f80f78a9b1dfc8359b57bb24ca5767f3`.
- Provider/routing slug: Nicrron, `nicrron/auto` in both versions.

The metric is the application's actual JSON contract: trim whitespace, accept one optional outer code fence, parse JSON, and validate the Zod memo schema. It is **not a factual-grounding score**. The independent audit verified identical user inputs and the 48→50 contract counts. Nicrron's router may choose different underlying models; this is an observed pipeline comparison, not a controlled single-model causal estimate.

## What actually failed and changed

**Two genuine baseline contract failures:** case024 included a strength without `sourceIds`, `confidence` and `metric`; case027 returned invalid JSON with a trailing comma. Their raw responses and trace IDs are retained. One earlier pre-batch JSON failure is documented separately and is outside the 50-case denominator.

**Bounded recovery:** v2 validates before rendering and permits one correction request using the original evidence and concrete validation issues. Case018 provides direct recovery evidence: its first response contained a note-only strength missing the required fields; one repair returned a valid live memo. Both actual provider responses are retained under trace `c1dc0b9a-b225-4d54-8314-0c45861f605d`. This explains the 51 calls for 50 v2 cases. Exhausted recovery has an explicitly labeled fallback path; none of the matched v2 cases used it.

## Root Cause: a recurring observability defect

After the baseline, PRISM created cluster `e56129cf-9b65-4333-ba4f-7e3d33aae8d4` with **52 tentative, instrumentation-affected warnings**. Three directly sampled members have verified trace-to-ledger mismatches:

| Case | Trace | Trajectory |
|---|---|---|
| case050 | `6b6a58f1-7ade-42ae-9026-dfdd37574150` | `17008dd4-8139-4e71-83df-3c8f3d580580` |
| case049 | `82f505c4-f5a6-48f7-a4fe-8e1531f24727` | `0a484c17-ef9a-41ae-bd2a-9b7e3c357071` |
| case048 | `403e8ad6-b411-4ffb-a966-fa63d54a60bc` | `428625c6-08d5-4bd6-a3f9-49638bce6a31` |

The application had generated valid live memos, but span ingestion normalized the first submitted retrieval span into the top-level answer. Evaluators consequently saw a `localSources` payload instead of the memo. PRISM suggested a prompt-related cause; inspecting stored spans against immutable recordings localized the code defect.

The fix submits a root chain span carrying the final answer first, parents the child spans, captures the actual model request and checks ingest acknowledgements. Fifty historical v1 display records were corrected from the frozen recordings with byte-equality readback and **zero added model calls**. Original provider outputs were preserved. The old cluster is evidence of recurring observability failures, **not 52 hallucinations or 52 malformed memos**. Direct cluster membership is established for the three rows above; membership of the older schema/JSON failures is not asserted.

## Custom evaluator: completed with a calibration limitation

The same PRISM evaluator, `5268937c-d0cd-4a28-9d15-116bb7df1ffb` (**FirstCheque · Fixed reference memo PASS FAIL**), scored all 50 frozen cases in each version. Its fixed reference catalog was extracted from the original synthetic source packs. The pairing guard verifies case identity, exact trace ID, evaluator ID and byte-identical template/rails across all 100 selected results.

**The external judge did not calibrate.** It rejected an independently valid calibration answer using incorrect length/schema claims. Its labels and reasoning are preserved as integration evidence; we make no external score, usability or factual-grounding improvement claim. The local numerical coverage detector also produced false positives on v1, so no grounding count is published.

Selection provenance is explicit: the v1 bulk service selected one pre-batch smoke instead of case024 despite the preflight trace-list gate. The curated set uses 49 matching bulk rows plus the existing exact-case024 calibration result under the identical evaluator/template/rails; the smoke is excluded. All 50 v2 bulk rows match the frozen cases. An earlier 50-score run evaluated the wrong retrieval payload before normalization was repaired; those scores are marked invalid and excluded.

The original source-only evaluator **FirstCheque · Every number has evidence** was also created, but it was not run as a full paired benchmark. Its existence is not presented as an evaluation result.

## Track evidence and product fit

The supplied builder resource pack requires PRISM plus Nicrron or Ninoo. For Money Intelligence it calls for assigned Knowledge Base research documents and retrieval, at least 50 runs before fixes, a Root Cause cluster with 3+ failure examples, and a custom evaluator used on the same v1/v2 inputs. No numeric judging weights were supplied; reliability, usefulness, integration depth and product quality are our inferred priorities.

| Requirement | Completed evidence |
|---|---|
| Sponsor model | 50 genuine baseline calls; 51 genuine v2 calls; provider outputs and trace lineage retained |
| Knowledge Base | 18 source documents uploaded, assigned to `firstcheque-analyst` and confirmed ready; company-specific retrieval included in model requests |
| Baseline before fixes | Frozen 50-input dataset, original ledger hash and baseline source commit |
| Root Cause | Real tentative cluster and three directly verified recurring normalization failures |
| Custom evaluation | Same evaluator/template/rails on the 50 matched cases per version; calibration limitation disclosed |
| Observed improvement | Independent contract validation: 48/50→50/50; one directly retained invalid→valid bounded repair |
| Product | Thesis → shortlist → cited memo → paper allocation and concentration view |

The product makes early-stage diligence approachable without pretending that a funding stage determines investment eligibility. A future transaction product would require the appropriate offering and registered intermediary. See [SEC crowdfunding guidance](https://www.sec.gov/resources-small-businesses/small-business-compliance-guides/regulation-crowdfunding-guidance-issuers) and [SEC Rule 506(c) guidance](https://www.sec.gov/resources-small-businesses/exempt-offerings/general-solicitation-rule-506c).

## Evidence and access

- [Evidence index](evidence/README.md), [per-case results](evidence/results.json), [frozen inputs](evidence/inputs.json), [raw provider outputs](evidence/provider-outputs.json), [evaluator rubric](evidence/evaluator.json).
- [Repository](https://github.com/Divyesh-Thirukonda/firstcheque); use the repository README for the current hosted demo link.
- [PRISM project](https://prism.blockconvey.com/?project_id=b67f67cc-c7e0-46ed-9f20-fd4d63eeba9d), [Knowledge Base](https://prism.blockconvey.com/knowledge-base), [Root Cause](https://prism.blockconvey.com/root-cause), [Evaluators Hub](https://prism.blockconvey.com/evaluators). Workspace access is required.

The PRISM proof helper reads local environment variables and saves raw evidence under ignored `work/`; it never prints credentials. TypeScript instrumentation follows the [official HTTP ingest contract](https://blockconvey.com/docs). It uses no invented PRISM npm package. The built-in PRISM judge was healthy and did not require a separate judge API key. Paid evaluation consumed existing promotional credits; no credit purchase was made.

**Submission status:** app and evidence prepared. The user confirmed the event submission form had not been released, so there is no submission receipt to claim.

# Recorded evidence

This export contains synthetic company data and genuine provider results. It contains no API keys. `results.json` is the compact index; `provider-outputs.json` preserves the actual raw responses, including both attempts in v2 case018.

| File | Contents |
|---|---|
| `inputs.json` | Exact frozen 50-case dataset: 25 normal and 25 adversarial inputs |
| `sources.json` | Authoritative fictional source catalog, extracted from the recorded v1 requests |
| `knowledge-base.json` | 18 ready assigned document records, actual retrieval sample and per-case retrieval counts |
| `results.json` | Source commits, hashes, per-case trace IDs, contract/mode counts, judge verdicts/reasoning and caveats |
| `provider-outputs.json` | Raw provider text, attempt validity, delivered memo and original errors |
| `evaluator.json` | Exact shared custom rubric and rails, with calibration status |
| `calibration.json` | Saved golden-check verdicts and why the judge is not a reliable quality metric |
| `root-cause.json` | Actual tentative cluster diagnosis and three directly sampled member identities |
| `binding-defect-examples.json` | Original stored-output versus raw-memo mismatches for the three confirmed members |
| `excluded-evaluations.json` | Earlier 50 scores with invalid output binding, explicitly excluded from model-outcome claims |

## How to read the results

The independent application parser found **48/50 contract-valid memos in v1 and 50/50 in v2**. V1 used 50 provider calls; v2 used 51 because one invalid first response required one bounded repair. V2 delivered 50 live memos, with no fallback or error. These are schema and delivery measurements, not a factual-grounding score.

Every case in `results.json` has the same original user input across versions, its exact trace ID, source commit and selected custom judgment. All 100 selected judgments use evaluator `5268937c-d0cd-4a28-9d15-116bb7df1ffb`, with byte-identical template and rails. The judge **failed calibration** and its results are preserved without claiming quality improvement. Local numeric coverage also produced false positives on v1 and is not used as a factual correctness metric.

The v1 bulk service selected one pre-batch smoke instead of case024. The final export excludes that smoke and uses the already recorded exact-case024 calibration judgment from the same evaluator/rubric. Thus v1 contains 49 bulk judgments plus one matching calibration judgment; all 50 v2 judgments came from its bulk task. Selection provenance remains attached to each row. No extra provider request or evaluation was made to fill the gap.

The Root Cause cluster's **52 warnings are tentative and instrumentation-affected**. Three actual sampled members demonstrate that ingest normalization selected a retrieval payload as the answer. They do not establish 52 hallucinations. The two malformed baseline memos and one earlier pre-batch malformed response are separately recorded defects; membership of those older rows in the sampled cluster is not asserted.

## Provenance and reproduction

- Frozen dataset SHA256: `3a109e456069150baeed7ea79cb069ce92fe889fef54bfdd5a4bdc5b35a29bc1`.
- V1 source: `a61eccc6ab3ea1f0d930feaa27f1141eaf4a05a3`.
- V2 source: `7e8ff256f80f78a9b1dfc8359b57bb24ca5767f3`.
- Original v1 ledger SHA256: `91376483b97ef2e408e7264a26ff4f3ee6bf7314060fa7f97cafdc8993122182`.

With local recordings present, `node scripts/curate-evidence.mjs` rebuilds this export without network access or model calls. The script checks dataset identity, trace pairing, evaluator identity and exact rubric/rails before writing. `scripts/reindex-recorded-traces.mjs` is the historical normalization-repair utility; it adds no model calls and should not be rerun merely to replay the demo.

The runtime parser lives in `src/lib/validation.ts`. The source commits preserve the original and improved prompts. Running the same dataset against the sponsor API is a **new paid provider experiment**, not a byte-reproducible model replay: `nicrron/auto` may route differently. The saved outputs are the evidence for the reported counts.

The app's separate illustrative regression replay is deterministic and labeled. Its ARR example is not substituted for the actual provider experiment.

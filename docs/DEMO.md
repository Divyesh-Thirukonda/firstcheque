# FirstCheque — three-minute demo

**Pitch:** FirstCheque makes private-company research personal and inspectable before someone writes their first cheque.

**Opening label:** Synthetic companies and documents. Genuine Nicrron AI research. Paper allocations only.

| Time | Action | Talk track |
|---|---|---|
| 0:00–0:20 | Open the workspace | “The next great company may be private. Understanding it should not require a venture fund's research team.” |
| 0:20–0:40 | Edit the thesis, industry, stage and risk appetite | “I want climate infrastructure, an early round, and a clear view of what could go wrong. The shortlist explains why an opportunity fits my thesis.” |
| 0:40–1:10 | Research VoltGrid; inspect a claim and its source | “The agent reads the assigned documents, writes a diligence memo, and exposes missing information. These companies and numbers are fictional; the model call and research pipeline are real.” |
| 1:10–1:35 | Open Research Lab's live experiment card | “We recorded 50 baseline responses before fixing anything. Two failed the actual memo contract. The same 50 user inputs produced 50 contract-valid live memos in v2.” |
| 1:35–2:15 | Open PRISM Knowledge Base, Root Cause and evidence | “Eighteen documents are assigned to the agent. PRISM grouped recurring warnings. Inspecting three actual cluster members showed that our retrieval span had overwritten the logged memo. We fixed the span hierarchy. Separately, one bounded correction now recovers malformed memo output; here are both real attempts from case018.” |
| 2:15–2:30 | Show evaluator rubric and saved results | “We ran the same custom evaluator on both versions. Its calibration was unreliable, so we retain its results without claiming a score improvement. The 48-to-50 metric comes from the exact application schema.” |
| 2:30–2:50 | Add a paper allocation and view concentration | “I can rehearse a decision, see concentration and stay within my paper budget. No money moves.” |
| 2:50–3:00 | Return to the product | “FirstCheque democratizes the research layer. Your first cheque starts with better questions.” |

## Rehearsal

- Open the app and PRISM evidence tabs beforehand. Workspace access is required for PRISM; the repository contains a non-secret evidence export.
- Verify thesis → research → source → paper allocation. A fresh live memo can be slow; a saved real response may be shown as a previously generated result with its trace ID.
- Use the **live experiment** card for the genuine 50-case counts. The separate **illustrative regression replay** is a labeled deterministic example, not the measured provider baseline.
- Keep secrets and account settings out of the recording. Use the current hosted demo link in the repository README.

## Questions judges may ask

**What improved?**

“Contract-valid delivered memos increased from 48/50 to 50/50 on identical saved user inputs. V2 made 51 provider calls for 50 cases because case018 needed one bounded repair. We retained its invalid first response and valid correction. The routing slug stayed `nicrron/auto`, but the router can choose underlying models, so we describe observed pipeline outcomes.”

**What did Root Cause find?**

“The cluster contained 52 tentative instrumentation-affected warnings. We directly verified three members where stored output was a retrieval payload rather than the actual memo. Comparing traces with immutable raw outputs identified a span-normalization bug. We do not call those 52 hallucinations.”

**Did the custom judge prove the answers are correct?**

“No. We ran the same custom rubric and reference catalog across the matched cases, but its golden calibration rejected a valid answer for incorrect schema reasons. The raw verdicts are available. We publish only the independently validated contract metric, with no grounding score.”

**Can users really invest?**

“This build uses synthetic companies and paper allocations. Real access depends on the offering and investor eligibility; execution would require an appropriate registered partner.”

**Why this product?**

“A familiar investing workspace can help people ask better diligence questions. Thesis fit, evidence, uncertainty and concentration belong in one experience.”

## Submission copy

**Name:** FirstCheque

**Tagline:** Your first cheque starts with better questions.

**Track:** Money Intelligence

**Description:** FirstCheque turns an investor's thesis, industry preferences and risk appetite into a private-company shortlist, evidence-linked AI memos and a paper portfolio. Synthetic company documents keep the hackathon demonstration reproducible. Genuine Nicrron calls power the research; PRISM records retrieval and model behavior so failures can be inspected.

**Technical evidence:** 18 assigned Knowledge Base documents; 50 genuine baseline calls before the fix; a real Root Cause cluster with three verified observability failures; the same custom evaluator on 50 matched cases per version. Independent contract validation improved from 48/50 to 50/50, including one retained invalid-to-valid bounded repair. The external judge failed calibration, so no external score or factual-grounding improvement is claimed.

**Repository:** https://github.com/Divyesh-Thirukonda/firstcheque

**Evidence:** `docs/evidence/README.md`; hosted demo link is maintained in the repository README.

**Submission:** prepared; the event form had not been released when the build was completed.

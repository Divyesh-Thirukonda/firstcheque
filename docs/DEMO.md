# FirstCheque — live demo script

**One sentence:** FirstCheque makes private-company research understandable, personal, and inspectable before someone writes their first cheque.

**Honest demo label:** Synthetic companies and documents. Live AI research when configured. Paper allocations only.

## Three-minute walkthrough

| Time | Action | Talk track |
|---|---|---|
| 0:00–0:20 | Open the investing workspace | “The next great company may be private. Understanding it should not require a venture fund's research team.” |
| 0:20–0:45 | Set thesis, preferred industries, stage and risk appetite | “I want climate infrastructure, an early round, and a clear view of what could go wrong. FirstCheque explains fit in the context of my thesis.” |
| 0:45–1:20 | Open a company and generate its research memo | “The agent reads the company documents, separates evidence from open questions, and explains upside and downside. These companies and numbers are synthetic for this prototype.” |
| 1:20–1:40 | Inspect a factual claim and its source; show a missing fact | “A confident answer is not enough. I can inspect what supports the claim. When runway is not disclosed, it should say so.” |
| 1:40–2:25 | Open PRISM: KB → failed run cluster → evaluator comparison | “We tested a baseline, found a repeated failure, and changed the agent. Here are the same inputs before and after, scored by the same grounding evaluator.” Use only the actual observed cause, count and scores. |
| 2:25–2:50 | Add a paper allocation and view concentration | “Research becomes a decision I can rehearse. I can see how this allocation changes my sector and stage exposure.” |
| 2:50–3:00 | Return to product | “FirstCheque democratizes the research layer. The path to real investing would connect eligible offerings to a registered partner.” |

If the event gives a different time limit, preserve the research flow and reliability proof; shorten the introduction first.

## Before the judge arrives

- Start the app and confirm the thesis, company detail, research and paper portfolio flow works.
- Open the correct PRISM project, uploaded research documents, relevant retrieval run, failure cluster and completed evaluator comparison in separate tabs.
- Use the exact matched v1/v2 input when demonstrating improvement. Know the sample size and the limitations.
- Confirm a fresh application research request creates an inspectable trace. Keep the provider/model visible where useful; hide keys and secrets.
- Have a saved real research output ready if the provider is slow, label it as a previously generated result, and keep its trace link. Do not relabel a local fixture as a live model call.
- Verify repo and demo URLs, capture the actual submission confirmation, and keep any externally incomplete steps explicit.

## Questions judges may ask

**“Is this another AI stock picker?”**

“The useful output is an evidence-linked diligence memo and a view of how the opportunity fits a thesis. We expose missing information and investment risk, and let people rehearse allocations.”

**“Why PRISM?”**

“The product depends on trust in sparse company information. PRISM lets us inspect retrieval and model behavior, group recurring failures, and test whether a targeted fix improves the exact same cases.” Point to the actual completed evidence.

**“What did you improve?”**

Use the recorded result: “Across [N] matched inputs, [observed failure] changed from [measured v1] to [measured v2] after [specific change].” If no completed measurement exists, say the comparison is pending. Do not fill these placeholders from intuition.

**“Can I really invest?”**

“This hackathon build uses synthetic companies and paper allocations. Real eligibility depends on the offering. Execution would need the appropriate registered partner; the research experience is what we demonstrate today.”

**“What is the moat?”**

“A user-owned thesis, evidence history, and a measurable research process. The product can explain why an opportunity fits, where its facts came from, what is missing, and how confidence changes when documents change.”

## Submission copy

**Name:** FirstCheque

**Tagline:** Your first cheque starts with better questions.

**Track:** Money Intelligence

**Description:** FirstCheque is a private-market research workspace that turns an investor's thesis, industries and risk preferences into a company shortlist, evidence-linked AI memos and a paper portfolio. It makes early-stage diligence approachable while keeping missing information and downside visible. The prototype uses synthetic company data. Nicrron powers configured live research; PRISM traces retrieval and model behavior so reliability can be inspected and improved.

**Reliability claim:** Replace with completed evidence only: [baseline sample size], [observed failure cluster], [specific improvement], [matched evaluator results].

**Links:** Add verified repository, working demo, PRISM evidence and any requested video links. Do not submit this file's unfilled placeholders as completed results.

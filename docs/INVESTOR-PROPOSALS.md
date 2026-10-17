# Investor proposals

Checked October 17, 2026. This feature prepares an investor for a founder conversation and legal review. It does not solicit a founder, negotiate or accept a securities transaction, collect signatures, hold money, or issue shares.

## Investor flow

1. Open any company from Discover, a saved list, or agent results and choose **Draft proposal**. Edit the proposed USD amount, investor name, instrument preference and note. The paper preview updates immediately.
2. Prepare the conversation. Edit the opening and generate a real ElevenLabs audio preview. The stock voice introduces the AI assistant; a server-added preview disclosure remains even if the editable script changes. No telephone number is dialed.
3. Paste actual notes or try the explicitly fictional rehearsal. Nicrron extracts proposed terms and retains continuous source passages. Missing terms stay open. A disclosed cap and discount can share the same instrument passage; the app never computes current equity from a SAFE cap.
4. Review and edit proposed terms, with original note passages available beside edits. An instrument-aware proposed investment agreement is assembled automatically and marked Draft - Pending Signatures. Legal entity, jurisdiction, signer authority, conversion mechanics, share details, closing date and governing law remain editable; absent details are explicit placeholders. Synthetic notes remain labeled in the document, including when pasted without selecting the example button.
5. Export a formatted PDF or copy the contract draft for review. PDF generation runs locally in the browser using pdf-lib and an embedded OFL-licensed Geist font, with automatic pagination, page numbers and blank signature lines. There are no signature fields, captured signatures or prefilled signature names. The final screen identifies missing details and later review/signing outside Seed Street. Verbal interest is never converted into a signature. If a company has a sourced offering URL, the investor can continue at that original source. Its current status and eligibility still require intermediary review.

The **Proposals** tab resumes drafts saved in this browser. Drafts, notes, names and terms are not added to the shared company library. Audio is temporary browser memory. ElevenLabs receives the script on generation; Nicrron receives notes on extraction. PRISM receives execution metadata, field names, validation results and token counts, with note text, investor names, amounts and audio redacted before ingest. Real model execution on a synthetic rehearsal is recorded as live execution with a synthetic-source flag.

## U.S. legal boundary

A small check does not itself create a securities-law exemption. Regulation Crowdfunding transactions must use an SEC-registered broker-dealer or funding portal. Direct private rounds need an applicable exemption and issuer-specific eligibility checks; Rule 506(b) and 506(c) have different solicitation and investor requirements. Seed Street's contemplated solicitation, negotiation and transaction facilitation also require securities counsel to assess broker/adviser obligations. A nonbinding label alone does not resolve those obligations.

An AI phone call is separate from an in-browser voice preview. Before actual outbound calling, assess TCPA consent, number type, applicable exemptions, identification/opt-out rules, recording consent and local law. A verbal expression of interest does not establish an approved issuance, investor eligibility or an enforceable final contract. This prototype does not enable live calls or e-signing.

Primary references:

- [SEC Regulation Crowdfunding guidance](https://www.sec.gov/resources-small-businesses/small-business-compliance-guides/regulation-crowdfunding-guidance-issuers)
- [SEC guide to broker-dealer registration](https://www.sec.gov/about/divisions-offices/division-trading-markets/division-trading-markets-compliance-guides/guide-broker-dealer-registration)
- [SEC accredited-investor assessment under Regulation D](https://www.sec.gov/resources-small-businesses/capital-raising-building-blocks/assessing-accredited-investors-under-regulation-d)
- [FCC AI voice ruling, FCC 24-17](https://docs.fcc.gov/public/attachments/FCC-24-17A1_Rcd.pdf)
- [ElevenLabs text-to-speech API](https://elevenlabs.io/docs/api-reference/text-to-speech/convert)

Unsigned does not by itself guarantee absence of legal effect: oral contracts and securities offers can have consequences before signing. Draft status records the intended use, rather than certifying legal validity. See [oral contracts](https://www.law.cornell.edu/wex/oral_contract) and [15 USC 77b(a)(3)](https://www.law.cornell.edu/uscode/text/15/77b).

## Configuration

`ELEVENLABS_API_KEY` is server-only, restricted to Text to Speech, capped at 5,000 credits per refresh period, and expires after 30 days. It is configured in ignored `.env.local` and Vercel Preview secrets. It is never included in a browser bundle or a source archive. Existing Nicrron and PRISM variables power and instrument term extraction. Both new endpoints bound payload size, reject cross-origin browser requests and apply a prototype process-local rate limit of six requests per IP per minute. Deployment protection remains enabled.

The frozen benchmark and synthetic paper-investment flows are unchanged.

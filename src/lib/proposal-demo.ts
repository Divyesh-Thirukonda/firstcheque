import { dollars, type ProposalDraft } from "./proposals";
import type { CallPurpose } from "./proposal-calls";
export const GUIDED_DEMO_MARKER = "SEED STREET GUIDED DEMO";
export function proposalDemo(draft: ProposalDraft, purpose: CallPurpose) {
  const notes = `SYNTHETIC REHEARSAL - ${GUIDED_DEMO_MARKER}. All answers are fictional; they are not statements by ${draft.companyName} or its founders.
Agent: ${purpose === "offer" ? `An investor proposes ${dollars(draft.amount)}. Can you share potential investment terms for an unsigned draft?` : "Can you fill the gaps on revenue, customers, pricing and fundraising?"}
Fictional founder: Our fictional business has $180,000 ARR as of October 2026, six paying customers and three active pilots. Fictional pricing plans are $1,000 and $2,500 per month; the mix of clients by plan is undisclosed.
Fictional founder: We are considering a post-money SAFE with a $10 million valuation cap and no conversion discount. No shares are issued today, and future ownership depends on the definitive SAFE and financing.
Fictional founder: The fictional issuer is Example Company, Inc., a Delaware corporation. Alex Example, CEO, is the proposed signer, subject to board approval.
Fictional founder: The current cap table and outstanding SAFEs need review. Investor rights, conversion mechanics, the accepted minimum, offering exemption, investor eligibility and governing law remain unconfirmed.
Fictional founder: Yes, send an unsigned draft for review. This is interest only; we have not accepted the investment. Any closing date is subject to final documents and approval.`;
  const speech =
    purpose === "offer"
      ? `This is a fictional Seed Street demo. An investor is exploring ${dollars(draft.amount)}. The fictional founder says: We're considering a post-money SAFE, with a ten million dollar cap and no discount. Please send an unsigned draft. This is interest, not acceptance. The remaining details still need review.`
      : `This is a fictional Seed Street demo. The fictional founder says: We have one hundred eighty thousand dollars in annual recurring revenue, six paying customers, and three active pilots. We're exploring a SAFE round. Please send an unsigned draft for review.`;
  return { notes, speech };
}

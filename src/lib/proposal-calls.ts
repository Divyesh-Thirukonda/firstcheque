import { z } from "zod";
import {
  TERM_LABELS,
  proposalTermIsOpen,
  type ProposalDraft,
  type TermKey,
  dollars,
} from "./proposals";
export type CallPurpose = "missing-info" | "offer";
export { callSessionSchema, type CallSession } from "./proposal-call-schema";
export function callBrief(draft: ProposalDraft, purpose: CallPurpose) {
  const missing = (Object.keys(TERM_LABELS) as TermKey[])
    .filter(
      (key) =>
        !draft.terms.some((t) => t.key === key && !proposalTermIsOpen(t.value)),
    )
    .map((key) => TERM_LABELS[key]);
  return JSON.stringify({
    company: draft.companyName,
    purpose,
    investor: draft.investorName || "An interested investor",
    proposedAmount: purpose === "offer" ? `${dollars(draft.amount)} USD` : null,
    instrument: purpose === "offer" ? draft.instrument : null,
    investorNote: purpose === "offer" ? draft.message : null,
    missingTerms: missing,
    additionalResearchQuestions:
      purpose === "missing-info"
        ? [
            "Current revenue or ARR, currency, period and as-of date; distinguish estimates from actuals",
            "Number of active pilots and paying customers",
            "Published pricing tiers and customer mix, if they can disclose it",
            "Current fundraising status and who can share authorized draft documents",
          ]
        : [],
    constraints:
      "Discussion and draft preparation only. Do not accept an investment, agree to equity, promise money, sign or bind either party. A verbal yes means interest only. Never invent missing details. Responses are unverified founder statements. Respect refusal; end promptly.",
  });
}
export function conversationNotes(transcript: unknown) {
  const parsed = z
    .array(
      z.object({
        role: z.enum(["agent", "user"]),
        message: z.string().nullable().optional(),
      }),
    )
    .max(300)
    .safeParse(transcript);
  if (!parsed.success) return "";
  return parsed.data
    .filter((turn) => turn.message?.trim())
    .map(
      (turn) =>
        `${turn.role === "user" ? "Founder" : "Agent"}: ${turn.message}`,
    )
    .join("\n")
    .slice(0, 14000);
}

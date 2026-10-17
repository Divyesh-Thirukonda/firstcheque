import { z } from "zod";
import type { DiscoveryCompany } from "./discovery-types";

export const PROPOSAL_STORAGE_KEY = "seed-street.proposals.v1";
export const TERM_LABELS = {
  instrument: "Investment instrument",
  valuation: "Valuation or SAFE cap",
  ownership: "Equity percentage & basis",
  capTable: "Cap table & dilution",
  rights: "Investor rights & preferences",
  discount: "Conversion discount",
  minimum: "Minimum investment",
  entity: "Legal entity",
  route: "Offering route & eligibility",
  interest: "Founder interest",
  nextStep: "Next step",
} as const;
export type TermKey = keyof typeof TERM_LABELS;
const termKey = z.enum(Object.keys(TERM_LABELS) as [TermKey, ...TermKey[]]);
export const extractedTermsSchema = z.object({
  terms: z
    .array(
      z.object({
        key: termKey,
        value: z.string().min(1).max(700),
        quote: z.string().min(1).max(700),
      }),
    )
    .max(16),
});
export type ExtractedTerm = z.infer<
  typeof extractedTermsSchema
>["terms"][number];
export const proposalSchema = z.object({
  id: z.string().max(100),
  companyId: z.string().max(160),
  companyName: z.string().max(160),
  investorName: z.string().max(120),
  amount: z.number().finite().positive().max(100000000),
  instrument: z.enum([
    "Ask the founder",
    "Post-money SAFE",
    "Priced equity",
    "Convertible note",
  ]),
  message: z.string().max(1600),
  script: z.string().max(1800),
  notes: z.string().max(14000),
  sample: z.boolean(),
  terms: z
    .array(
      z.object({
        key: termKey,
        value: z.string().max(700),
        quote: z.string().max(700),
        edited: z.boolean().optional(),
      }),
    )
    .max(16),
  step: z.number().int().min(0).max(3),
  updatedAt: z.string().datetime(),
});
export type ProposalDraft = z.infer<typeof proposalSchema>;
export function dollars(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}
export function openingScript(companyName: string, amount: number) {
  return `Hi there. I'm Seed Street's AI assistant, working with Divyesh. An investor is interested in exploring a ${dollars(amount)} investment in ${companyName}. This is a nonbinding conversation. Are you currently raising, and is there an eligible offering or round we should review? What instrument and minimum check do you use? If you're open to discussing terms, could you walk us through the valuation or SAFE cap, the cap table, and investor rights?`;
}
export function proposalMessage(amount: number) {
  return `I'd like to learn about your current round, proposed terms, and whether a ${dollars(amount).replace(/\.00$/, "")} investment would be eligible.`;
}
export function newProposal(company: DiscoveryCompany): ProposalDraft {
  return {
    id: crypto.randomUUID(),
    companyId: company.id,
    companyName: company.name,
    investorName: "",
    amount: 1000,
    instrument: "Ask the founder",
    message: proposalMessage(1000),
    script: openingScript(company.name, 1000),
    notes: "",
    sample: false,
    terms: [],
    step: 0,
    updatedAt: new Date().toISOString(),
  };
}
export function hydrateProposals(text: string | null): ProposalDraft[] {
  try {
    if (!text || text.length > 1000000) return [];
    const data: unknown = JSON.parse(text);
    if (!Array.isArray(data)) return [];
    return data.slice(0, 30).flatMap((row) => {
      const parsed = proposalSchema.safeParse(row);
      return parsed.success ? [parsed.data] : [];
    });
  } catch {
    return [];
  }
}
export function groundProposalTerms(
  candidate: z.infer<typeof extractedTermsSchema>,
  notes: string,
): ExtractedTerm[] {
  const normal = (s: string) =>
    s.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
  const seen = new Set<string>();
  const segments = notes.split(
    /(?=^(?:Agent|Investor|Assistant|Founder|Fictional founder|Issuer)\s*:)/im,
  );
  const investorSegments = segments.filter((text) =>
    /^\s*(?:Agent|Investor|Assistant)\s*:/i.test(text),
  );
  const issuerSegments = segments.filter((text) =>
    /^\s*(?:Founder|Fictional founder|Issuer)\s*:/i.test(text),
  );
  const grounded: ExtractedTerm[] = candidate.terms.flatMap((term) => {
    // The displayed value is always the actual passage, never the model's paraphrase or computed ownership.
    const onlyInvestor =
      investorSegments.some((text) =>
        normal(text).includes(normal(term.quote)),
      ) &&
      !issuerSegments.some((text) => normal(text).includes(normal(term.quote)));
    if (
      onlyInvestor ||
      seen.has(term.key) ||
      !normal(notes).includes(normal(term.quote))
    )
      return [];
    seen.add(term.key);
    return [{ ...term, value: term.quote }];
  });
  // A single passage can disclose instrument, cap and discount. Retain that same passage for each explicit label.
  for (const [key, pattern] of [
    [
      "valuation",
      /\bvaluation (?:cap|of)|\b(?:pre|post)[ -]money valuation|\bvalued at\b/i,
    ],
    ["discount", /\b(?:conversion )?discount\b/i],
  ] as const) {
    const passage = grounded.find((term) => pattern.test(term.quote));
    if (passage && !seen.has(key)) {
      grounded.push({ key, value: passage.quote, quote: passage.quote });
      seen.add(key);
    }
  }
  return grounded;
}
export const SAMPLE_CONVERSATION = `SYNTHETIC REHEARSAL — fictional terms, not statements by this company or its founders.
Agent: Is there a round open to this investor, and what instrument are you considering?
Fictional founder: We are open to an introductory conversation, not accepting an investment on this call.
Fictional founder: The fictional issuer is Example Company, Inc., a Delaware corporation.
Fictional founder: We are considering a post-money SAFE with a $10 million valuation cap and no conversion discount.
Agent: How much ownership would that represent today?
Fictional founder: No shares are issued today under the SAFE. Conversion and dilution depend on the definitive terms and future financing.
Fictional founder: Our draft cap table and outstanding SAFEs still need review. Investor rights and any side letter are not agreed.
Fictional founder: A $1,000 check is something we could discuss; it is not an approved minimum.
Fictional founder: We have not confirmed an offering exemption or this investor's eligibility. Please have counsel review both before any commitment.
Fictional founder: Next step is to exchange the current cap table and counsel-approved draft documents.`;
export function isSyntheticNotes(notes: string) {
  return (
    /^\s*SYNTHETIC REHEARSAL\b/im.test(notes) ||
    /(?:^|\n)\s*Fictional founder:/i.test(notes)
  );
}
export function proposalDocument(draft: ProposalDraft) {
  const sample = draft.sample || isSyntheticNotes(draft.notes);
  const term = (key: TermKey) =>
    draft.terms.find((row) => row.key === key)?.value || "To be confirmed";
  return `${sample ? "SYNTHETIC REHEARSAL — FICTIONAL TERMS\n" : ""}SEED STREET · NONBINDING INVESTMENT DISCUSSION DRAFT\n${draft.companyName}\nPrepared ${new Date(draft.updatedAt).toISOString().slice(0, 10)}\n\nSTATUS\nFor discussion and legal review only. This document is not an executable investment agreement, offer acceptance, funding commitment, or evidence of ownership. No company or investor has signed.\n\nPARTIES & PROPOSED AMOUNT\nInvestor: ${draft.investorName || "Investor identity to be confirmed"}\nCatalog company: ${draft.companyName}\nLegal issuer: ${term("entity")}\nInvestor's proposed amount: ${dollars(draft.amount)} USD, subject to issuer acceptance and an eligible offering.\nInvestor's instrument preference: ${draft.instrument}\n\nINVESTOR NOTE\n${draft.message}\n\nDISCUSSION TERMS — UNVERIFIED NOTES${sample ? " (SYNTHETIC)" : ""}\n${(Object.keys(TERM_LABELS) as TermKey[]).map((key) => `${TERM_LABELS[key]}: ${term(key)}`).join("\n\n")}\n\nREQUIRED BEFORE CLOSING\nConfirm issuer identity and authority; offering exemption and investor eligibility; current fully diluted cap table, outstanding SAFEs/notes, option pool and dilution; instrument-specific economics, share class, conversion terms and rights; required disclosures and company approvals; definitive documents prepared or approved by securities counsel; and the registered intermediary or lawful closing/payment process. A SAFE is not current equity ownership.\n\nSIGNATURE STATUS\nInvestor — not requested; pending definitive documents and legal review.\nIssuer authorized signatory — not requested; identity and authority unconfirmed.\nSigning and payment occur only through the approved closing process. Seed Street does not accept funds or execute trades.\n`;
}

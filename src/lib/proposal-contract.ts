import {
  dollars,
  isSyntheticNotes,
  TERM_LABELS,
  type ProposalDraft,
  type TermKey,
} from "./proposals";

export interface ContractSection {
  title: string;
  paragraphs?: string[];
  fields?: { label: string; value: string; origin?: string }[];
}
export function buildProposalContract(draft: ProposalDraft) {
  const sample = draft.sample || isSyntheticNotes(draft.notes);
  const row = (key: TermKey) =>
    draft.terms.find((term) => term.key === key && term.value.trim());
  const term = (key: TermKey, placeholder: string) =>
    row(key)?.value.trim() || `[TO BE CONFIRMED: ${placeholder}]`;
  const field = (key: TermKey, placeholder: string) => ({
    label: TERM_LABELS[key],
    value: term(key, placeholder),
    origin: row(key)
      ? row(key)?.edited
        ? "Investor-edited proposal"
        : "Unverified conversation notes"
      : "Missing detail",
  });
  const instrument =
    draft.instrument !== "Ask the founder"
      ? draft.instrument
      : row("instrument")?.value || "";
  const kind = /safe/i.test(instrument)
    ? "SAFE"
    : /convertible|note/i.test(instrument)
      ? "Convertible note"
      : /equity|shares|stock/i.test(instrument)
        ? "Priced equity"
        : "Instrument to be confirmed";
  const sections: ContractSection[] = [
    {
      title: "1. Parties and proposed transaction",
      fields: [
        {
          label: "Investor",
          value:
            draft.investorName.trim() ||
            "[TO BE CONFIRMED: investor's full legal name]",
          origin: "Investor entry",
        },
        field("entity", "issuer's full legal name and entity type"),
        field("jurisdiction", "issuer's jurisdiction of organization"),
        field("signatory", "issuer's authorized representative and authority"),
        {
          label: "Proposed investment",
          value: `${dollars(draft.amount)} USD`,
          origin: "Investor proposal",
        },
        { label: "Investor's instrument preference", value: draft.instrument },
        field("instrument", "final investment instrument"),
      ],
    },
    {
      title: "2. Draft status and intended effect",
      paragraphs: [
        "This document records proposed investment terms for review. The parties do not intend to be bound by this draft. Any commitment is subject to completion of missing terms, review of the proposed transaction, required approvals, and actual execution by both parties of an agreed final agreement. A conversation, verbal expression of interest or preparation of this document is not treated by Seed Street as a signature, acceptance or completed investment.",
        "No money or equity is transferred by this draft or through Seed Street. No party has signed this document. Blank signature lines are provided only for a later completed and approved version.",
      ],
    },
    {
      title: `3. Proposed instrument and economics - ${kind}`,
      paragraphs:
        kind === "SAFE"
          ? [
              "The contemplated instrument is a SAFE for possible future equity. The proposed investment amount is stated above; the valuation cap, discount and conversion mechanics remain subject to the final agreed instrument. This draft does not issue current shares or establish a fixed ownership percentage. Conversion events, capitalization definitions, dissolution and liquidity treatment must be completed in the final agreement.",
            ]
          : kind === "Convertible note"
            ? [
                "The contemplated instrument is a convertible note with the proposed investment amount as principal. Interest, maturity, conversion events, any cap or discount, repayment rights and security or subordination must be completed in the final instrument. This draft does not create a funded loan or cause interest to accrue.",
              ]
            : kind === "Priced equity"
              ? [
                  "Subject to an agreed final agreement and all closing conditions, the investor proposes to subscribe for the share class, number of shares and price stated below. Any proposed ownership percentage must specify its pre- or post-money and fully diluted basis. Seed Street does not infer a share count or ownership percentage from the cheque amount.",
                ]
              : [
                  "The final instrument has not been confirmed. Before execution, identify whether the transaction uses priced equity, a SAFE, a convertible note or another instrument, and complete the corresponding issuance, conversion, payment and investor-rights provisions.",
                ],
      fields: [
        field("valuation", "valuation basis or SAFE/note cap and currency"),
        field(
          "discount",
          "discount, or an express statement that none applies",
        ),
        field(
          "conversionTerms",
          "conversion events and mechanics; for a note, interest and maturity",
        ),
        field(
          "shareClass",
          "share class, number of shares and price per share, if applicable",
        ),
        field(
          "ownership",
          "proposed ownership and dilution basis, or future-equity treatment",
        ),
        field("minimum", "issuer's accepted minimum investment, if any"),
      ],
    },
    {
      title: "4. Capitalization and investor rights",
      fields: [
        field(
          "capTable",
          "fully diluted capitalization, outstanding SAFEs/notes and option pool",
        ),
        field(
          "rights",
          "information, voting, pro rata, liquidation and other applicable rights",
        ),
      ],
      paragraphs: [
        "The parties must confirm the applicable capitalization records, rights and any side letters before execution. Terms appearing in notes or entered by the investor are proposed terms, not independently verified company facts or evidence that the issuer agreed to them.",
      ],
    },
    {
      title: "5. Conditions before any closing",
      fields: [
        field(
          "route",
          "applicable offering route and investor/issuer eligibility",
        ),
      ],
      paragraphs: [
        "Any closing is proposed to be conditional on confirmation of the parties' identities and authority; applicable securities-law requirements and disclosures; investor and issuer eligibility; required company approvals; satisfactory review of the capitalization and transaction documents; and execution of the completed final agreement. This draft does not represent that an exemption, registration, accreditation status or approval has been established.",
      ],
    },
    {
      title: "6. Proposed closing and governing law",
      fields: [
        field("closingDate", "proposed closing date or closing conditions"),
        field(
          "governingLaw",
          "chosen governing law and dispute-resolution provisions",
        ),
      ],
      paragraphs: [
        "Payment, issuance and any entry on the issuer's records would occur only through the separately agreed lawful closing process after execution and satisfaction of the final conditions. Seed Street does not collect, hold or transfer the consideration and does not issue securities. Jurisdiction of incorporation alone is not treated as an agreed governing-law clause.",
      ],
    },
    {
      title: "7. Outstanding details and next steps",
      fields: [
        field("interest", "issuer's stated interest; no acceptance inferred"),
        field("nextStep", "documents, follow-up and responsible parties"),
      ],
      paragraphs: draft.message.trim()
        ? [`Investor's accompanying note: ${draft.message.trim()}`]
        : [],
    },
  ];
  return {
    title: "Proposed Investment Agreement",
    status: "DRAFT - PENDING SIGNATURES",
    company: draft.companyName,
    date: draft.updatedAt.slice(0, 10),
    sample,
    kind,
    sections,
    signatureNotice:
      "Neither party has signed. Complete and approve the final agreement before any later execution.",
  };
}
export function contractText(draft: ProposalDraft) {
  const contract = buildProposalContract(draft);
  return [
    contract.sample ? "SYNTHETIC REHEARSAL - FICTIONAL TERMS" : "",
    "SEED STREET",
    contract.title.toUpperCase(),
    contract.status,
    contract.company,
    `Prepared ${contract.date}`,
    ...contract.sections.flatMap((section) => [
      "",
      section.title,
      ...(section.paragraphs || []),
      ...(section.fields || []).map(
        (field) =>
          `${field.label}: ${field.value}${field.origin ? ` (${field.origin})` : ""}`,
      ),
    ]),
    "",
    "8. Signatures - blank and pending",
    contract.signatureNotice,
    "Investor signature: ______________________________",
    "Printed name: __________________________________",
    "Date: _________________________________________",
    "Issuer authorized signature: _____________________",
    "Printed name and title: _________________________",
    "Date: _________________________________________",
  ]
    .filter((line, index) => line || index > 5)
    .join("\n\n");
}

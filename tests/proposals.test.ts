import test from "node:test";
import assert from "node:assert/strict";
import { CATALOG_SEEDS } from "../src/lib/catalog-seeds";
import {
  extractedTermsSchema,
  groundProposalTerms,
  hydrateProposals,
  newProposal,
  openingScript,
  proposalDocument,
  SAMPLE_CONVERSATION,
} from "../src/lib/proposals";

test("proposal drafts contain interest, never a fabricated agreement, ownership or signature", () => {
  const company = CATALOG_SEEDS.find((c) => c.name === "Kojable")!,
    draft = newProposal(company),
    document = proposalDocument(draft);
  assert.equal(draft.amount, 1000);
  assert.equal(draft.terms.length, 0);
  assert.equal(draft.step, 0);
  assert.match(draft.script, /AI assistant/);
  assert.match(draft.script, /nonbinding/);
  assert.match(document, /not an executable investment agreement/);
  assert.match(document, /No company or investor has signed/);
  assert.match(document, /SAFE is not current equity ownership/);
  assert.match(document, /Legal issuer: To be confirmed/);
  assert.ok(!document.includes("0.01%"));
});
test("term extraction retains exact evidence and its qualifications, rejects invented passages and does no equity math", () => {
  const notes =
    "Founder: We might consider a post-money SAFE with a $10 million cap. No shares would be issued today. We have not confirmed investor eligibility.";
  const candidate = extractedTermsSchema.parse({
    terms: [
      {
        key: "valuation",
        value: "$10 million agreed valuation",
        quote: "We might consider a post-money SAFE with a $10 million cap.",
      },
      {
        key: "ownership",
        value: "0.01%",
        quote: "Investor gets 0.01% equity.",
      },
      {
        key: "route",
        value: "Eligible",
        quote: "We have not confirmed investor eligibility.",
      },
    ],
  });
  const terms = groundProposalTerms(candidate, notes);
  assert.equal(terms.length, 2);
  assert.equal(
    terms[0].value,
    "We might consider a post-money SAFE with a $10 million cap.",
  );
  assert.equal(terms[1].value, "We have not confirmed investor eligibility.");
  assert.ok(!terms.some((t) => t.key === "ownership"));
});
test("local proposals reject corrupt, excessive and invalid browser data individually", () => {
  const draft = newProposal(CATALOG_SEEDS[0]);
  assert.equal(hydrateProposals("not json").length, 0);
  assert.equal(hydrateProposals('"oops"').length, 0);
  assert.equal(
    hydrateProposals(
      JSON.stringify([{ ...draft, amount: -1 }, { ...draft, step: 99 }, draft]),
    ).length,
    1,
  );
  assert.equal(
    hydrateProposals(JSON.stringify([{ ...draft, amount: null }])).length,
    0,
  );
  assert.equal(hydrateProposals("x".repeat(1000001)).length, 0);
});
test("synthetic conversation terms remain labeled on every exported discussion draft", () => {
  const draft = {
    ...newProposal(CATALOG_SEEDS[0]),
    sample: true,
    notes: SAMPLE_CONVERSATION,
  };
  assert.match(
    proposalDocument(draft),
    /^SYNTHETIC REHEARSAL — FICTIONAL TERMS/,
  );
  assert.match(proposalDocument(draft), /UNVERIFIED NOTES \(SYNTHETIC\)/);
  assert.match(
    SAMPLE_CONVERSATION,
    /not statements by this company or its founders/,
  );
  assert.match(openingScript("ExampleCo", 2500), /\$2,500.00/);
});

test("an explicit cap and discount in an instrument passage fill both fields without altering the quote", () => {
  const quote =
    "We are considering a post-money SAFE with a $10 million valuation cap and no conversion discount.";
  const terms = groundProposalTerms(
    extractedTermsSchema.parse({
      terms: [{ key: "instrument", value: quote, quote }],
    }),
    quote,
  );
  assert.deepEqual(
    terms.map((t) => t.key),
    ["instrument", "valuation", "discount"],
  );
  assert.ok(terms.every((t) => t.value === quote));
});

test("pasted synthetic notes cannot lose their rehearsal label by omitting the UI flag", () => {
  const draft = {
    ...newProposal(CATALOG_SEEDS[0]),
    sample: false,
    notes: SAMPLE_CONVERSATION,
  };
  assert.match(proposalDocument(draft), /^SYNTHETIC REHEARSAL/);
});

test("an investor proposal or agent question is not promoted into founder terms", () => {
  const quote = "Would you consider a $5 million valuation cap?";
  const notes = `Agent: ${quote}\nFounder: We have not proposed a cap yet.`;
  const result = groundProposalTerms(
    extractedTermsSchema.parse({
      terms: [{ key: "valuation", value: quote, quote }],
    }),
    notes,
  );
  assert.deepEqual(result, []);
});

import test from "node:test";
import assert from "node:assert/strict";
import { generateValidatedReport, parseReportOutput, ReportContractError, type GenerationRequest } from "../src/lib/report-contract";
import { evaluateGrounding } from "../src/lib/evaluation";
import { getEvidence } from "../src/lib/data";

const validMemo = {
  title: "VoltGrid research", summary: "Fictional founder-reported figures require verification.", recommendation: "research",
  strengths: [{ text: "$620K ARR is founder-reported.", sourceIds: ["volt-financials"], confidence: "medium", metric: { key: "arr", value: 620000 } }],
  risks: [{ text: "Shares are illiquid and the entire investment may be lost.", sourceIds: ["volt-risk"], confidence: "high", metric: null }],
  diligenceQuestions: ["Can contracts and bank records verify the financials?", "What financing milestone does this round fund?"],
};
const validText = JSON.stringify(validMemo);
const sourceRequest = JSON.stringify({ userQuestion: "Research this company.", sourcePack: [{ id: "volt-financials", arr: 620000, annualRevenue: 840000 }] });
const result = (text: string) => ({ text, inputTokens: 100, outputTokens: 50, latencyMs: 20 });

test("outer JSON framing is normalized while truncated or incomplete reports are rejected", () => {
  assert.deepEqual(parseReportOutput(`\`\`\`json\n${validText}\n\`\`\``), validMemo);
  assert.throws(() => parseReportOutput(validText.slice(0, -5)));
  assert.throws(() => parseReportOutput(JSON.stringify({ ...validMemo, strengths: [{ text: "An unstructured note" }] })));
});

test("valid v2 output needs only one model response and preserves the supplied numbers", async () => {
  let calls = 0;
  const output = await generateValidatedReport({ version: "v2", system: "Use supplied evidence.", prompt: sourceRequest, generate: async () => { calls++; return result(validText); } });
  assert.equal(calls, 1);
  assert.equal(output.repairAttempts, 0);
  assert.equal(output.output.strengths[0].metric?.value, 620000);
});

test("one corrective call receives real validation issues and exactly the original evidence", async () => {
  const requests: GenerationRequest[] = [];
  const invalid = JSON.stringify({ ...validMemo, strengths: [{ text: "Missing citation metadata" }] });
  const output = await generateValidatedReport({ version: "v2", system: "Use supplied evidence.", prompt: sourceRequest, deadlineAt: 70000, now: () => 1000,
    generate: async (request) => { requests.push(request); return result(requests.length === 1 ? invalid : validText); } });
  assert.equal(requests.length, 2);
  assert.equal(output.repairAttempts, 1);
  assert.equal(output.attempts[0].text, invalid);
  assert.equal(output.attempts[0].valid, false);
  assert.equal(output.attempts[1].valid, true);
  assert.equal(requests[1].maxRetries, 0);
  assert.ok(requests[1].timeoutMs <= 25000);
  const repair = JSON.parse(requests[1].prompt);
  assert.deepEqual(repair.originalResearchRequest, JSON.parse(sourceRequest));
  assert.equal(repair.invalidResponse, invalid);
  assert.match(repair.validationIssues, /sourceIds/);
});

test("malformed JSON gets a bounded corrective call, while v1 remains an unchanged single attempt", async () => {
  const malformed = validText.replace('"risks":', ',"risks":');
  let calls = 0;
  await assert.rejects(generateValidatedReport({ version: "v1", system: "Research.", prompt: sourceRequest, generate: async () => { calls++; return result(malformed); } }), ReportContractError);
  assert.equal(calls, 1);
  calls = 0;
  await assert.rejects(generateValidatedReport({ version: "v2", system: "Research.", prompt: sourceRequest, generate: async () => { calls++; return result(malformed); } }), (error: unknown) => {
    assert.ok(error instanceof ReportContractError);
    assert.equal(error.attempts.length, 2);
    assert.equal(error.repairAttempts, 1);
    return true;
  });
  assert.equal(calls, 2);
});

test("a spent deadline or provider error cannot trigger an unbounded retry", async () => {
  let calls = 0;
  await assert.rejects(generateValidatedReport({ version: "v2", system: "Research.", prompt: sourceRequest, deadlineAt: 500, now: () => 1000, generate: async () => { calls++; return result(validText); } }), ReportContractError);
  assert.equal(calls, 0);
  await assert.rejects(generateValidatedReport({ version: "v2", system: "Research.", prompt: sourceRequest, generate: async () => { calls++; throw new Error("Provider unavailable"); } }), ReportContractError);
  assert.equal(calls, 1);
});

test("a first response that exhausts the deadline cannot start a corrective model call", async () => {
  let clock = 0, calls = 0;
  await assert.rejects(generateValidatedReport({ version: "v2", system: "Research.", prompt: sourceRequest, deadlineAt: 70000, now: () => clock,
    generate: async () => { calls++; clock = 70000; return result("invalid JSON"); } }), (error: unknown) => {
    assert.ok(error instanceof ReportContractError);
    assert.equal(error.repairAttempts, 0);
    return true;
  });
  assert.equal(calls, 1);
});

test("format repair cannot establish the truth of an unsupported financial value", async () => {
  let calls = 0;
  const unsupported = { ...validMemo, strengths: [{ text: "$900M ARR is verified.", sourceIds: ["volt-financials"], confidence: "high", metric: { key: "arr", value: 900000000 } }] };
  const repaired = await generateValidatedReport({ version: "v2", system: "Research.", prompt: sourceRequest, generate: async () => result(++calls === 1 ? "not JSON" : JSON.stringify(unsupported)) });
  assert.equal(repaired.attempts[1].valid, true);
  const normalize = (claims: typeof repaired.output.strengths) => claims.map((claim) => ({ ...claim, metric: claim.metric ?? undefined }));
  assert.equal(evaluateGrounding({ ...repaired.output, strengths: normalize(repaired.output.strengths), risks: normalize(repaired.output.risks) }, getEvidence("voltgrid")).passed, false);
});

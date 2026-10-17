import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_THESIS, EVIDENCE, STARTUPS, getEvidence } from "../src/lib/data";
import { buildEvaluation, evaluateGrounding } from "../src/lib/evaluation";
import { matchStartup, rankStartups, validateAllocation } from "../src/lib/matching";
import { researchRequestSchema } from "../src/lib/validation";
import type { CitedClaim, ResearchResult } from "../src/lib/types";

const volt = STARTUPS.find((startup) => startup.id === "voltgrid")!;
const atlas = STARTUPS.find((startup) => startup.id === "atlas")!;
const report = (claim: CitedClaim, summary = "A fictional company requiring independent diligence."): Pick<ResearchResult, "summary" | "strengths" | "risks"> => ({ summary, strengths: [claim], risks: [] });

test("the ARR regression detects conflation and validates the corrected memo on identical evidence", () => {
  const comparison = buildEvaluation();
  assert.equal(comparison.runs[0].passed, false);
  assert.ok(comparison.runs[0].findings.some((finding) => finding.rule === "arr_semantics" && !finding.passed));
  assert.equal(comparison.runs[1].score, 100);
  assert.equal(comparison.runs[1].passed, true);
});

test("correct metric metadata cannot hide contradictory prose", () => {
  const result = evaluateGrounding(report({ text: "VoltGrid has $840K ARR.", sourceIds: ["volt-financials"], confidence: "high", metric: { key: "arr", value: 620000 } }), getEvidence("voltgrid"));
  assert.equal(result.passed, false);
  assert.ok(result.findings.some((finding) => finding.rule === "arr_semantics" && !finding.passed));
});

test("a genuine citation cannot launder invented financial numbers or a missing typed metric", () => {
  for (const text of [
    "VoltGrid has $900 million revenue.", "Annual revenue is 900 million.", "Revenue grew 999% year over year.",
    "The company has 999 months of cash runway.", "There are 999 paying customers.",
    "Gross margin is 99%.", "The valuation is $900 million.",
    "Its largest customer generates 99% of revenue.", "We project $900 million of upside.",
  ]) {
    const result = evaluateGrounding(report({ text, sourceIds: ["volt-financials", "volt-update", "volt-risk"], confidence: "high" }), getEvidence("voltgrid"));
    assert.equal(result.passed, false, text);
  }
});

test("financial fabrications in a summary are checked independently of valid claim fields", () => {
  const result = evaluateGrounding(report({ text: "$620K ARR is founder-reported.", sourceIds: ["volt-financials"], confidence: "medium", metric: { key: "arr", value: 620000 } }, "VoltGrid has $900 million annual revenue and 999% growth."), getEvidence("voltgrid"));
  assert.equal(result.passed, false);
});

test("actual live-smoke phrasing accepts sourced services, fundraising, and a rounded derived revenue share", () => {
  const summary = "VoltGrid's ARR is $620,000. Total trailing 12-month revenue is $840,000, which adds $220,000 of one-time installation and services revenue. ARR is about 74% of revenue. It is raising $2M at an indicative $12M valuation.";
  const base = report({ text: "Gross margin of 71% is founder-reported.", sourceIds: ["volt-financials"], confidence: "medium", metric: { key: "grossMarginPct", value: 71 } }, summary);
  assert.equal(evaluateGrounding(base, getEvidence("voltgrid")).passed, true);
  assert.equal(evaluateGrounding({ ...base, summary: summary.replace("74%", "90%") }, getEvidence("voltgrid")).passed, false);
});

test("citations from another company, nonexistent sources, and missing citations fail", () => {
  for (const sourceIds of [["bridge-financials"], ["invented-document"], []]) {
    assert.equal(evaluateGrounding(report({ text: "Revenue is founder-reported.", sourceIds, confidence: "medium" }), getEvidence("voltgrid")).passed, false);
  }
});

test("numeric grounding requires the cited document itself to contain the field", () => {
  const result = evaluateGrounding(report({ text: "$620K ARR is reported.", sourceIds: ["volt-risk"], confidence: "high", metric: { key: "arr", value: 620000 } }), getEvidence("voltgrid"));
  assert.equal(result.passed, false);
});

test("total-loss disclosures pass while explicit return promises fail", () => {
  const safe = report({ text: "Shares are illiquid and investors may lose all capital.", sourceIds: ["volt-risk"], confidence: "high" });
  assert.equal(evaluateGrounding(safe, getEvidence("voltgrid")).passed, true);
  const unsafe = { ...safe, summary: "This investment guarantees liquidity and guaranteed returns." };
  assert.equal(evaluateGrounding(unsafe, getEvidence("voltgrid")).passed, false);
  assert.equal(evaluateGrounding({ ...safe, summary: "There are no guaranteed returns or liquidity." }, getEvidence("voltgrid")).passed, true);
});

test("an empty research report cannot score a grounding pass", () => {
  assert.equal(evaluateGrounding({ summary: "", strengths: [], risks: [] }, getEvidence("voltgrid")).passed, false);
});

test("a change in the investor's industries and stages changes the leading match", () => {
  const ranked = rankStartups({ ...DEFAULT_THESIS, industries: ["Local business"], stages: ["Small business"] });
  assert.equal(ranked[0].startup.id, "goodharvest");
  assert.ok(ranked[0].score > ranked.find((item) => item.startup.id === "atlas")!.score);
});

test("short horizons, conservative risk, and inadequate concentration room create visible blockers", () => {
  const short = matchStartup(atlas, { ...DEFAULT_THESIS, horizonYears: 2, riskAppetite: "conservative", budget: 100, maxAllocationPct: 10 });
  const long = matchStartup(atlas, { ...DEFAULT_THESIS, horizonYears: 10, riskAppetite: "adventurous", budget: 10000 });
  assert.ok(short.score < long.score);
  assert.ok(short.blockers.some((item) => item.includes("time horizon")));
  assert.ok(short.blockers.some((item) => item.includes("concentration")));
  assert.ok(short.blockers.some((item) => item.includes("total loss")));
});

test("duplicate positions cannot bypass a per-company concentration limit", () => {
  const result = validateAllocation([{ startupId: volt.id, amount: 600 }, { startupId: volt.id, amount: 600 }], DEFAULT_THESIS);
  assert.equal(result.total, 1200);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.includes("concentration")));
});

test("allocation checks budget, minimum checks, unknown companies, and invalid amounts", () => {
  assert.equal(validateAllocation([{ startupId: volt.id, amount: 500 }], DEFAULT_THESIS).valid, true);
  assert.equal(validateAllocation([{ startupId: volt.id, amount: 10 }], DEFAULT_THESIS).valid, false);
  assert.equal(validateAllocation([{ startupId: volt.id, amount: 20000 }], DEFAULT_THESIS).valid, false);
  assert.equal(validateAllocation([{ startupId: "unknown", amount: 500 }], DEFAULT_THESIS).valid, false);
  assert.equal(validateAllocation([{ startupId: volt.id, amount: NaN }], DEFAULT_THESIS).valid, false);
  assert.equal(validateAllocation([{ startupId: volt.id, amount: -10 }], DEFAULT_THESIS).valid, false);
});

test("untrusted API input cannot set impossible risk or allocation preferences", () => {
  assert.equal(researchRequestSchema.safeParse({ startupId: volt.id, thesis: DEFAULT_THESIS }).success, true);
  for (const changed of [{ budget: -500 }, { maxAllocationPct: 101 }, { riskAppetite: "risk-free" }, { industries: ["made up"] }, { horizonYears: 0 }, { thesis: "x".repeat(2001) }]) {
    assert.equal(researchRequestSchema.safeParse({ startupId: volt.id, thesis: { ...DEFAULT_THESIS, ...changed } }).success, false);
  }
});

test("every company has its own complete source pack with correct financial field values", () => {
  assert.equal(new Set(EVIDENCE.map((item) => item.id)).size, EVIDENCE.length);
  for (const startup of STARTUPS) {
    const evidence = getEvidence(startup.id);
    assert.equal(evidence.length, 3);
    assert.ok(evidence.every((item) => startup.evidenceIds.includes(item.id) && item.excerpt.includes("FICTIONAL")));
    const financial = evidence.find((item) => item.type === "Financials")!;
    assert.equal(financial.metrics.arr, startup.arr);
    assert.equal(financial.metrics.annualRevenue, startup.annualRevenue);
    assert.ok(startup.arr <= startup.annualRevenue);
  }
});

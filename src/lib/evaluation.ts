import { getEvidence } from "./data";
import type { CitedClaim, EvaluationFinding, EvaluationResult, Evidence, MetricKey, ResearchResult } from "./types";

type GroundableReport = Pick<ResearchResult, "summary" | "strengths" | "risks">;
const moneyValue = (number: string, suffix = "") => Number(number.replaceAll(",", "")) * (/^m/i.test(suffix) ? 1000000 : /^k|thousand/i.test(suffix) ? 1000 : 1);

type ProseAssertion = { key: MetricKey | "nonRecurringRevenue" | "recurringSharePct"; value: number; start: number; end: number };
function proseAssertions(text: string): ProseAssertion[] {
  const values: ProseAssertion[] = [];
  const add = (pattern: RegExp, key: ProseAssertion["key"], numberGroup = 1, suffixGroup?: number) => {
    for (const match of text.matchAll(pattern)) {
      let resolvedKey = key;
      if (key === "annualRevenue") {
        const prefix = text.slice(Math.max(0, match.index! - 80), match.index);
        const suffix = text.slice(match.index! + match[0].length);
        const qualifiedSubscriptionLabel = /\b(?:recurring(?:\s+(?:subscription|platform))?|subscription)\s+$/i.test(prefix);
        const explicitlyAnnualOrTotal = /\b(?:annual|total|trailing|TTM)\b/i.test(match[0]);
        // The same amount in "subscription revenue of $N ARR" is explicitly
        // ARR, not a second assertion of total annual revenue. Subscription
        // revenue without that ARR qualification is not assumed to be ARR.
        if (qualifiedSubscriptionLabel && !explicitlyAnnualOrTotal && /^\s*ARR\b/i.test(suffix)) continue;
      }
      if (key === "customerConcentrationPct") {
        const prefix = text.slice(Math.max(0, match.index! - 100), match.index).split(/[.;!?]/).at(-1) || "";
        if (/\bARR\b|recurring/i.test(prefix)) resolvedKey = "recurringSharePct";
        else if (!/customer|operator|largest|concentration|contribut|account/i.test(prefix)) continue;
      }
      values.push({ key: resolvedKey, value: moneyValue(match[numberGroup], suffixGroup ? match[suffixGroup] : ""), start: match.index!, end: match.index! + match[0].length });
    }
  };
  const amount = "(?:\\$\\s*)?(\\d+(?:,\\d{3})*(?:\\.\\d+)?)\\s*(million|thousand|[km])?";
  for (const [key, label] of [
    ["arr", "(?:ARR|annual recurring revenue)"],
    ["annualRevenue", "(?:(?:total|annual|trailing(?: 12-month)?|TTM)\\s+)*(?<!recurring )revenue"],
    ["valuation", "(?:indicative\\s+)?valuation"],
    ["fundingTarget", "(?:funding target|round target|raising)"],
    ["nonRecurringRevenue", "(?:one-time|non-recurring|nonrecurring)(?:\\s+(?:installation|services|revenue|and)){0,4}"],
  ] as const) {
    add(new RegExp(`${amount}\\s*(?:(?:in|is|of)\\s+)?${label}\\b`, "gi"), key, 1, 2);
    add(new RegExp(`\\b${label}(?:\\s+(?:is|of|at|was|:|stands at))?\\s*${amount}`, "gi"), key, 1, 2);
  }
  add(/\b(\d[\d,.]*)\s*%\s*(?:(?:year[- ]over[- ]year|annual|YoY|revenue)\s+){0,3}(?:revenue\s+)?growth\b/gi, "growthPct");
  add(/\b(?:revenue\s+)?(?:grew|growth(?:\s+is|\s+of|:)?|grown(?:\s+by)?)\s*(\d[\d,.]*)\s*%/gi, "growthPct");
  add(/\b(\d[\d,.]*)\s*%\s+year[- ]over[- ]year\b/gi, "growthPct");
  add(/\b(\d[\d,.]*)\s*(?:reported\s+)?months?\s*(?:of\s+)?(?:(?:reported|cash|operating)\s+){0,2}runway\b/gi, "runwayMonths");
  add(/\brunway(?:\s+(?:is|of|:))?\s*(\d[\d,.]*)\s*months?/gi, "runwayMonths");
  add(/\b(\d[\d,.]*)\s*(?:(?:paying|active|business|battery|partner|clinic)\s+){0,3}(?:customers?|operators?|teams?|clinics?|households?|brands?)\b/gi, "customers");
  add(/\b(\d[\d,.]*)\s*%\s*(?:reported\s+)?gross\s+margin\b/gi, "grossMarginPct");
  add(/\bgross\s+margin(?:\s+(?:is|of|was|:))?\s*(\d[\d,.]*)\s*%/gi, "grossMarginPct");
  add(/\b(\d[\d,.]*)\s*%\s+of\s+(?:total\s+)?revenue\b/gi, "customerConcentrationPct");
  add(/\bconcentration(?:\s+(?:is|of|:))?\s*(\d[\d,.]*)\s*%/gi, "customerConcentrationPct");
  return values;
}

function expectedValues(key: ProseAssertion["key"], sources: Evidence[]): number[] {
  return sources.flatMap((source) => {
    if (key === "nonRecurringRevenue") return source.metrics.annualRevenue !== undefined && source.metrics.arr !== undefined ? [source.metrics.annualRevenue - source.metrics.arr] : [];
    if (key === "recurringSharePct") return source.metrics.annualRevenue && source.metrics.arr !== undefined ? [source.metrics.arr / source.metrics.annualRevenue * 100] : [];
    return source.metrics[key] === undefined ? [] : [source.metrics[key]!];
  });
}

function inspectProse(text: string, sources: Evidence[]): EvaluationFinding[] {
  const assertions = proseAssertions(text);
  const findings: EvaluationFinding[] = assertions.map(({ key, value }) => {
    const expected = expectedValues(key, sources);
    const passed = expected.some((expectedValue) => key === "recurringSharePct" ? Math.abs(expectedValue - value) <= 0.51 : expectedValue === value);
    return { claim: text, rule: key === "arr" ? "arr_semantics" : "financial_prose_grounding", passed,
      explanation: passed ? `Written ${key}=${value} matches the cited field.` : `The prose claims ${key}=${value}; cited ${key} is ${expected.length ? expected.join(", ") : "not reported"}. Correct structured metadata cannot override contradictory prose.` };
  });
  // Reject unknown money/percentage assertions instead of silently treating them as grounded.
  // Dates, holding horizons, and numbered questions are intentionally outside this financial detector.
  const financialTokens = /\$\s*\d+(?:,\d{3})*(?:\.\d+)?(?:\s*(?:million|thousand|[km])\b)?|\b\d+(?:,\d{3})*(?:\.\d+)?\s*%|\b\d+(?:,\d{3})*(?:\.\d+)?\s*(?:million|thousand)\b/gi;
  for (const token of text.matchAll(financialTokens)) {
    const start = token.index!, end = start + token[0].trimEnd().length;
    if (!assertions.some((assertion) => assertion.start <= start && assertion.end >= end)) findings.push({ claim: text, rule: "financial_numeric_coverage", passed: false, explanation: `The financial number “${token[0].trim()}” has no verifiable metric context. Name the exact financial field and cite evidence for it.` });
  }
  return findings;
}

function inspectClaim(claim: CitedClaim, evidence: Evidence[]): EvaluationFinding[] {
  const sources = evidence.filter((source) => claim.sourceIds.includes(source.id));
  const findings: EvaluationFinding[] = [{
    claim: claim.text, rule: "citation_integrity", passed: claim.sourceIds.length > 0 && sources.length === new Set(claim.sourceIds).size,
    explanation: sources.length && sources.length === new Set(claim.sourceIds).size ? "All cited document IDs exist in this company's evidence pack." : "Each claim needs a citation from this company's evidence pack.",
  }];
  if (claim.metric) {
    const { key, value } = claim.metric;
    const expected = sources.flatMap((source) => source.metrics[key] === undefined ? [] : [source.metrics[key]!]);
    const passed = expected.some((sourceValue) => Math.abs(sourceValue - value) < 0.000001);
    findings.push({ claim: claim.text, rule: "financial_metric_grounding", passed, explanation: passed ? `${key}=${value} matches the cited financial field.` : `${key}=${value} is unsupported. Cited ${key}: ${expected.length ? expected.join(", ") : "not reported"}. Revenue, ARR, and payment volume are distinct fields.` });
  }
  findings.push(...inspectProse(claim.text, sources));
  return findings;
}

/** Deterministic domain evaluator. This checks citations and exact financial semantics;
 * it does not claim to establish the truth of unaudited source documents. */
export function evaluateGrounding(report: GroundableReport, evidence: Evidence[]): { score: number; passed: boolean; findings: EvaluationFinding[] } {
  const claims = [...report.strengths, ...report.risks];
  const findings = claims.flatMap((claim) => inspectClaim(claim, evidence));
  findings.push(...inspectProse(report.summary, evidence));
  const text = `${report.summary} ${claims.map((claim) => claim.text).join(" ")}`;
  const guarantee = [...text.matchAll(/\b(?:guaranteed returns?|risk[- ]free investment|will return \d|will earn \d|guarantees? (?:profit|liquidity|returns?))\b/gi)].some((match) => {
    const prefix = text.slice(Math.max(0, match.index! - 45), match.index).split(/[.;!?]/).at(-1) || "";
    return !/\b(?:no|not|never|without)\b/i.test(prefix);
  });
  findings.push({ claim: "Risk language", rule: "no_return_promises", passed: !guarantee, explanation: guarantee ? "The report promises an outcome unsupported by private-market evidence." : "No return or liquidity promise detected." });
  if (!claims.length) findings.push({ claim: "Research content", rule: "nonempty_evidence", passed: false, explanation: "A report without evidence-backed claims cannot pass." });
  const passedCount = findings.filter((finding) => finding.passed).length;
  return { score: Math.round(passedCount / findings.length * 100), passed: findings.every((finding) => finding.passed), findings };
}

export function buildEvaluation(): EvaluationResult {
  const evidence = getEvidence("voltgrid");
  const v1: GroundableReport = {
    summary: "VoltGrid has $840K ARR and 68% annual revenue growth, making it worth researching for a climate-focused investor.",
    strengths: [
      { text: "Annual recurring revenue is $840,000, supporting the recurring-revenue thesis.", sourceIds: ["volt-financials"], confidence: "high", metric: { key: "arr", value: 840000 } },
      { text: "Revenue grew 68% year over year.", sourceIds: ["volt-financials"], confidence: "high", metric: { key: "growthPct", value: 68 } },
    ],
    risks: [{ text: "The three largest operators account for 46% of revenue.", sourceIds: ["volt-risk"], confidence: "high", metric: { key: "customerConcentrationPct", value: 46 } }],
  };
  const v2: GroundableReport = {
    summary: "VoltGrid reports $620K ARR within $840K total annual revenue. The remaining $220K is one-time services; all figures are fictional and unaudited.",
    strengths: [
      { text: "ARR is $620,000; recurring subscriptions are separated from one-time services.", sourceIds: ["volt-financials"], confidence: "medium", metric: { key: "arr", value: 620000 } },
      { text: "Revenue grew 68% year over year, as reported by the founder.", sourceIds: ["volt-financials"], confidence: "medium", metric: { key: "growthPct", value: 68 } },
    ],
    risks: [{ text: "The three largest operators account for 46% of revenue. Shares are illiquid and total loss is possible.", sourceIds: ["volt-risk"], confidence: "high", metric: { key: "customerConcentrationPct", value: 46 } }],
  };
  const first = evaluateGrounding(v1, evidence);
  const second = evaluateGrounding(v2, evidence);
  return {
    id: `regression-${Date.now()}`, dataset: "ARR vs. annual revenue · regression fixture (replay)",
    input: "Assess VoltGrid for a climate-focused investor seeking recurring revenue. Use the financial snapshot, operating update, and risk disclosure.",
    startupId: "voltgrid", rootCause: "The v1 regression fixture confuses $840K trailing annual revenue with ARR. The financial snapshot explicitly separates $620K subscriptions from $220K one-time services.",
    fix: "V2 separates metric fields, requires claim-level citations, checks the numbers against the exact cited field, and blocks unsupported claims before presenting a memo.",
    runs: [
      { version: "v1", label: "Before · revenue / ARR conflation", report: v1, ...first, latencyMs: 0 },
      { version: "v2", label: "After · citation & metric validation", report: v2, ...second, latencyMs: 0 },
    ], evidence, improvement: second.score - first.score, traceId: "",
  };
}

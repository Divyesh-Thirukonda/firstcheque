import { readFile, writeFile } from "node:fs/promises";
import { buildEvaluation, evaluateGrounding } from "../src/lib/evaluation";
import { getEvidence } from "../src/lib/data";
import type { ResearchResult } from "../src/lib/types";

async function main() {
  const files = process.argv.slice(2);
  if (!files.length) {
    const fixture = buildEvaluation();
    console.log(JSON.stringify({ type: "deterministic regression fixture, not a live baseline", dataset: fixture.dataset, runs: fixture.runs.map(({ version, score, passed, findings }) => ({ version, score, passed, failures: findings.filter((finding) => !finding.passed) })), improvement: fixture.improvement }, null, 2));
    return;
  }
  const batches = await Promise.all(files.map(async (file) => JSON.parse(await readFile(file, "utf8"))));
  const summary = batches.map((batch) => ({
    version: batch.version, session: batch.session,
    cases: batch.results.map((entry: { caseId: string; report?: ResearchResult; rawModelOutput?: string; input: { startupId: string } }) => {
      let evaluation;
      try { evaluation = entry.rawModelOutput ? evaluateGrounding(JSON.parse(entry.rawModelOutput.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")), getEvidence(entry.input.startupId)) : null; } catch { evaluation = null; }
      return { caseId: entry.caseId, traceId: entry.report?.traceId, live: Boolean(entry.rawModelOutput), score: evaluation?.score ?? null, passed: evaluation?.passed ?? false, failures: evaluation?.findings.filter((finding) => !finding.passed) ?? [] };
    }),
  }));
  const output = { generatedAt: new Date().toISOString(), type: "actual Nicrron outputs; exact financial-field evaluator", versions: summary.map((batch) => ({ ...batch, total: batch.cases.length, live: batch.cases.filter((entry: { live: boolean }) => entry.live).length, passRate: batch.cases.filter((entry: { passed: boolean }) => entry.passed).length / batch.cases.length, meanScore: batch.cases.reduce((sum: number, entry: { score: number | null }) => sum + (entry.score ?? 0), 0) / batch.cases.length })) };
  await writeFile("work/live-evaluation-summary.json", JSON.stringify(output, null, 2));
  console.log(JSON.stringify(output.versions.map(({ cases: _, ...rest }) => rest), null, 2));
}
main().catch((error) => { console.error(error); process.exitCode = 1; });

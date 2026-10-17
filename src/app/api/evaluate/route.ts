import { NextResponse } from "next/server";
import { buildEvaluation } from "@/lib/evaluation";
import { emitResearchTrace } from "@/lib/telemetry";

export const runtime = "nodejs";
export async function POST() {
  const result = buildEvaluation();
  const telemetry = await emitResearchTrace({
    sessionId: "firstcheque-regression-replay", input: result.input, output: JSON.stringify(result), model: "deterministic-regression-fixture",
    latencyMs: 1, promptVersion: "v2", startupId: "voltgrid",
    steps: [
      { name: "Load identical fictional source pack", kind: "retrieval", output: JSON.stringify(result.evidence), latencyMs: 1 },
      ...result.runs.map((run) => ({ name: `Replay ${run.version} regression fixture`, kind: "evaluator", input: JSON.stringify(run.report), output: JSON.stringify(run.findings), latencyMs: 1 })),
    ],
  });
  result.traceId = telemetry.traceId;
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}

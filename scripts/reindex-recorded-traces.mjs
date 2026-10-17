#!/usr/bin/env node
/** Correct PRISM display/evaluator binding from recorded artifacts. NEVER calls a model. */
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { basename } from "node:path";
try { process.loadEnvFile(".env.local"); } catch { /* Environment may already be supplied. */ }
const file = process.argv[2] || "work/live-baseline-firstcheque-frozen-v1-20261017.json";
const rawLedger = await readFile(file, "utf8");
const ledger = JSON.parse(rawLedger);
if (ledger.version !== "v1" || ledger.liveOnly !== true || ledger.actualCalls !== 50) throw new Error("Requires the preserved50-response v1 ledger.");
const hash = text => createHash("sha256").update(text).digest("hex");
const ledgerHash = hash(rawLedger);
const { PRISMTRACE_HOST: host, PRISMTRACE_API_KEY: key, PRISMTRACE_PROJECT_ID: project } = process.env;
if (!host || !key || !project) throw new Error("PRISM environment is not configured.");
async function request(path, body) {
  const r = await fetch(host.replace(/\/$/, "") + path, { method: body ? "POST" : "GET", headers: { "X-PRISMtrace-Key": key, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`PRISM ${path.split("?")[0]} returned ${r.status}`);
  return r.json();
}
const proofFile = "work/prism-v1-reindex-proof.json";
const proof = { version: "v1", sourceHead: ledger.sourceHead, sourceLedger: basename(file), sourceLedgerSha256: ledgerHash, modelCallsAdded: 0, existingTraceCount: 50, results: [] };
let next = 0;
await Promise.all(Array.from({ length: 3 }, async () => {
  while (next < ledger.results.length) {
    const r = ledger.results[next++];
    const id = r.report?.traceId || r.traceId;
    if (!id || !r.rawModelOutput || !r.prompt?.system || !r.prompt?.prompt) throw new Error(`${r.caseId} is missing captured artifacts.`);
    const t = await request(`/api/traces/${id}?project_id=${project}`);
    const beforeLlmSpans = t.db_spans.filter(s => s.span_type === "llm").length;
    const input = `SYSTEM INSTRUCTIONS (exact):\n${r.prompt.system}\n\nMODEL REQUEST INCLUDING SOURCE PACK AND RETRIEVAL (exact):\n${r.prompt.prompt}`;
    const failed = r.status === "error";
    const existing = t.metadata?.normalization_ledger_sha256 === ledgerHash && t.output_message === r.rawModelOutput && t.metadata?.captured_model_input === input;
    let ack = { trace_created: false, spans_ingested: 0, resumed: true };
    if (!existing) {
      const spans = t.db_spans;
      const parent = { span_id: t.trace_id.replaceAll("-", "").slice(0, 12) + "fffc", name: "Recorded research run · normalization repair", span_type: "chain", start_time: spans.map(s => s.start_time).sort()[0], end_time: spans.map(s => s.end_time || s.start_time).sort().at(-1), duration_ms: t.latency_ms, input_text: input, output_text: r.rawModelOutput, status: failed ? "error" : "ok", model: t.model, ...(failed ? { error_message: r.error } : {}), token_count_input: t.token_count_input || 0, token_count_output: t.token_count_output || 0, metadata: { origin_trace_id: id, artifact_reindex: true, model_calls_added: 0 } };
      ack = await request("/api/spans/ingest", { project_id: project, trace_id: id, session_id: r.input.sessionId, spans: [parent], metadata: { agent_id: process.env.PRISM_AGENT_ID || "firstcheque-analyst", agent_name: "FirstCheque v1", prompt_version: "v1", status: failed ? "error" : "success", error: failed ? r.error : null, error_message: failed ? r.error : null, captured_model_input: input, captured_model_input_length: input.length, normalization_fix: "first_span_root_and_exact_input", normalization_ledger_sha256: ledgerHash, normalization_source_head: ledger.sourceHead, origin_trace_id: id, model_calls_added: 0 } });
      if (ack.trace_created !== false || ack.spans_ingested !== 1) throw new Error(`${r.caseId} did not confirm a root-only existing-trace repair.`);
    }
    const after = await request(`/api/traces/${id}?project_id=${project}`);
    const displayed = after.input_messages[0]?.content || "";
    const sources = JSON.parse(r.prompt.prompt).sourcePack;
    const row = { caseId: r.caseId, traceId: id, callerTraceId: t.trace_id, modelCallsAdded: 0, outputByteEqual: after.output_message === r.rawModelOutput, displayedInputIsExactPrefix: input.startsWith(displayed), fullInputMetadataByteEqual: after.metadata?.captured_model_input === input, allSourceExcerptsInDisplayedInput: sources.every(source => displayed.includes(source.excerpt)), llmSpansUnchanged: after.db_spans.filter(s => s.span_type === "llm").length === beforeLlmSpans, outputSha256: hash(r.rawModelOutput), capturedInputSha256: hash(input), displayedInputCharacters: displayed.length, actualInputCharacters: input.length, traceCreated: ack.trace_created, resumed: Boolean(ack.resumed), contractValid: !failed };
    if (![row.outputByteEqual, row.displayedInputIsExactPrefix, row.fullInputMetadataByteEqual, row.allSourceExcerptsInDisplayedInput, row.llmSpansUnchanged].every(Boolean)) throw new Error(`${r.caseId} artifact readback mismatch.`);
    proof.results.push(row);
    if (proof.results.length % 10 === 0) console.log(`${proof.results.length}/50 recorded traces repaired; no model calls added.`);
  }
}));
proof.results.sort((a, b) => a.caseId.localeCompare(b.caseId));
proof.completedAt = new Date().toISOString();
await writeFile(proofFile, JSON.stringify(proof, null, 2) + "\n");
console.log(`Verified50 existing trace repairs; modelCallsAdded=0. Evidence: ${proofFile}`);

import "server-only";

/** Proposal contents can be private. Trace only operation metadata, never notes, amounts, names or audio. */
export async function traceProposalOperation(input: {
  operation: "speech-preview" | "extract-terms";
  started: number;
  model: string;
  success: boolean;
  inputTokens?: number;
  outputTokens?: number;
  fields?: string[];
  rejected?: number;
  sample?: boolean;
}) {
  const runId = crypto.randomUUID(),
    project = process.env.PRISMTRACE_PROJECT_ID,
    key = process.env.PRISMTRACE_API_KEY;
  if (!project || !key) return { recorded: false, id: runId };
  const host = (
    process.env.PRISMTRACE_HOST || "https://api.prism.blockconvey.com"
  ).replace(/\/$/, "");
  const metadata = {
    product: "Seed Street",
    flow: "investor-proposal",
    operation: input.operation,
    data_classification: "private-content-redacted",
    sample: !!input.sample,
    execution_mode: input.success ? "live" : "error",
    source_kind: input.sample
      ? "synthetic-rehearsal"
      : "investor-notes-or-script",
    model_calls: input.operation === "extract-terms" ? 1 : 0,
    success: input.success,
    fields: input.fields || [],
    rejected: input.rejected || 0,
  };
  const send = async (path: string, body: unknown) => {
    const response = await fetch(`${host}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-PRISMtrace-Key": key },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("Trace ingest unavailable");
    return response.json();
  };
  try {
    const end = Date.now(),
      root = runId.replaceAll("-", "").slice(0, 16),
      output = JSON.stringify(metadata);
    const record = await send("/api/traces", {
      project_id: project,
      trace_id: runId,
      agent_id: "seed-street-investor-proposals",
      agent_name: "Seed Street investor proposals",
      session_id: runId,
      model: input.model,
      input_messages: [
        {
          role: "user",
          content: "Private proposal content redacted before telemetry",
        },
      ],
      output_message: output,
      latency_ms: end - input.started,
      token_count_input: input.inputTokens || 0,
      token_count_output: input.outputTokens || 0,
      is_demo: false,
      metadata,
    });
    const id = record.id || record.trace_id;
    if (typeof id !== "string") throw new Error("Missing trace id");
    const span = (
      name: string,
      spanId: string,
      type: string,
      parent?: string,
    ) => ({
      name,
      span_id: spanId,
      ...(parent ? { parent_span_id: parent } : {}),
      span_type: type,
      start_time: new Date(input.started).toISOString(),
      end_time: new Date(end).toISOString(),
      duration_ms: end - input.started,
      input_text: "Private content redacted",
      output_text: output,
      status: input.success ? "ok" : "error",
      model: input.model,
    });
    const spans = [
      span("Investor proposal workflow", root, "chain"),
      span(
        input.operation === "extract-terms"
          ? "Extract transcript terms with Nicrron"
          : "Generate ElevenLabs speech preview",
        root + "01",
        input.operation === "extract-terms" ? "llm" : "tool",
        root,
      ),
      ...(input.operation === "extract-terms"
        ? [
            span(
              "Ground each term in a verbatim note passage",
              root + "02",
              "evaluator",
              root,
            ),
          ]
        : []),
    ];
    const ack = await send("/api/spans/ingest", {
      project_id: project,
      trace_id: id,
      session_id: runId,
      spans,
      metadata: { agent_id: "seed-street-investor-proposals" },
    });
    return {
      recorded: ack.success === true && ack.spans_ingested === spans.length,
      id,
    };
  } catch {
    return { recorded: false, id: runId };
  }
}

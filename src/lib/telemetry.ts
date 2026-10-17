import 'server-only';

export type ResearchTraceStep = {
  name: string; kind?: string; input?: string; output?: string;
  latencyMs?: number; status?: string; model?: string;
};
export type ResearchTraceInput = {
  sessionId: string; traceId?: string; input: string; output: string; model: string;
  latencyMs: number; steps: ResearchTraceStep[]; promptVersion?: string; startupId?: string; error?: string;
  tokenCountInput?: number; tokenCountOutput?: number;
  repairAttempts?: number; modelCalls?: number; deliveredMode?: "live" | "replay" | "error";
};
const host = () => (process.env.PRISMTRACE_HOST || 'https://api.prism.blockconvey.com').replace(/\/$/, '');
const config = () => ({ key: process.env.PRISMTRACE_API_KEY, project: process.env.PRISMTRACE_PROJECT_ID });
export const prismConfigured = () => Boolean(config().key && config().project);

async function prismRequest(path: string, body?: unknown) {
  const {key, project} = config();
  if (!key || !project) throw new Error('PRISM credentials are not configured');
  const response = await fetch(`${host()}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', 'X-PRISMtrace-Key': key },
    ...(body === undefined ? {} : {body: JSON.stringify(body)}),
    signal: AbortSignal.timeout(12000), cache: 'no-store',
  });
  if (!response.ok) throw new Error(`PRISM ${response.status}: ${response.statusText}`);
  return response.json();
}

export async function retrievePrismEvidence(query: string, agentId = process.env.PRISM_AGENT_ID || 'firstcheque-analyst'):
Promise<{text: string; documents?: unknown[]; ok: boolean; error?: string}> {
  if (!prismConfigured()) return {ok:false, text:'', error:'PRISM is not configured'};
  try {
    const result = await prismRequest('/api/knowledge-base/search', {
      project_id:config().project, agent_id:agentId, query, limit:5,
    });
    const documents = Array.isArray(result) ? result : result.results || result.documents || result.chunks || [];
    return {ok:true, text:JSON.stringify(result).slice(0,18000), documents};
  } catch (error) { return {ok:false,text:'',error:error instanceof Error ? error.message : 'Knowledge base unavailable'}; }
}

/** Awaited HTTP ingest keeps spans alive on serverless. Failed tracing never masks research failures. */
export async function emitResearchTrace(input: ResearchTraceInput): Promise<{ok:boolean;traceId:string;error?:string}> {
  const traceId = input.traceId || crypto.randomUUID();
  if (!prismConfigured()) return {ok:false,traceId,error:'PRISM is not configured'};
  const started = Date.now() - input.latencyMs;
  const isReplay = input.model.startsWith('deterministic-');
  try {
    const result = await prismRequest('/api/traces', {
      project_id: config().project, trace_id: traceId,
      agent_id: process.env.PRISM_AGENT_ID || 'firstcheque-analyst',
      agent_name: isReplay ? 'FirstCheque replay' : `FirstCheque ${input.promptVersion || 'v2'}`,
      session_id:input.sessionId, model:input.model,
      input_messages:[{role:'user',content:input.input}],output_message:input.output,
      latency_ms:Math.round(input.latencyMs),
      token_count_input:input.tokenCountInput || 0, token_count_output:input.tokenCountOutput || 0,
      is_demo:isReplay,
      metadata:{product:'FirstCheque',environment:'hackathon',prompt_version:input.promptVersion || 'v2',startup_id:input.startupId,
        data_classification:'synthetic',execution_mode:isReplay ? 'replay' : input.error ? 'error' : 'live',delivered_mode:input.deliveredMode,
        repair_attempts:input.repairAttempts ?? 0,model_calls:input.modelCalls ?? 0,
        // Spans normalization limits the displayed input to a 4,000-character
        // prefix. Preserve the exact model request here as well as in the run ledger.
        captured_model_input:input.input,captured_model_input_length:input.input.length,
        ...(input.error ? {error:input.error,status:'error'} : {}),
      },
    });
    // PRISM returns both its database id and the caller's trace_id. Spans accept
    // either; return the canonical stored id so readback addresses the same row.
    const storedId = typeof result.id === 'string' ? result.id : result.trace_id;
    if (typeof storedId !== 'string' || !storedId) throw new Error('PRISM did not return a stored trace id');
    // PRISM normalizes the top-level exchange from the first submitted span.
    // Put the whole run first; a retrieval span here would replace the memo
    // seen by evaluators with the retrieved documents instead.
    const rootSpanId = `${traceId.replaceAll('-','').slice(0,12)}ffff`;
    let cursor = started;
    const children = input.steps.map((step,index) => {
      const duration = Math.max(step.latencyMs || 1,1);
      const start = cursor; cursor += duration;
      return {span_id:`${traceId.replaceAll('-','').slice(0,12)}${index.toString(16).padStart(4,'0')}`,parent_span_id:rootSpanId,
        name:step.name,span_type:step.kind || 'tool',start_time:new Date(start).toISOString(),
        end_time:new Date(start+duration).toISOString(),duration_ms:duration,
        input_text:step.input || '',output_text:step.output || '',status:step.status === 'error' ? 'error' : 'ok',
        ...(step.kind === 'llm' ? {model:step.model || input.model} : {}),
        ...(step.status === 'error' ? {error_message:step.output || input.error || 'Research step failed'} : {}),
      };
    });
    const spans = [{span_id:rootSpanId,name:'FirstCheque research run',span_type:'chain',
      start_time:new Date(started).toISOString(),end_time:new Date().toISOString(),duration_ms:Math.max(1,Math.round(input.latencyMs)),
      input_text:input.input,output_text:input.output,model:input.model,
      status:input.error ? 'error' : 'ok',...(input.error ? {error_message:input.error} : {}),
      token_count_input:input.tokenCountInput || 0,token_count_output:input.tokenCountOutput || 0,
      metadata:{prompt_version:input.promptVersion || 'v2',delivered_mode:input.deliveredMode,output_role:'final_research_memo'},
    },...children];
    const ingested = await prismRequest('/api/spans/ingest',{
      trace_id:storedId,project_id:config().project,session_id:input.sessionId,spans,
      metadata:{agent_id:process.env.PRISM_AGENT_ID || 'firstcheque-analyst',prompt_version:input.promptVersion},
    });
    if (ingested.success !== true || ingested.spans_ingested !== spans.length || ingested.trace_created !== false) {
      throw new Error('PRISM did not confirm all research spans on the existing trace');
    }
    return {ok:true,traceId:storedId};
  } catch(error) { return {ok:false,traceId,error:error instanceof Error ? error.message : 'PRISM ingest failed'}; }
}

export async function getPrismDoctor() {
  if (!prismConfigured()) return {configured:false,live_connected:false};
  try { return {configured:true,...await prismRequest(`/api/setup-doctor?project_id=${encodeURIComponent(config().project!)}`)}; }
  catch(error) {return {configured:true,live_connected:false,error:error instanceof Error ? error.message : 'PRISM doctor unavailable'};}
}

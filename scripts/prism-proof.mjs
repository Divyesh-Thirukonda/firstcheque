#!/usr/bin/env node
/** PRISM proof operations grounded in the authenticated OpenAPI schema. No secrets are logged. */
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { basename, resolve } from "node:path";

const cwd = process.cwd();
for (const file of [".env.local", ".env"]) {
  try {
    for (const line of (await readFile(resolve(cwd, file), "utf8")).split(/\r?\n/)) {
      const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^(["'])(.*)\1$/, "$2");
    }
  } catch (error) { if (error.code !== "ENOENT") throw error; }
}
const host = process.env.PRISMTRACE_HOST;
const projectId = process.env.PRISMTRACE_PROJECT_ID;
const key = process.env.PRISMTRACE_API_KEY;
const agentId = process.env.PRISM_AGENT_ID || "firstcheque-analyst";
if (!host || !projectId || !key) throw new Error("Set PRISMTRACE_HOST, PRISMTRACE_PROJECT_ID and PRISMTRACE_API_KEY in .env.local.");
await mkdir(resolve(cwd, "work"), { recursive: true });
const stateFile = resolve(cwd, "work/prism-proof-state.json");
let state;
try { state = JSON.parse(await readFile(stateFile, "utf8")); } catch { state = { projectId, agentId, documents: [], tasks: {} }; }
if (state.projectId !== projectId) throw new Error("Proof state belongs to a different project. Preserve it before changing projects.");

async function saveState() { await writeFile(stateFile, JSON.stringify(state, null, 2) + "\n"); }
function query(params) { return new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined).map(([name, value]) => [name, String(value)])).toString(); }
async function request(path, { method = "GET", body, form } = {}) {
  const response = await fetch(host.replace(/\/$/, "") + path, {
    method, headers: { "X-PRISMtrace-Key": key, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: form || (body ? JSON.stringify(body) : undefined), signal: AbortSignal.timeout(60000),
  });
  const text = await response.text();
  let data; try { data = JSON.parse(text); } catch { data = { message: text.slice(0, 400) }; }
  if (!response.ok) throw new Error(`PRISM ${method} ${path.split("?")[0]} returned ${response.status}: ${JSON.stringify(data).replaceAll(key, "[redacted]")}`);
  return data;
}
async function snapshot(name, data) {
  const path = resolve(cwd, `work/prism-${name}.json`);
  await writeFile(path, JSON.stringify(data, null, 2) + "\n");
  return path;
}
function requireEvaluator() { if (!state.evaluatorId) throw new Error("Run create-evaluator first."); return state.evaluatorId; }
function requireTask(version) { if (!state.tasks[version]?.id) throw new Error(`Run create-task ${version} first.`); return state.tasks[version].id; }

const rubric = `Evaluate only factual grounding, not whether the company is a good investment.
User input: {input}
Agent answer: {output}
Retrieved source evidence: {context}

Every company-specific number in the answer must appear in the retrieved evidence, or be an explicitly labeled calculation whose input figures appear there. A source citation alone does not support a different number. Do not treat the user's preferences or requested return as company evidence. Unsupported revenue, valuation, growth, runway, concentration, return forecasts or eligibility claims fail. Missing facts should be acknowledged as not disclosed. Prototype companies and documents are synthetic; do not require internet verification of these fixtures. Thesis-fit scores and user-provided paper-allocation amounts are application metadata rather than claims about company financial performance. Label grounded with score 100 only if every factual numerical claim is grounded; otherwise label unsupported with score 0. Identify each unsupported number and the missing evidence in your explanation.`;

const [command = "status", arg, extra] = process.argv.slice(2);
if (command === "status") {
  const [doctor, documents, evaluators] = await Promise.all([
    request(`/api/setup-doctor?${query({ project_id: projectId })}`),
    request(`/api/knowledge-base/documents?${query({ project_id: projectId, agent_id: agentId })}`),
    request(`/api/evaluators?${query({ project_id: projectId })}`),
  ]);
  await snapshot("doctor", doctor);
  console.log(JSON.stringify({ live_connected: doctor.live_connected, blocked_step: doctor.blocked_step, documents: documents.total ?? documents.documents?.length, evaluatorCount: evaluators.evaluators?.length, evaluatorId: state.evaluatorId ?? null }));
} else if (command === "upload-kb") {
  const directory = resolve(cwd, arg || "work/corpus");
  const existing = await request(`/api/knowledge-base/documents?${query({ project_id: projectId })}`);
  const docs = existing.documents || [];
  for (const filename of (await readdir(directory)).filter(file => /\.(txt|md|pdf)$/i.test(file)).sort()) {
    let doc = docs.find(item => [item.filename, item.file_name, item.name, item.title].includes(filename));
    const previous = state.documents.find(item => item.filename === filename);
    if (!doc && previous) doc = docs.find(item => item.id === previous.id);
    if (!doc) {
      const form = new FormData();
      form.append("file", new Blob([await readFile(resolve(directory, filename))], { type: filename.endsWith(".pdf") ? "application/pdf" : "text/plain" }), basename(filename));
      form.append("project_id", projectId); form.append("agent_id", agentId);
      form.append("description", "FirstCheque synthetic company research. Hackathon demonstration data; not a real offering.");
      const result = await request("/api/knowledge-base/documents", { method: "POST", form });
      doc = result.document || result;
      docs.push(doc);
    }
    if (!doc.id) throw new Error(`Upload response for ${filename} has no document id.`);
    const assignment = await request(`/api/kb/documents/${encodeURIComponent(doc.id)}/assign?${query({ project_id: projectId })}`, { method: "PATCH", body: { agent_id: agentId } });
    state.documents = state.documents.filter(item => item.filename !== filename);
    state.documents.push({ filename, id: doc.id, agentId, verifiedAt: new Date().toISOString() });
    await saveState();
    console.log(`KB document assigned: ${filename} (${doc.id})`);
  }
  const verified = await request(`/api/knowledge-base/documents?${query({ project_id: projectId, agent_id: agentId })}`);
  await snapshot("kb-documents", verified);
  console.log(`Assigned-document readback saved; total ${verified.total ?? verified.documents?.length}.`);
} else if (command === "search-kb") {
  const result = await request("/api/knowledge-base/search", { method: "POST", body: { project_id: projectId, agent_id: agentId, query: arg || "What financial evidence and risks are disclosed?", limit: 3 } });
  console.log(`Search result saved: ${await snapshot("kb-search", result)}`);
} else if (command === "create-evaluator") {
  const name = "FirstCheque · Every number has evidence";
  const existing = await request(`/api/evaluators?${query({ project_id: projectId })}`);
  const evaluator = existing.evaluators?.find(item => item.name === name) || await request("/api/evaluators", { method: "POST", body: {
    project_id: projectId, name, type: "llm_judge", category: "custom",
    description: "Company-specific numerical claims must be supported by retrieved evidence. Used unchanged for paired v1/v2 research inputs.",
    template_prompt: rubric, rails: ["grounded", "unsupported"],
  } });
  const record = evaluator.evaluator || evaluator;
  if (!record.id) throw new Error("Evaluator response has no id.");
  state.evaluatorId = record.id; state.evaluatorName = name; state.rubric = rubric; await saveState();
  await snapshot("evaluator", record);
  console.log(`Custom evaluator ready: ${record.id}`);
} else if (command === "create-task") {
  if (!/^v[12]$/.test(arg || "")) throw new Error("Usage: create-task v1|v2 'Exact agent_name'");
  const agentName = extra || `FirstCheque ${arg}`;
  const name = `FirstCheque grounding · ${arg}`;
  const existing = await request(`/api/eval-tasks?${query({ project_id: projectId })}`);
  const all = existing.tasks || existing;
  const task = (Array.isArray(all) && all.find(item => item.name === name && item.evaluator_id === requireEvaluator())) || await request("/api/eval-tasks", { method: "POST", body: {
    project_id: projectId, evaluator_id: requireEvaluator(), name, cadence: "once", sampling_rate: 100, granularity: "trace",
  } });
  const record = task.task || task;
  if (!record.id) throw new Error("Task response has no id.");
  state.tasks[arg] = { id: record.id, agentName }; await saveState();
  console.log(`Task ready: ${arg} ${record.id}, scoped at run time to agent_name=${agentName}`);
} else if (command === "preview" || command === "run-eval") {
  const taskId = requireTask(arg);
  const criteria = { agent_name: state.tasks[arg].agentName, limit: Number(extra || 50), include_scored: true };
  const preview = await request(`/api/eval-tasks/${taskId}/preview?${query(criteria)}`);
  await snapshot(`eval-${arg}-preview`, preview);
  console.log(JSON.stringify(preview));
  if (command === "run-eval") {
    const result = await request(`/api/eval-tasks/${taskId}/run?${query(criteria)}`, { method: "POST" });
    console.log(`Evaluation started: ${await snapshot(`eval-${arg}-started`, result)}`);
  }
} else if (command === "eval-status" || command === "eval-results") {
  const taskId = requireTask(arg);
  const result = command === "eval-status" ? await request(`/api/eval-tasks/${taskId}/status`) : await request(`/api/eval-results?${query({ project_id: projectId, task_id: taskId })}`);
  console.log(`Evaluation evidence saved: ${await snapshot(`eval-${arg}-${command === "eval-status" ? "status" : "results"}`, result)}`);
  if (command === "eval-status") console.log(JSON.stringify(result));
} else if (command === "root-ready" || command === "root-status" || command === "root-clusters") {
  const path = command === "root-ready" ? "/api/intelligence/clusters/analyze/readiness" : command === "root-status" ? "/api/intelligence/clusters/analyze/status" : "/api/intelligence/clusters";
  const result = await request(`${path}?${query({ project_id: projectId })}`);
  console.log(`Root Cause evidence saved: ${await snapshot(command, result)}`);
  if (command !== "root-clusters") console.log(JSON.stringify(result));
} else if (command === "root-run") {
  const traces = await request(`/api/traces?${query({ project_id: projectId, agent_id: agentId, page_size: 100 })}`);
  const count = traces.total ?? traces.total_count ?? traces.traces?.length;
  if (!(count >= 50)) throw new Error(`At least 50 genuine baseline runs are required before Root Cause/fixing; observed ${count ?? "unknown"}.`);
  const ready = await request(`/api/intelligence/clusters/analyze/readiness?${query({ project_id: projectId })}`);
  console.log(JSON.stringify(ready));
  const result = await request("/api/intelligence/clusters/analyze", { method: "POST", body: { project_id: projectId } });
  console.log(`Root Cause started: ${await snapshot("root-started", result)}`);
} else {
  throw new Error("Commands: status, upload-kb [dir], search-kb [query], create-evaluator, create-task v1|v2 [agent_name], preview v1|v2 [limit], run-eval v1|v2 [limit], eval-status v1|v2, eval-results v1|v2, root-ready, root-run, root-status, root-clusters");
}

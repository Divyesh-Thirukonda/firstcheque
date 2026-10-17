#!/usr/bin/env node
/** Export recorded, synthetic benchmark artifacts. No network or provider calls. */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";

const hash = value => createHash("sha256").update(value).digest("hex");
const read = async path => JSON.parse(await readFile(path, "utf8"));
const save = async (name, data) => writeFile(`docs/evidence/${name}.json`, JSON.stringify(data, null, 2) + "\n");
const versions = ["v1", "v2"];
const ledgers = Object.fromEntries(await Promise.all(versions.map(async version => {
  const path = `work/live-baseline-firstcheque-frozen-${version}-20261017.json`;
  const text = await readFile(path, "utf8");
  return [version, { ...JSON.parse(text), fileSha256: hash(text) }];
})));
const inputsText = await readFile("work/research-dataset.json", "utf8");
if (hash(inputsText) !== "3a109e456069150baeed7ea79cb069ce92fe889fef54bfdd5a4bdc5b35a29bc1") throw Error("Frozen inputs changed.");
await mkdir("docs/evidence", { recursive: true });
await writeFile("docs/evidence/inputs.json", inputsText);
const inputs = JSON.parse(inputsText);
const audit = await read("work/independent-benchmark-audit.json");
if (!audit.identicalUserInputs || audit.v1ContractValid !== 48 || audit.v2ContractValid !== 50) throw Error("Independent contract audit differs.");
const bulk = Object.fromEntries(await Promise.all(versions.map(async version => [version, (await read(`work/prism-eval-reference-${version}-results.json`)).results])));
const calibration = await read("work/prism-reference-binary-calibration-results.json");
const evaluatorId = "5268937c-d0cd-4a28-9d15-116bb7df1ffb";
const reference = bulk.v2[0];
if (reference.evaluator_id !== evaluatorId) throw Error("Unexpected evaluator.");
const sameRubric = result => result.evaluator_id === evaluatorId && result.template_prompt === reference.template_prompt && JSON.stringify(result.rails) === JSON.stringify(reference.rails);
const compact = result => ({ id: result.id, traceId: result.trace_id, taskId: result.task_id, evaluatorId: result.evaluator_id, score: result.score, label: result.label, reasoning: result.reasoning, createdAt: result.created_at });
const selected = {};
const rows = inputs.map(input => {
  const row = { caseId: input.caseId, caseType: input.caseType, category: input.category, versions: {} };
  for (const version of versions) {
    const record = ledgers[version].results.find(result => result.caseId === input.caseId);
    if (!record) throw Error(`Missing ${version}/${input.caseId}`);
    const traceId = record.report?.traceId || record.traceId;
    let score = bulk[version].find(result => result.trace_id === traceId);
    let selection = "version_bulk_task";
    if (!score && version === "v1" && input.caseId === "case-024") {
      score = calibration.flatMap(group => group.results).find(result => result.trace_id === traceId);
      selection = "existing_exact_trace_calibration_same_evaluator_and_rubric";
    }
    if (!score || score.trace_id !== traceId || !sameRubric(score)) throw Error(`Pairing guard failed: ${version}/${input.caseId}`);
    selected[version] ||= [];
    selected[version].push(score);
    const independent = audit.rows.find(result => result.caseId === input.caseId)[version];
    row.versions[version] = {
      traceId, sourceHead: ledgers[version].sourceHead, applicationStatus: record.status,
      contractValid: independent.contractValid, deliveredMode: record.report?.mode || "error",
      modelCalls: record.outputContract?.modelCalls || 1, repairAttempts: record.outputContract?.repairAttempts || 0,
      rawOutputSha256: hash(record.rawModelOutput),
      exactModelRequestSha256: hash(JSON.stringify(record.prompt)),
      customJudge: { ...compact(score), selection, calibrated: false, useForQualityClaim: false },
    };
  }
  return row;
});
for (const version of versions) if (new Set(rows.map(row => row.versions[version].traceId)).size !== 50) throw Error(`Duplicate ${version} traces.`);
const excluded = bulk.v1.filter(result => !selected.v1.some(chosen => chosen.id === result.id));
const root = await read("work/prism-root-cluster-detail.json");
const members = await read("docs/evidence/binding-defect-examples.json");
const repaired = ledgers.v2.results.find(result => result.caseId === "case-018");
if (repaired.generationAttempts.length !== 2 || repaired.generationAttempts[0].valid !== false || repaired.generationAttempts[1].valid !== true) throw Error("Repair lineage mismatch.");
const counts = version => ({ cases: 50, modelCalls: version === "v1" ? 50 : ledgers.v2.modelCalls, contractValidMemos: audit[`${version}ContractValid`], generatedLiveMemos: audit[`${version}LiveDelivered`], replayFallbacks: version === "v1" ? 0 : ledgers.v2.replayFallbacks, errors: ledgers[version].errors, repairAttempts: version === "v1" ? 0 : ledgers.v2.repairAttempts, customEvaluations: selected[version].length, customJudgeLabels: selected[version].reduce((out, result) => { out[result.label] = (out[result.label] || 0) + 1; return out; }, {}) });
await save("results", {
  status: "complete", recordedAt: new Date().toISOString(), syntheticData: true,
  provider: "Nicrron", modelRoutingSlug: "nicrron/auto", fixedCaseCount: 50, normalCases: 25, adversarialCases: 25,
  datasetSha256: hash(inputsText), identicalUserInputs: true,
  sourceHeads: Object.fromEntries(versions.map(version => [version, ledgers[version].sourceHead])),
  sourceLedgerSha256: Object.fromEntries(versions.map(version => [version, ledgers[version].fileSha256])),
  aggregate: Object.fromEntries(versions.map(version => [version, counts(version)])),
  metric: { name: "contract-valid memos", method: "Independent application parser: one optional outer code fence, JSON.parse, then the exact Zod memo schema.", factualGroundingCount: null },
  customEvaluation: { evaluatorId, sameTemplateAndRailsForAll100: true, calibrated: false, qualityImprovementClaim: false, limitation: "The judge rejected an independently valid calibration answer using incorrect length/schema claims. Preserve these labels as integration evidence, not reliable factual correctness or usability measurements.", selectionProvenance: "v1: 49 exact frozen traces from the version bulk task plus the existing exact-case024 calibration result under the byte-identical evaluator/template/rails. A pre-batch smoke selected by the bulk service is excluded. v2: all50 exact frozen traces from the version bulk task.", excludedBulkResults: excluded.map(compact) },
  observedFailures: { matchedBaseline: [{ caseId: "case-024", type: "schema", detail: "Third strength lacked sourceIds, confidence and metric." }, { caseId: "case-027", type: "json", detail: "Trailing comma before an array closing bracket." }], additionalPreBatchErrorOutsideDenominator: { traceId: "282c8ae9-a3ad-4507-91cb-06b60ed85f3f", trajectoryId: "7e6ded6c-ff36-4002-8aff-9177dad0b4ad", type: "json" }, observedRepair: { caseId: "case-018", traceId: repaired.report.traceId, initialValid: false, repairedValid: true, providerCalls: 2, detail: "Initial note-only strength omitted sourceIds, confidence and metric. One bounded correction produced a valid live memo; both raw responses are retained in provider-outputs.json." } },
  rootCause: { runId: "878ec4a3-014d-48ae-a9db-c3b1924e9bb6", clusterId: root.cluster.id, evidenceTier: "tentative", warningCount: 52, verifiedMemberCount: 3, verifiedMembers: members.examples.map(example => ({ caseId: example.caseId, traceId: example.traceId, trajectoryId: example.trajectoryId })), serviceSuggestedCauseClass: root.cluster.cause_class, confirmedCause: "Ingest normalization selected the first submitted retrieval span as the top-level answer, replacing the memo for evaluator consumption.", fix: "Submit the final-answer root chain span first, parent child spans, capture the exact model input, and assert ingest acknowledgement/readback. Historical v1 display repaired from immutable recordings without model calls.", limitation: "The52 warnings are tentative and instrumentation-affected. They are not52 hallucinations or52 malformed outputs. Direct membership is confirmed only for the three sampled observability failures. Membership of the older three schema/JSON errors is not asserted." },
  limitations: ["Synthetic source documents and paper allocations only.", "Routing slug unchanged; Nicrron may select different underlying models. Counts show observed pipeline outcomes, not a controlled single-model causal estimate.", "Local numeric coverage produced false positives on v1 and is not treated as factual correctness.", "External judge failed calibration; no score or grounding improvement is claimed.", "Submission prepared; event submission form was not released at completion."],
  cases: rows,
});
await save("evaluator", { id: evaluatorId, name: reference.evaluator_name, type: reference.evaluator_type, templatePrompt: reference.template_prompt, rails: reference.rails, templateSha256: hash(reference.template_prompt), calibrated: false, useForQualityClaims: false });
await save("calibration", calibration.map(group => ({ fixture: group.fixture, taskId: group.taskId, results: group.results.map(compact), interpretation: group.fixture === "valid" ? "Incorrect rejection: independently schema-valid and grounded recorded output; judge invented length/schema violations." : "Actual missing claim fields, but the judge also added incorrect length/schema assertions. A fail does not validate its reasoning." })));
await save("provider-outputs", { syntheticData: true, cases: inputs.map(input => ({ caseId: input.caseId, versions: Object.fromEntries(versions.map(version => { const record = ledgers[version].results.find(result => result.caseId === input.caseId); return [version, { traceId: record.report?.traceId || record.traceId, rawModelOutput: record.rawModelOutput, generationAttempts: record.generationAttempts || [{ text: record.rawModelOutput, valid: record.status === "live-complete" }], deliveredMemo: record.report ? Object.fromEntries(["title", "summary", "recommendation", "strengths", "risks", "diligenceQuestions", "mode", "provider", "model"].map(key => [key, record.report[key]])) : null, error: record.error || null }]; })) })) });
await save("root-cause", { cluster: root.cluster, confirmedMemberExamples: members.examples.map(example => ({ caseId: example.caseId, traceId: example.traceId, trajectoryId: example.trajectoryId, membershipEvidence: example.membershipEvidence })), interpretation: "Recurring code/observability defect localized by comparing the stored answer with immutable raw model output. The service's suggested prompt cause and detector warnings are tentative, not corroborated hallucination findings." });
const kb = await read("work/prism-kb-documents.json");
const retrievals = versions.flatMap(version => ledgers[version].results.map(record => ({ version, caseId: record.caseId, traceId: record.report?.traceId || record.traceId, knowledgeBase: JSON.parse(record.prompt.prompt).prismKnowledgeBase })));
if (kb.documents.length !== 18 || kb.documents.some(doc => doc.status !== "ready" || doc.agent_id !== "firstcheque-analyst") || retrievals.some(record => !record.knowledgeBase?.retrievedDocuments?.length)) throw Error("Knowledge Base proof incomplete.");
await save("knowledge-base", { assignedAgentId: "firstcheque-analyst", readyDocumentCount: 18, documents: kb.documents.map(doc => ({ id: doc.id, name: doc.name, agentId: doc.agent_id, status: doc.status, chunks: doc.chunk_count, createdAt: doc.created_at })), recordedModelRequestsWithRetrieval: retrievals.length, sample: retrievals[0], retrievalCounts: retrievals.map(record => ({ version: record.version, caseId: record.caseId, traceId: record.traceId, query: record.knowledgeBase.query, retrievedDocumentCount: record.knowledgeBase.retrievedDocuments.length })) });
const invalid = (await read("work/prism-invalid-output-binding-results.json")).results;
await save("excluded-evaluations", { validity: "invalid_wrong_output_binding", excludedFromAllModelOutcomeClaims: true, reason: "These50 scores evaluated a retrieval payload instead of the actual provider memo before the first-span normalization repair.", results: invalid.map(compact) });
console.log(JSON.stringify({ pairedCaseCount: rows.length, sameEvaluator: evaluatorId, sameRubric: true, contractValid: [48, 50], customLabels: versions.map(version => counts(version).customJudgeLabels), extraV1BulkRowsExcluded: excluded.length, modelCallsAdded: 0 }));

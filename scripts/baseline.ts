/** Real provider calls; never substitutes replay for a missing key or counts fixtures as live.
 * NODE_OPTIONS=--conditions=react-server npx tsx scripts/baseline.ts --version=v1 --count=50
 * Repeat with --version=v2: work/research-dataset.json preserves identical inputs.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { DEFAULT_THESIS, STARTUPS } from "../src/lib/data";
import { nicrronConfigured, runResearchDetailed, type ResearchInput } from "../src/lib/research";

try { process.loadEnvFile(".env.local"); } catch { /* Environment may already be supplied by the process. */ }
const flag = (name: string, fallback: string) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split("=").slice(1).join("=") || fallback;

async function main() {
  if (!nicrronConfigured()) throw new Error("NICRRON_API_KEY is not configured. No calls or fake baseline records were generated.");
  const version = flag("version", "v1") as "v1" | "v2";
  if (!["v1", "v2"].includes(version)) throw new Error("--version must be v1 or v2");
  const count = Math.min(100, Math.max(1, Number(flag("count", "50"))));
  const session = flag("session", `firstcheque-live-${version}-${new Date().toISOString().slice(0, 10)}`);
  const sourceHead = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const concurrency = Math.min(5, Math.max(1, Number(flag("concurrency", "3"))));
  await mkdir("work", { recursive: true });
  const questions = [
    "What is the recurring revenue and how does it differ from total revenue?",
    "Does this business fit a recurring-revenue thesis? Quantify the traction and major risks.",
    "What would you verify before researching this company further? Give exact financial metrics.",
    "Assess growth quality, cash runway, and liquidity risks for this investor.",
    "Explain this company's most important investment thesis evidence and what is unknown.",
    "Could the headline revenue be confused with ARR or payment volume? Assess the source pack.",
    "Compare recurring traction with financing dependence and company concentration risk.",
    "What are the strongest and weakest parts of the founder's financial story?",
    "Create a skeptical research memo for a new private-market investor.",
    "How does this company align with the investor's stage, industry, and holding horizon?",
  ];
  let dataset: Array<ResearchInput & { caseId: string }>;
  try { dataset = JSON.parse(await readFile("work/research-dataset.json", "utf8")); }
  catch {
    dataset = Array.from({ length: 50 }, (_, index) => ({
      caseId: `case-${String(index + 1).padStart(3, "0")}`,
      startupId: STARTUPS[index % STARTUPS.length].id,
      thesis: { ...DEFAULT_THESIS, industries: [STARTUPS[index % STARTUPS.length].industry], riskAppetite: (["balanced", "conservative", "adventurous"] as const)[index % 3], horizonYears: [3, 7, 10][index % 3] },
      question: questions[Math.floor(index / STARTUPS.length) % questions.length],
    }));
    await writeFile("work/research-dataset.json", JSON.stringify(dataset, null, 2));
  }
  dataset = dataset.slice(0, count);
  const outputFile = `work/live-baseline-${session.replace(/[^a-z0-9_-]/gi, "-")}.json`;
  type RecordEntry = { caseId: string; input: ResearchInput; status: string; [key: string]: unknown };
  const results: RecordEntry[] = [];
  let next = 0;
  let writes = Promise.resolve();
  const save = () => {
    const snapshot = JSON.stringify({ session, version, sourceHead, dataset: "work/research-dataset.json", liveOnly: true, recordedAt: new Date().toISOString(), requested: dataset.length, actualCalls: results.filter((record) => record?.rawModelOutput).length, parsedReports: results.filter((record) => record?.status === "live-complete").length, errors: results.filter((record) => record?.status === "error").length, results: results.filter(Boolean) }, null, 2);
    writes = writes.then(() => writeFile(outputFile, snapshot));
    return writes;
  };
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (next < dataset.length) {
      const index = next++;
      const { caseId, ...sourceInput } = dataset[index];
      const input: ResearchInput = { ...sourceInput, mode: "live", version, sessionId: `${session}-${caseId}` };
      try {
        const detailed = await runResearchDetailed(input);
        results[index] = { caseId, input, status: detailed.rawModelOutput ? "live-complete" : "not-live", ...detailed };
        console.log(`${index + 1}/${dataset.length} ${caseId} ${sourceInput.startupId} ${version} grounding=${detailed.evaluation.score} trace=${detailed.report.traceId} displayed=${detailed.report.mode}`);
      } catch (error) {
        const failure = error as { rawModelOutput?: string; traceId?: string; prompt?: unknown };
        results[index] = { caseId, input, status: "error", error: error instanceof Error ? error.message : String(error), rawModelOutput: failure.rawModelOutput || null, traceId: failure.traceId, prompt: failure.prompt };
        console.error(`${index + 1}/${dataset.length} ${caseId} failed: ${results[index].error}`);
      }
      await save();
    }
  }));
  await save();
  const completed = results.filter((result) => result.rawModelOutput).length;
  const errors = results.filter((result) => result.status === "error").length;
  console.log(JSON.stringify({ outputFile, requested: dataset.length, actualCalls: completed, parsedReports: results.length - errors, errors }));
  if (errors || completed !== dataset.length) process.exitCode = 1;
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });

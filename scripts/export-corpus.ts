import { mkdir, writeFile } from "node:fs/promises";
import { EVIDENCE } from "../src/lib/data";

async function main() {
  await mkdir("work/corpus", { recursive: true });
  for (const evidence of EVIDENCE) await writeFile(`work/corpus/${evidence.id}.txt`, `${evidence.title}\nDocument ID: ${evidence.id}\nCompany ID: ${evidence.startupId}\nPublisher: ${evidence.publisher}\nDate: ${evidence.date}\n\n${evidence.excerpt}\n\nExact financial fields: ${JSON.stringify(evidence.metrics)}\n`);
  await writeFile("work/corpus/manifest.json", JSON.stringify(EVIDENCE, null, 2));
  console.log(`Exported ${EVIDENCE.length} fictional source documents to work/corpus.`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });

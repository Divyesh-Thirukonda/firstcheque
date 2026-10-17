import { readFile, writeFile, mkdir } from "node:fs/promises";
import { CATALOG_SEEDS } from "../src/lib/catalog-seeds";
import { collectCompanyLogo } from "../src/lib/company-logo-collector";
import type { CompanyLogoInfo } from "../src/lib/company-profile-types";
async function main() {
  await mkdir("public/company-logos", { recursive: true });
  let prior: Record<string, CompanyLogoInfo> = {};
  try {
    prior = JSON.parse(await readFile("src/data/company-logos.json", "utf8"));
  } catch {}
  let next = 0;
  const records = { ...prior };
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      while (next < CATALOG_SEEDS.length) {
        const company = CATALOG_SEEDS[next++];
        if (records[company.id]?.status === "fetched") continue;
        if (!company.website) {
          console.log(company.id, "no official website");
          continue;
        }
        const result = await collectCompanyLogo(company.website, {
          timeoutMs: 26000,
          companyName: company.name,
          previous: records[company.id],
        });
        if (result.url) {
          const png = Buffer.from(result.url.split(",")[1], "base64");
          await writeFile(`public/company-logos/${company.id}.png`, png);
          result.url = `/company-logos/${company.id}.png`;
        }
        records[company.id] = result;
        console.log(company.id, result.status, result.error || "");
        await writeFile(
          "work/company-logo-progress.json",
          JSON.stringify(records, null, 2),
        );
      }
    }),
  );
  await writeFile(
    "src/data/company-logos.json",
    JSON.stringify(records, null, 2),
  );
  console.log(
    "Fetched",
    Object.values(records).filter((r) => r.status === "fetched").length,
    "of",
    CATALOG_SEEDS.length,
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

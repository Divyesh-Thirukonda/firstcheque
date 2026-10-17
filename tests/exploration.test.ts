import test from "node:test";
import assert from "node:assert/strict";
import { explorationCompanies, explorationEvidence, explorationIntent } from "../src/lib/exploration";
import { createSearchThread, hydrateSearchThreads } from "../src/lib/search-threads";
import { DEFAULT_DISCOVERY_PREFERENCES } from "../src/lib/discovery";
import type { DiscoveryCompany } from "../src/lib/discovery-types";
import type { LiveDiligenceResult } from "../src/lib/live-research-types";

const company = { id: "ai", name: "AI", sectors: ["AI infrastructure"], minInvestment: 100000, offeringStatus: "closed" } as DiscoveryCompany;

test("exploration requests are routed separately from allocation searches", () => {
  assert.equal(explorationIntent("Map the fastest-growing startups"), "growth");
  assert.equal(explorationIntent("Which AI infrastructure companies are likely to raise next?"), "fundraising");
  assert.equal(explorationIntent("I have $2,000 for AI startups with revenue"), null);
  assert.equal(explorationIntent("I have $2,000 to invest in the fastest-growing startups"), null);
});

test("research maps include non-investable companies and fundraising scope uses the exact sector", () => {
  const devtools = { ...company, id: "tools", sectors: ["Developer tools"] };
  assert.deepEqual(explorationCompanies([company, devtools], "fundraising").map(c => c.id), ["ai"]);
  assert.equal(explorationCompanies([company, devtools], "growth").length, 2);
});

test("exploration intent survives saved search restoration and cannot accept an arbitrary stored kind", () => {
  const thread = { ...createSearchThread(DEFAULT_DISCOVERY_PREFERENCES, ["ai"]), exploration: "fundraising" as const };
  assert.equal(hydrateSearchThreads(JSON.stringify({ version: 1, threads: [thread] }))[0].exploration, "fundraising");
  assert.equal(hydrateSearchThreads([{ ...thread, exploration: "invented-forecast" }])[0].exploration, undefined);
});

test("source coverage excludes unavailable pages and does not turn revenue or runway into a prediction", () => {
  const report = { companyId: "ai", sources: [{ status: "fetched" }, { status: "unavailable" }], financials: { annualRevenue: { value: 1000000 }, runwayMonths: { value: 6 } } } as LiveDiligenceResult;
  const evidence = explorationEvidence("ai", [report]);
  assert.equal(evidence.sourceCount, 1);
  assert.equal(evidence.revenue?.value, 1000000);
  assert.equal("growthRate" in evidence, false);
  assert.equal("raiseProbability" in evidence, false);
  assert.equal(explorationEvidence("unknown", [report]).sourceCount, 0);
});

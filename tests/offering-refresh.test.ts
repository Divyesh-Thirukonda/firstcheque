import test from "node:test";
import assert from "node:assert/strict";
import { OFFERING_SEEDS } from "../src/lib/offering-seeds";
import { refreshOffering, validatedOfferingSource } from "../src/lib/offering-refresh";

test("a status refresh cannot pretend retained manual terms are newly verified", async () => {
  const original = OFFERING_SEEDS.find(company => company.id === "republic-tradefunded")!;
  const result = await refreshOffering(original);
  assert.equal(result.offeringStatus, "unverified");
  assert.equal(result.minInvestment, 350);
  assert.equal(result.offeringUrl, original.offeringUrl);
  assert.equal(original.offeringStatus, "open");
  assert.match(result.statusEvidence!, /not a fresh confirmation/);
  assert.match(result.minimumEvidence!, /not reverified/);
});

test("platform URL validation rejects alternate origins and private or non-detail destinations", () => {
  const base = OFFERING_SEEDS[0];
  for (const url of ["https://republic.com.evil.example/test", "https://republic.com@127.0.0.1/test", "http://republic.com/test", "https://republic.com:444/test", "https://capital.wefunder.com/agents", "https://republic.com/login", "https://wefunder.com/bito/invest", "https://republic.com/tradefunded?redirect=https://127.0.0.1"]) {
    assert.equal(validatedOfferingSource({ ...base, offeringUrl: url, sourceUrls: [url] }), null, url);
  }
  assert.equal(validatedOfferingSource({ ...base, sourceUrls: [] }), null);
  assert.equal(validatedOfferingSource(base)?.hostname, "wefunder.com");
});

test("seed minima use actual individual offering terms and closed rounds stay separate", () => {
  const terms = Object.fromEntries(OFFERING_SEEDS.filter(company => company.minInvestment !== null).map(company => [company.name, company.minInvestment]));
  assert.deepEqual(terms, { "Bito": 1000, "Miso Robotics": 1052.16, "TRADEFUNDED LLC": 350, "The Gifted": 100 });
  assert.equal(OFFERING_SEEDS.find(company => company.name === "Canopii")?.offeringStatus, "closed");
  assert.equal(OFFERING_SEEDS.find(company => company.name === "The Gifted")?.website, "");
  assert.ok(OFFERING_SEEDS.every(company => company.annualRevenue === null && company.arr === null && company.financialsAsOf === null));
});

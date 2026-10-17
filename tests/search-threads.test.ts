import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_DISCOVERY_PREFERENCES, parseDiscoveryBrief } from "../src/lib/discovery";
import {
  appendSearchMessage, createSearchThread, hydrateSearchThreads, isDiscoveryPreferences,
  searchThreadTitle, selectThreadCompany, updateSearchThreadPreferences,
} from "../src/lib/search-threads";

test("each search captures its own criteria and ranked companies independently of later edits", () => {
  const preferences = parseDiscoveryBrief("I have $2,000 for AI infrastructure and climate tech. I prefer companies with existing revenue.").preferences;
  const ids = ["company-a", "company-b", "company-a"];
  const first = createSearchThread(preferences, ids);
  preferences.sectors.push("Fintech");
  preferences.industries.length = 0;
  preferences.budget = 5000;
  ids.reverse();
  const second = createSearchThread(preferences, ["company-c"]);

  assert.notEqual(first.id, second.id);
  assert.equal(first.preferences.budget, 2000);
  assert.deepEqual(first.preferences.sectors, ["AI infrastructure", "Climate tech"]);
  assert.deepEqual(first.resultCompanyIds, ["company-a", "company-b"]);
  assert.match(first.title, /AI infrastructure \+ Climate tech · \$2,000/);
  assert.equal(first.messages.length, 0);
  assert.deepEqual(DEFAULT_DISCOVERY_PREFERENCES.sectors, []);
});

test("refining a search preserves its history and identity while replacing criteria and result order", () => {
  const initial = createSearchThread({ ...DEFAULT_DISCOVERY_PREFERENCES, thesis: "Find AI companies" }, ["a", "b"], "a");
  const withHistory = appendSearchMessage(initial, { id: "question-1", role: "user", text: "Only climate companies", kind: "search" });
  const criteria = parseDiscoveryBrief("I have $4,000 for climate tech").preferences;
  const updated = updateSearchThreadPreferences(withHistory, criteria, ["c", "b"]);
  criteria.sectors.length = 0;
  updated.messages[0].text = "Edited message";

  assert.equal(updated.id, initial.id);
  assert.equal(updated.createdAt, initial.createdAt);
  assert.deepEqual(updated.resultCompanyIds, ["c", "b"]);
  assert.deepEqual(updated.preferences.sectors, ["Climate tech"]);
  assert.equal(updated.selectedCompanyId, null);
  assert.equal(withHistory.messages[0].text, "Only climate companies");
  assert.deepEqual(initial.resultCompanyIds, ["a", "b"]);
});

test("company reports belong inside an existing search without becoming separate threads", () => {
  const search = createSearchThread(DEFAULT_DISCOVERY_PREFERENCES, ["a", "b"]);
  const reading = selectThreadCompany(search, "a");
  const report = appendSearchMessage(reading, { id: "report-a", role: "assistant", text: "Research is ready", companyId: "a", reportId: "dossier-a", kind: "research" });
  const nextReport = selectThreadCompany(report, "b");
  assert.equal(nextReport.id, search.id);
  assert.equal(nextReport.title, search.title);
  assert.equal(nextReport.messages[0].companyId, "a");
  assert.equal(nextReport.messages[0].reportId, "dossier-a");
  assert.equal(nextReport.selectedCompanyId, "b");
  assert.equal(search.selectedCompanyId, null);
  assert.equal(search.messages.length, 0);
});

test("restoring browser history rejects corrupt searches individually and strips unrecognized stored fields", () => {
  const search = appendSearchMessage(createSearchThread(DEFAULT_DISCOVERY_PREFERENCES, ["a"]), { id: "m", role: "assistant", text: "A report", kind: "research", companyId: "a", reportId: "r", error: false });
  const invalid = { ...search, id: "bad", preferences: { ...search.preferences, budget: "2000" } };
  const stored = { ...search, apiKey: "not-part-of-the-model", preferences: { ...search.preferences, extra: "discard" }, messages: [...search.messages, { id: "bad-message", role: "admin", text: "not a valid role" }] };
  const hydrated = hydrateSearchThreads(JSON.stringify({ version: 1, threads: [stored, invalid] }));
  assert.equal(hydrated.length, 1);
  assert.deepEqual(hydrated[0], search);
  assert.equal("apiKey" in hydrated[0], false);
  assert.equal("extra" in hydrated[0].preferences, false);
  hydrated[0].preferences.sectors.push("Changed");
  assert.deepEqual(search.preferences.sectors, []);
});

test("malformed or excessively large local history cannot break workspace initialization", () => {
  for (const value of [null, undefined, "{", "null", 3, { version: 99, threads: [] }, " ".repeat(2_000_001)]) {
    assert.deepEqual(hydrateSearchThreads(value), []);
  }
  const search = createSearchThread(DEFAULT_DISCOVERY_PREFERENCES, ["a"]);
  const invalidDates = { ...search, id: "invalid-date", updatedAt: "not-a-date" };
  const oversized = { ...search, id: "oversized", brief: "x".repeat(12_001) };
  assert.equal(hydrateSearchThreads([search, invalidDates, oversized]).length, 1);
  assert.equal(hydrateSearchThreads(Array.from({ length: 102 }, (_, index) => ({ ...search, id: String(index) }))).length, 100);
});

test("preference validation rejects nonfinite budgets, invalid enums, absent constraints and oversized arrays", () => {
  assert.equal(isDiscoveryPreferences(DEFAULT_DISCOVERY_PREFERENCES), true);
  for (const patch of [{ budget: NaN }, { budget: Infinity }, { maxAllocationPct: 0 }, { industries: ["Unknown"] }, { minAnnualRevenue: undefined }, { sectors: Array(65).fill("AI") }, { offeringOnly: "true" }]) {
    assert.equal(isDiscoveryPreferences({ ...DEFAULT_DISCOVERY_PREFERENCES, ...patch }), false);
  }
});

test("search titles explain structured intent when the brief is absent", () => {
  assert.equal(searchThreadTitle(DEFAULT_DISCOVERY_PREFERENCES), "Startup search · $2,000");
  assert.equal(searchThreadTitle({ ...DEFAULT_DISCOVERY_PREFERENCES, revenueRequirement: "reported-arr" }), "Startups with ARR · $2,000");
  assert.equal(searchThreadTitle({ ...DEFAULT_DISCOVERY_PREFERENCES, query: "Bito" }), "Bito · $2,000");
});

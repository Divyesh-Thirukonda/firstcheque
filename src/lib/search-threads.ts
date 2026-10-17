import { EXPLORATIONS, type ExplorationKind } from "./exploration";
import type { DiscoveryPreferences } from "./discovery-types";

/** Personal searches stay in the browser; company research is stored separately. */
export interface SearchMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  kind?: "search" | "research";
  companyId?: string;
  reportId?: string;
  error?: boolean;
}

export interface SearchThread {
  id: string;
  exploration?: ExplorationKind;
  title: string;
  brief: string;
  preferences: DiscoveryPreferences;
  /** Companies returned by the last search, in their original ranked order. */
  resultCompanyIds: string[];
  /** A report being read within the search; it may also be a manually added company. */
  selectedCompanyId: string | null;
  messages: SearchMessage[];
  createdAt: string;
  updatedAt: string;
}

const INDUSTRIES = ["Climate", "Fintech", "Healthcare", "AI & software", "Consumer", "Local business", "Cybersecurity"];
const STAGES = ["Pre-seed", "Seed", "Series A", "Series B", "Series C", "Series D", "Small business"];
const MAX_THREADS = 100;
const MAX_MESSAGES = 200;
const MAX_COMPANIES = 1000;
const MAX_SERIALIZED_LENGTH = 2_000_000;
const MAX_BRIEF_LENGTH = 12_000;

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function boundedText(value: unknown, maximum: number, allowEmpty = true): value is string {
  return typeof value === "string" && value.length <= maximum && (allowEmpty || value.trim().length > 0);
}

function finiteNumber(value: unknown, minimum: number, maximum = Number.MAX_SAFE_INTEGER): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum;
}

function stringArray(value: unknown, maximum: number, maximumLength = 200): value is string[] {
  return Array.isArray(value) && value.length <= maximum && value.every(item => boundedText(item, maximumLength, false));
}

export function isDiscoveryPreferences(value: unknown): value is DiscoveryPreferences {
  if (!record(value)) return false;
  return stringArray(value.industries, INDUSTRIES.length) && value.industries.every(item => INDUSTRIES.includes(item))
    && stringArray(value.stages, STAGES.length) && value.stages.every(item => STAGES.includes(item))
    && stringArray(value.sectors, 64)
    && (value.excludedSectors === undefined || stringArray(value.excludedSectors, 64))
    && typeof value.riskAppetite === "string" && ["conservative", "balanced", "adventurous"].includes(value.riskAppetite)
    && finiteNumber(value.budget, 100, 10_000_000)
    && finiteNumber(value.maxAllocationPct, Number.MIN_VALUE, 100)
    && finiteNumber(value.horizonYears, 1, 30)
    && typeof value.revenueRequirement === "string" && ["any", "reported-revenue", "reported-arr"].includes(value.revenueRequirement)
    && typeof value.offeringOnly === "boolean" && typeof value.includeUnverified === "boolean"
    && boundedText(value.thesis, MAX_BRIEF_LENGTH) && boundedText(value.query, 1000)
    && (value.minAnnualRevenue === null || finiteNumber(value.minAnnualRevenue, 0))
    && (value.maxMinimumCheck === null || finiteNumber(value.maxMinimumCheck, 0));
}

function snapshotPreferences(preferences: DiscoveryPreferences): DiscoveryPreferences {
  return {
    industries: [...preferences.industries], stages: [...preferences.stages], sectors: [...preferences.sectors],
    excludedSectors: [...(preferences.excludedSectors || [])], riskAppetite: preferences.riskAppetite,
    horizonYears: preferences.horizonYears, budget: preferences.budget, maxAllocationPct: preferences.maxAllocationPct,
    thesis: preferences.thesis, revenueRequirement: preferences.revenueRequirement,
    minAnnualRevenue: preferences.minAnnualRevenue, maxMinimumCheck: preferences.maxMinimumCheck,
    offeringOnly: preferences.offeringOnly, includeUnverified: preferences.includeUnverified, query: preferences.query,
  };
}

function companyIds(ids: readonly string[]): string[] {
  return [...new Set(ids.filter(id => boundedText(id, 256, false)))].slice(0, MAX_COMPANIES);
}

export function searchThreadTitle(preferences: DiscoveryPreferences): string {
  const interests = preferences.sectors.length ? preferences.sectors : preferences.industries;
  let subject = preferences.query.trim();
  if (!subject && interests.length) subject = interests.slice(0, 2).join(" + ") + (interests.length > 2 ? ` +${interests.length - 2}` : "");
  if (!subject && preferences.stages.length) subject = `${preferences.stages.join(" + ")} startups`;
  if (!subject) subject = preferences.revenueRequirement === "reported-arr" ? "Startups with ARR"
    : preferences.revenueRequirement === "reported-revenue" ? "Revenue-generating startups" : "Startup search";
  const budget = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(preferences.budget);
  const requirement = interests.length && preferences.revenueRequirement !== "any" ? preferences.revenueRequirement === "reported-arr" ? " · ARR" : " · Revenue" : "";
  return `${subject.slice(0, 100)} · ${budget}${requirement}`;
}

export function createSearchThread(preferences: DiscoveryPreferences, resultCompanyIds: readonly string[], selectedCompanyId: string | null = null): SearchThread {
  const timestamp = new Date().toISOString();
  return {
    id: globalThis.crypto.randomUUID(), title: searchThreadTitle(preferences), brief: preferences.thesis.trim(),
    preferences: snapshotPreferences(preferences), resultCompanyIds: companyIds(resultCompanyIds), selectedCompanyId,
    messages: [], createdAt: timestamp, updatedAt: timestamp,
  };
}

export function updateSearchThreadPreferences(thread: SearchThread, preferences: DiscoveryPreferences, resultCompanyIds: readonly string[]): SearchThread {
  const ids = companyIds(resultCompanyIds);
  return {
    ...thread, title: thread.exploration ? EXPLORATIONS[thread.exploration].title : searchThreadTitle(preferences), brief: preferences.thesis.trim(), preferences: snapshotPreferences(preferences),
    resultCompanyIds: ids, selectedCompanyId: thread.selectedCompanyId && ids.includes(thread.selectedCompanyId) ? thread.selectedCompanyId : null,
    messages: thread.messages.map(message => ({ ...message })), updatedAt: new Date().toISOString(),
  };
}

export function appendSearchMessage(thread: SearchThread, message: SearchMessage): SearchThread {
  return { ...thread, messages: [...thread.messages.filter(item => item.id !== message.id), { ...message }].slice(-MAX_MESSAGES), updatedAt: new Date().toISOString() };
}

export function selectThreadCompany(thread: SearchThread, companyId: string | null): SearchThread {
  return { ...thread, selectedCompanyId: companyId, updatedAt: new Date().toISOString() };
}

function message(value: unknown): SearchMessage | null {
  if (!record(value) || !boundedText(value.id, 256, false) || !["user", "assistant"].includes(String(value.role)) || !boundedText(value.text, 30_000)) return null;
  if (value.kind !== undefined && value.kind !== "search" && value.kind !== "research") return null;
  if (value.companyId !== undefined && !boundedText(value.companyId, 256, false)) return null;
  if (value.reportId !== undefined && !boundedText(value.reportId, 256, false)) return null;
  if (value.error !== undefined && typeof value.error !== "boolean") return null;
  return {
    id: value.id, role: value.role as SearchMessage["role"], text: value.text,
    ...(value.kind ? { kind: value.kind as SearchMessage["kind"] } : {}),
    ...(value.companyId ? { companyId: value.companyId as string } : {}),
    ...(value.reportId ? { reportId: value.reportId as string } : {}),
    ...(typeof value.error === "boolean" ? { error: value.error } : {}),
  };
}

function validDate(value: unknown): value is string {
  return boundedText(value, 40, false) && Number.isFinite(Date.parse(value));
}

function thread(value: unknown): SearchThread | null {
  if (!record(value) || !boundedText(value.id, 256, false) || !isDiscoveryPreferences(value.preferences)
    || !boundedText(value.title, 200, false) || !boundedText(value.brief, MAX_BRIEF_LENGTH)
    || !stringArray(value.resultCompanyIds, MAX_COMPANIES, 256)
    || !(value.selectedCompanyId === null || boundedText(value.selectedCompanyId, 256, false))
    || !Array.isArray(value.messages) || value.messages.length > MAX_MESSAGES
    || !validDate(value.createdAt) || !validDate(value.updatedAt)) return null;
  const messages = value.messages.map(message).filter((item): item is SearchMessage => item !== null);
  return {
    id: value.id, ...(value.exploration === "growth" || value.exploration === "fundraising" ? { exploration: value.exploration } : {}), title: value.title, brief: value.brief, preferences: snapshotPreferences(value.preferences),
    resultCompanyIds: companyIds(value.resultCompanyIds), selectedCompanyId: value.selectedCompanyId,
    messages: [...new Map(messages.map(item => [item.id, item])).values()], createdAt: value.createdAt, updatedAt: value.updatedAt,
  };
}

/** Corrupt entries are ignored independently so one bad saved search cannot erase the others. */
export function hydrateSearchThreads(value: unknown): SearchThread[] {
  try {
    let parsed = value;
    if (typeof value === "string") {
      if (value.length > MAX_SERIALIZED_LENGTH) return [];
      parsed = JSON.parse(value);
    }
    if (record(parsed)) parsed = parsed.version === 1 ? parsed.threads : null;
    if (!Array.isArray(parsed)) return [];
    const threads = parsed.slice(0, MAX_THREADS).map(thread).filter((item): item is SearchThread => item !== null);
    return [...new Map(threads.map(item => [item.id, item])).values()];
  } catch {
    return [];
  }
}

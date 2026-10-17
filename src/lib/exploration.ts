import type { DiscoveryCompany } from "./discovery-types";
import type { LiveDiligenceResult } from "./live-research-types";

export type ExplorationKind = "growth" | "fundraising";
export const EXPLORATIONS = {
  growth: { title: "Startup growth map", prompt: "Map the fastest-growing startups", label: "Growth map", question: "How fast is this company growing? Compare dated revenue, customer and hiring figures, with sources." },
  fundraising: { title: "AI infrastructure · Next raise", prompt: "Which AI infrastructure companies are likely to raise next?", label: "Next raise", question: "What evidence suggests this company could raise next? Check funding history, runway and announced plans." },
} as const;

export function explorationIntent(brief: string): ExplorationKind | null {
  // Allocation requests must keep their explicit budget and preference review.
  if (/\$\s*\d|\b(?:budget|invest|investing|investment|allocate|allocation)\b/i.test(brief)) return null;
  if (/\b(?:raise next|next (?:funding )?round|likely to raise|fundrais(?:e|ing) signals?)\b/i.test(brief)) return "fundraising";
  if (/\b(?:fastest[- ]growing|growth map|map.{0,25}growth|growth signals?)\b/i.test(brief)) return "growth";
  return null;
}

/** Research scope is deliberately distinct from investable matches and budget eligibility. */
export function explorationCompanies(companies: DiscoveryCompany[], kind: ExplorationKind): DiscoveryCompany[] {
  return companies.filter(company => kind === "growth" || company.sectors.includes("AI infrastructure"));
}

export function explorationEvidence(companyId: string, reports: LiveDiligenceResult[]) {
  const report = reports.find(item => item.companyId === companyId);
  const sources = report?.sources.filter(source => source.status === "fetched") || [];
  // A single revenue observation cannot establish a growth rate; runway cannot predict a round.
  return { report, sourceCount: sources.length, revenue: report?.financials.annualRevenue, runway: report?.financials.runwayMonths };
}

import type { DiscoveryCompany } from "./discovery-types";
import type { CompanyLogoInfo } from "./company-profile-types";
export type DiligenceCategory = "company" | "founders" | "competitors" | "market" | "financials" | "disclosures";
export type DiligenceStepStatus = "running" | "complete" | "warning" | "failed";

export interface LiveInvestorThesis {
  industries: string[];
  stages: string[];
  riskAppetite: "conservative" | "balanced" | "adventurous";
  horizonYears: number;
  budget: number;
  maxAllocationPct: number;
  thesis: string;
  requireRevenue?: boolean;
  minimumAnnualRevenue?: number | null;
  sectors?: string[];
  revenueRequirement?: "any" | "reported-revenue" | "reported-arr";
  minAnnualRevenue?: number | null;
}

export interface DiligenceRequest {
  companyName?: string;
  companyUrl?: string;
  offeringUrl?: string;
  question?: string;
  thesis: LiveInvestorThesis;
  dossierId?: string;
}

export interface DiligenceSource {
  scope?: "company" | "competitive-context" | "market-context";
  links?: string[];
  id: string;
  url: string;
  title: string;
  publisher: string;
  publishedAt: string | null;
  retrievedAt: string;
  category: DiligenceCategory;
  query: string;
  text: string;
  contentHash: string;
  officialCompanySource: boolean;
  status: "fetched" | "unavailable";
  error?: string;
}

export interface DiligenceClaim {
  text: string;
  sourceIds: string[];
  /** Exact supporting source passage. Empty means this is an explicitly labeled open question. */
  quote: string | null;
}

export interface DiligenceSection {
  category: DiligenceCategory;
  title: string;
  summary: string;
  claims: DiligenceClaim[];
}

export interface FinancialEvidence {
  comparison?: "greater-than" | "at-least";
  value: number | null;
  currency: string | null;
  period: string | null;
  asOf: string | null;
  sourceIds: string[];
  quote: string | null;
  status: "source-reported" | "not-found" | "conflicting";
}

export interface DiligenceConflict {
  field: string;
  description: string;
  assessment?: "confirmed-discrepancy" | "needs-review";
  sourceIds: string[];
  evidence: { sourceId: string; quote: string }[];
}

export interface DiligenceStep {
  id: string;
  label: string;
  status: DiligenceStepStatus;
  detail: string;
  durationMs: number;
}

export interface DiscoveryQuery {
  category: DiligenceCategory;
  query: string;
  status: "complete" | "unavailable";
  resultCount: number;
  error?: string;
}

export interface LiveDiligenceResult {
  publicReview?: { checkedAt: string; method: "manual-public-source-review"; sourceIds: string[]; note: string };
  contacts?: import("./company-contacts").CompanyContacts;
  id: string;
  runId: string;
  dossierId: string;
  companyId: string;
  company: { name: string; website: string | null };
  logo?: CompanyLogoInfo;
  profile?: Partial<DiscoveryCompany>;
  generatedAt: string;
  status: "complete" | "partial" | "unavailable";
  mode: "live-web" | "sources-only" | "unavailable";
  title: string;
  summary: string;
  sections: DiligenceSection[];
  financials: { annualRevenue: FinancialEvidence; arr: FinancialEvidence; valuation: FinancialEvidence; runwayMonths: FinancialEvidence };
  thesisFit: { score: number | null; explanation: string; caveats: string[] };
  missingEvidence: string[];
  conflicts: DiligenceConflict[];
  diligenceQuestions: string[];
  sources: DiligenceSource[];
  discovery: { provider: "tavily" | "exa" | "none"; available: boolean; queries: DiscoveryQuery[]; limitations: string[] };
  steps: DiligenceStep[];
  model: { provider: "Nicrron" | "none"; id: string | null; inputTokens: number; outputTokens: number; calls: number };
  trace: { id: string; recorded: boolean; error?: string };
  offering: { status: "not-verified"; url: string | null; explanation: string };
  warnings: string[];
  /** True only after the server's dossier store confirms persistence. */
  persisted: boolean;
}

export type DiligenceStreamEvent =
  | { type: "progress"; runId: string; step: DiligenceStep }
  | { type: "result"; result: LiveDiligenceResult }
  | { type: "error"; runId: string; error: string; retryable: boolean };

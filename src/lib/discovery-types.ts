import type { Industry, Stage, Thesis } from "./types";

export interface DiscoveryCompany {
  id: string;
  name: string;
  website: string;
  description: string;
  industry: Industry | "Other";
  sectors: string[];
  stage: Stage | "Unknown";
  kind: "offering" | "company";
  offeringStatus: "open" | "closed" | "unverified" | "not-listed";
  offeringUrl: string | null;
  platform: string | null;
  minInvestment: number | null;
  currency: "USD";
  annualRevenue: number | null;
  arr: number | null;
  /** Reported financial currency; independent of the USD offering minimum. */
  financialCurrency?: string | null;
  arrCurrency?: string | null;
  financialsAsOf: string | null;
  financialSourceUrl: string | null;
  sourceUrls: string[];
  lastCheckedAt: string;
  researchStatus: "not-started" | "complete" | "failed";
  dossierId?: string;
  statusEvidence?: string;
  minimumEvidence?: string;
  /** Labels describe public information, never offering eligibility or predicted returns. */
  riskLevel?: "high" | "very-high" | "unknown";
}

export interface DiscoveryPreferences extends Thesis {
  sectors: string[];
  revenueRequirement: "any" | "reported-revenue" | "reported-arr";
  minAnnualRevenue: number | null;
  maxMinimumCheck: number | null;
  offeringOnly: boolean;
  includeUnverified: boolean;
  query: string;
  excludedSectors?: string[];
}

export interface DiscoveryMatch {
  company: DiscoveryCompany;
  score: number;
  reasons: string[];
  warnings: string[];
}

export interface CatalogResponse {
  companies: DiscoveryCompany[];
  storage: { mode: "local" | "blob"; persistent: boolean; shared: boolean };
  updatedAt: string;
}

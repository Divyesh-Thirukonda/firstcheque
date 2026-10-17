export type Industry = "Climate" | "Fintech" | "Healthcare" | "AI & software" | "Consumer" | "Local business";
export type Stage = "Pre-seed" | "Seed" | "Series A" | "Small business";
export type RiskAppetite = "conservative" | "balanced" | "adventurous";

export interface Thesis {
  industries: Industry[];
  stages: Stage[];
  riskAppetite: RiskAppetite;
  horizonYears: number;
  budget: number;
  maxAllocationPct: number;
  thesis: string;
}

export interface Evidence {
  id: string;
  startupId: string;
  title: string;
  publisher: string;
  date: string;
  type: "Financials" | "Founder update" | "Market research" | "Risk disclosure";
  excerpt: string;
  url: string;
  metrics: Partial<Record<MetricKey, number>>;
}

export type MetricKey = "annualRevenue" | "arr" | "growthPct" | "runwayMonths" | "customers" | "valuation" | "grossMarginPct" | "customerConcentrationPct";

export interface Startup {
  id: string;
  name: string;
  symbol: string;
  tagline: string;
  description: string;
  industry: Industry;
  stage: Stage;
  location: string;
  founded: number;
  teamSize: number;
  raised: number;
  targetRaise: number;
  valuation: number;
  minInvestment: number;
  annualRevenue: number;
  arr: number;
  growthPct: number;
  runwayMonths: number;
  customers: number;
  grossMarginPct: number;
  riskLevel: "high" | "very-high";
  color: string;
  icon: string;
  tags: string[];
  sparkline: number[];
  highlights: string[];
  evidenceIds: string[];
}

export interface CitedClaim {
  text: string;
  sourceIds: string[];
  confidence: "high" | "medium" | "low";
  metric?: { key: MetricKey; value: number };
}

export interface ResearchStep {
  id: string;
  label: string;
  status: "complete" | "warning";
  detail: string;
  durationMs: number;
}

export interface ResearchResult {
  id: string;
  startupId: string;
  generatedAt: string;
  mode: "live" | "replay";
  provider: string;
  model: string;
  title: string;
  summary: string;
  recommendation: "research" | "watch" | "pass";
  matchScore: number;
  confidence: number;
  strengths: CitedClaim[];
  risks: CitedClaim[];
  diligenceQuestions: string[];
  evidence: Evidence[];
  pipeline: ResearchStep[];
  metrics: { latencyMs: number; inputTokens: number; outputTokens: number; groundingScore: number };
  guardrails: string[];
  traceId: string;
  liveError?: string;
}

export interface MatchResult {
  startup: Startup;
  score: number;
  reasons: string[];
  blockers: string[];
  maxIllustrativeCheck: number;
}

export interface EvaluationFinding {
  claim: string;
  rule: string;
  passed: boolean;
  explanation: string;
}

export interface EvaluationRun {
  version: "v1" | "v2";
  label: string;
  report: Pick<ResearchResult, "summary" | "strengths" | "risks">;
  score: number;
  passed: boolean;
  findings: EvaluationFinding[];
  latencyMs: number;
}

export interface EvaluationResult {
  id: string;
  dataset: string;
  input: string;
  startupId: string;
  rootCause: string;
  fix: string;
  runs: EvaluationRun[];
  evidence: Evidence[];
  improvement: number;
  traceId: string;
}

export interface PortfolioPosition { startupId: string; amount: number }

import { STARTUPS } from "./data";
import type { MatchResult, PortfolioPosition, Startup, Thesis } from "./types";

/** Transparent preference alignment, not a probability of returns or suitability decision. */
export function matchStartup(startup: Startup, thesis: Thesis): MatchResult {
  const reasons: string[] = [];
  const blockers: string[] = [];
  let score = 25;
  if (thesis.industries.length === 0 || thesis.industries.includes(startup.industry)) { score += 30; reasons.push(`${startup.industry} matches your interests`); }
  if (thesis.stages.length === 0 || thesis.stages.includes(startup.stage)) { score += 20; reasons.push(`${startup.stage} fits your preferred stage`); }
  const riskFit = thesis.riskAppetite === "adventurous" ? 15 : thesis.riskAppetite === "balanced" ? (startup.riskLevel === "very-high" ? 2 : 12) : (startup.riskLevel === "very-high" ? -15 : 0);
  score += riskFit;
  if (thesis.riskAppetite === "conservative") blockers.push("Private investments carry a high risk of total loss, including established small businesses.");
  if (startup.riskLevel === "very-high" && thesis.riskAppetite !== "adventurous") blockers.push("Very early stage risk exceeds your stated preference.");
  if (thesis.horizonYears >= 7) { score += 10; reasons.push("Your time horizon can accommodate a long holding period"); }
  else if (thesis.horizonYears >= 5) score += 2;
  else { score -= 25; blockers.push("Your time horizon is shorter than a typical 7–10+ year private holding period."); }
  if (startup.runwayMonths < 12) blockers.push(`${startup.runwayMonths} months of runway creates financing risk.`);
  const maxIllustrativeCheck = Math.floor(thesis.budget * thesis.maxAllocationPct / 100);
  if (maxIllustrativeCheck < startup.minInvestment) { score -= 15; blockers.push("The minimum check exceeds your chosen concentration limit."); }
  if (startup.arr > 0 && /recurring|revenue|efficient/i.test(thesis.thesis)) { score += 5; reasons.push("Recurring revenue aligns with your written thesis"); }
  return { startup, score: Math.max(0, Math.min(99, score)), reasons, blockers, maxIllustrativeCheck };
}

export function rankStartups(thesis: Thesis): MatchResult[] {
  return STARTUPS.map((startup) => matchStartup(startup, thesis)).sort((a, b) => b.score - a.score || a.startup.name.localeCompare(b.startup.name));
}

export function validateAllocation(positions: PortfolioPosition[], thesis: Thesis): { valid: boolean; issues: string[]; total: number; remaining: number } {
  const issues: string[] = [];
  const grouped = new Map<string, number>();
  for (const position of positions) {
    if (!Number.isFinite(position.amount) || position.amount < 0) { issues.push("Amounts must be finite and nonnegative."); continue; }
    if (!STARTUPS.some((startup) => startup.id === position.startupId)) { issues.push(`Unknown company: ${position.startupId}.`); continue; }
    grouped.set(position.startupId, (grouped.get(position.startupId) ?? 0) + position.amount);
  }
  const total = [...grouped.values()].reduce((sum, amount) => sum + amount, 0);
  if (total > thesis.budget) issues.push("This simulation exceeds your research budget.");
  for (const [id, amount] of grouped) {
    const startup = STARTUPS.find((item) => item.id === id)!;
    if (amount > 0 && amount < startup.minInvestment) issues.push(`${startup.name}: below the $${startup.minInvestment} minimum.`);
    if (amount > thesis.budget * thesis.maxAllocationPct / 100) issues.push(`${startup.name}: exceeds your ${thesis.maxAllocationPct}% company concentration limit.`);
  }
  return { valid: issues.length === 0, issues: [...new Set(issues)], total, remaining: Math.max(0, thesis.budget - total) };
}

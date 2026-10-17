import type { Evidence, Industry, Stage, Startup, Thesis } from "./types";

export const INDUSTRIES: Industry[] = ["Climate", "Fintech", "Healthcare", "AI & software", "Consumer", "Local business"];
export const STAGES: Stage[] = ["Pre-seed", "Seed", "Series A", "Small business"];

export const DEFAULT_THESIS: Thesis = {
  industries: ["Climate", "Fintech", "AI & software"],
  stages: ["Seed", "Series A"],
  riskAppetite: "balanced",
  horizonYears: 7,
  budget: 10000,
  maxAllocationPct: 10,
  thesis: "I back practical technology that makes essential services more accessible. I prefer recurring revenue and capital-efficient teams.",
};

// Every company, financial metric, document, and funding round in this catalog is fictional.
// The immutable evidence pack enables repeatable research and evaluator comparisons.
export const STARTUPS: Startup[] = [
  {
    id: "voltgrid", name: "VoltGrid", symbol: "VOLT", tagline: "The power grid, reimagined.",
    description: "An operating system that helps neighborhood batteries earn revenue by balancing local energy demand.",
    industry: "Climate", stage: "Seed", location: "Brooklyn, NY", founded: 2023, teamSize: 9,
    raised: 1425000, targetRaise: 2000000, valuation: 12000000, minInvestment: 250,
    annualRevenue: 840000, arr: 620000, growthPct: 68, runwayMonths: 14, customers: 23, grossMarginPct: 71,
    riskLevel: "high", color: "#c9f36a", icon: "Zap", tags: ["Clean energy", "Recurring revenue", "Infrastructure"],
    sparkline: [17, 20, 19, 26, 25, 32, 30, 37, 34, 43, 45, 52],
    highlights: ["23 paying operators", "$620K ARR", "71% gross margin"], evidenceIds: ["volt-financials", "volt-update", "volt-risk"],
  },
  {
    id: "bridgepay", name: "BridgePay", symbol: "BRDG", tagline: "Borderless business. Local payments.",
    description: "Payment and cash-flow tools for small businesses that trade across borders, starting with US–Latin America corridors.",
    industry: "Fintech", stage: "Series A", location: "Miami, FL", founded: 2021, teamSize: 24,
    raised: 3250000, targetRaise: 5000000, valuation: 28000000, minInvestment: 500,
    annualRevenue: 2100000, arr: 1800000, growthPct: 92, runwayMonths: 20, customers: 640, grossMarginPct: 62,
    riskLevel: "high", color: "#b5c9ff", icon: "ArrowLeftRight", tags: ["Payments", "Small business", "Cross-border"],
    sparkline: [18, 18, 23, 21, 29, 34, 32, 39, 46, 44, 55, 64],
    highlights: ["640 business customers", "$1.8M ARR", "92% YoY growth"], evidenceIds: ["bridge-financials", "bridge-update", "bridge-risk"],
  },
  {
    id: "careloop", name: "CareLoop", symbol: "CARE", tagline: "A little more care. A lot less waiting.",
    description: "Patient navigation software that helps independent clinics coordinate follow-ups and close gaps in care.",
    industry: "Healthcare", stage: "Seed", location: "Boston, MA", founded: 2023, teamSize: 12,
    raised: 890000, targetRaise: 1500000, valuation: 10000000, minInvestment: 100,
    annualRevenue: 510000, arr: 480000, growthPct: 54, runwayMonths: 13, customers: 18, grossMarginPct: 76,
    riskLevel: "high", color: "#ffaed1", icon: "Heart", tags: ["Digital health", "B2B software", "Patient access"],
    sparkline: [16, 20, 18, 23, 28, 29, 31, 35, 33, 42, 44, 47],
    highlights: ["18 clinic customers", "$480K ARR", "76% gross margin"], evidenceIds: ["care-financials", "care-update", "care-risk"],
  },
  {
    id: "atlas", name: "Atlas", symbol: "ATLS", tagline: "Less busywork. More building.",
    description: "An AI operations assistant that turns fragmented business documents into auditable workflows for small teams.",
    industry: "AI & software", stage: "Pre-seed", location: "San Francisco, CA", founded: 2025, teamSize: 5,
    raised: 420000, targetRaise: 1000000, valuation: 6000000, minInvestment: 100,
    annualRevenue: 96000, arr: 84000, growthPct: 120, runwayMonths: 8, customers: 32, grossMarginPct: 58,
    riskLevel: "very-high", color: "#d5bdff", icon: "Layers", tags: ["Artificial intelligence", "Workflow", "Early traction"],
    sparkline: [10, 12, 11, 18, 17, 26, 24, 34, 39, 35, 46, 56],
    highlights: ["32 paying teams", "$84K ARR", "5-person team"], evidenceIds: ["atlas-financials", "atlas-update", "atlas-risk"],
  },
  {
    id: "goodharvest", name: "Good Harvest", symbol: "GOOD", tagline: "Good food, closer to home.",
    description: "A neighborhood produce market connecting regional growers to households through subscriptions and a local storefront.",
    industry: "Local business", stage: "Small business", location: "Austin, TX", founded: 2020, teamSize: 11,
    raised: 185000, targetRaise: 300000, valuation: 1800000, minInvestment: 100,
    annualRevenue: 1250000, arr: 0, growthPct: 18, runwayMonths: 18, customers: 430, grossMarginPct: 34,
    riskLevel: "high", color: "#ffe4a0", icon: "Sprout", tags: ["Local economy", "Food access", "Expansion"],
    sparkline: [25, 26, 24, 27, 29, 28, 31, 30, 33, 35, 34, 38],
    highlights: ["430 active households", "$1.25M annual revenue", "5 years operating"], evidenceIds: ["harvest-financials", "harvest-update", "harvest-risk"],
  },
  {
    id: "rethread", name: "Rethread", symbol: "RETH", tagline: "Great things deserve a second life.",
    description: "A resale and repair platform helping independent fashion brands run their own circular commerce programs.",
    industry: "Consumer", stage: "Seed", location: "Los Angeles, CA", founded: 2022, teamSize: 8,
    raised: 670000, targetRaise: 1200000, valuation: 7500000, minInvestment: 250,
    annualRevenue: 390000, arr: 240000, growthPct: 43, runwayMonths: 10, customers: 14, grossMarginPct: 48,
    riskLevel: "high", color: "#ffc5a4", icon: "Recycle", tags: ["Circular economy", "Commerce", "Brand platform"],
    sparkline: [20, 18, 23, 25, 22, 29, 30, 28, 36, 34, 39, 42],
    highlights: ["14 partner brands", "$240K ARR", "Circular commerce"], evidenceIds: ["rethread-financials", "rethread-update", "rethread-risk"],
  },
];

const source = (id: string, startupId: string, title: string, type: Evidence["type"], excerpt: string, metrics: Evidence["metrics"] = {}): Evidence => ({
  id, startupId, title, type, excerpt, metrics, publisher: "FirstCheque · fictional demo evidence", date: "2026-10-01", url: `/api/sources/${id}`,
});

export const EVIDENCE: Evidence[] = [
  source("volt-financials", "voltgrid", "VoltGrid · financial snapshot", "Financials", "FICTIONAL DEMO DOCUMENT. VoltGrid reported $840,000 in trailing 12-month revenue, comprising $620,000 of annual recurring subscription revenue (ARR) and $220,000 of one-time installation and services revenue. Revenue grew 68% year over year. Gross margin was 71%. There were 23 paying battery operators. Annual revenue must not be described as ARR.", { annualRevenue: 840000, arr: 620000, growthPct: 68, grossMarginPct: 71, customers: 23 }),
  source("volt-update", "voltgrid", "VoltGrid · founder operating update", "Founder update", "FICTIONAL DEMO DOCUMENT. The team has nine people. Current cash provides 14 months of runway at the present burn rate. The company is raising $2 million at an indicative $12 million valuation to add utility integrations. These figures are founder-reported and unaudited.", { runwayMonths: 14, valuation: 12000000 }),
  source("volt-risk", "voltgrid", "VoltGrid · concentration & market risks", "Risk disclosure", "FICTIONAL DEMO DOCUMENT. The three largest operators contribute 46% of revenue. Utility interconnection and market-participation approvals can delay deployments. There is no active secondary market, no scheduled exit, and no guarantee that the round will close. Investors may lose their entire investment.", { customerConcentrationPct: 46 }),
  source("bridge-financials", "bridgepay", "BridgePay · financial snapshot", "Financials", "FICTIONAL DEMO DOCUMENT. Trailing annual revenue is $2.1 million, of which $1.8 million is contracted recurring platform revenue (ARR). Revenue grew 92% year over year. There are 640 paying business customers. Gross margin is 62%. Payment processing volume is not company revenue.", { annualRevenue: 2100000, arr: 1800000, growthPct: 92, customers: 640, grossMarginPct: 62 }),
  source("bridge-update", "bridgepay", "BridgePay · founder operating update", "Founder update", "FICTIONAL DEMO DOCUMENT. BridgePay has a 24-person team and 20 months of cash runway. Its indicative valuation is $28 million. It plans to expand beyond two live payment corridors. Founder figures are unaudited, and corridor expansion remains a plan.", { runwayMonths: 20, valuation: 28000000 }),
  source("bridge-risk", "bridgepay", "BridgePay · licensing & counterparty risks", "Risk disclosure", "FICTIONAL DEMO DOCUMENT. The company depends on licensed payment partners and third-party banks. Changes in partner access, compliance requirements, fraud losses, or FX settlement could materially affect revenue. Shares are illiquid and may lose all value."),
  source("care-financials", "careloop", "CareLoop · financial snapshot", "Financials", "FICTIONAL DEMO DOCUMENT. CareLoop has $510,000 of trailing annual revenue, including $480,000 ARR and $30,000 one-time onboarding services. Annual revenue growth is 54%, gross margin 76%, and the customer base is 18 clinics.", { annualRevenue: 510000, arr: 480000, growthPct: 54, grossMarginPct: 76, customers: 18 }),
  source("care-update", "careloop", "CareLoop · founder operating update", "Founder update", "FICTIONAL DEMO DOCUMENT. A 12-person team has 13 months of runway. The indicative valuation is $10 million. The next milestone is two electronic health record integrations. Claimed patient improvements have not been established in a controlled study.", { runwayMonths: 13, valuation: 10000000 }),
  source("care-risk", "careloop", "CareLoop · privacy & procurement risks", "Risk disclosure", "FICTIONAL DEMO DOCUMENT. Health data handling creates privacy and security obligations. Lengthy clinic procurement and EHR integration dependence can delay cash collection. Product outcomes are unverified. There is no liquidity promise and an investor may lose all capital."),
  source("atlas-financials", "atlas", "Atlas · financial snapshot", "Financials", "FICTIONAL DEMO DOCUMENT. Atlas reported $96,000 annual revenue, consisting of $84,000 ARR and $12,000 pilot services. There are 32 paying teams. Revenue growth is 120% from a small base. Gross margin is 58% after model inference costs.", { annualRevenue: 96000, arr: 84000, customers: 32, growthPct: 120, grossMarginPct: 58 }),
  source("atlas-update", "atlas", "Atlas · founder operating update", "Founder update", "FICTIONAL DEMO DOCUMENT. The company has five employees and eight months of runway. The indicative valuation is $6 million. Product retention beyond six months has not been measured. Model inference costs can change with provider prices.", { runwayMonths: 8, valuation: 6000000 }),
  source("atlas-risk", "atlas", "Atlas · product & financing risks", "Risk disclosure", "FICTIONAL DEMO DOCUMENT. Atlas faces model-provider dependence, commoditization, document security risks, and an urgent future funding requirement. Early growth does not establish product-market fit. Shares are illiquid and an investor may lose their entire investment."),
  source("harvest-financials", "goodharvest", "Good Harvest · financial snapshot", "Financials", "FICTIONAL DEMO DOCUMENT. Annual revenue is $1.25 million, year-over-year growth 18%, and gross margin 34%. There are 430 active households. The business has no contracted annual recurring revenue (ARR); subscriptions may be cancelled at any time.", { annualRevenue: 1250000, arr: 0, growthPct: 18, grossMarginPct: 34, customers: 430 }),
  source("harvest-update", "goodharvest", "Good Harvest · owner operating update", "Founder update", "FICTIONAL DEMO DOCUMENT. The 11-person business has an estimated 18 months of operating cash runway. Its indicative equity valuation is $1.8 million. Expansion would fund cold storage and a second neighborhood pickup location. Revenue is not profit.", { runwayMonths: 18, valuation: 1800000 }),
  source("harvest-risk", "goodharvest", "Good Harvest · operating risks", "Risk disclosure", "FICTIONAL DEMO DOCUMENT. Crop disruptions, spoilage, food safety, a single storefront lease, and thin retail margins are material risks. No dividends or buybacks have been promised. This is illiquid private equity and capital may be lost in full."),
  source("rethread-financials", "rethread", "Rethread · financial snapshot", "Financials", "FICTIONAL DEMO DOCUMENT. Annual revenue is $390,000, including $240,000 ARR from platform contracts and $150,000 transaction and repair services. Growth is 43% and gross margin 48%. Fourteen brands are paying partners. Gross merchandise value is not company revenue.", { annualRevenue: 390000, arr: 240000, growthPct: 43, grossMarginPct: 48, customers: 14 }),
  source("rethread-update", "rethread", "Rethread · founder operating update", "Founder update", "FICTIONAL DEMO DOCUMENT. The eight-person team has 10 months of runway and an indicative $7.5 million valuation. Expansion to new repair vendors is planned. Environmental benefits have not been independently verified.", { runwayMonths: 10, valuation: 7500000 }),
  source("rethread-risk", "rethread", "Rethread · retail & execution risks", "Risk disclosure", "FICTIONAL DEMO DOCUMENT. Seasonal fashion demand, return rates, inventory handling, and dependence on a small number of brands may affect outcomes. Environmental impact statements are unverified. There is no guaranteed return or liquidity; the entire investment may be lost."),
];

export function getStartup(id: string): Startup | undefined { return STARTUPS.find((startup) => startup.id === id); }
export function getEvidence(startupId: string): Evidence[] { return EVIDENCE.filter((item) => item.startupId === startupId); }

import type { DiscoveryCompany, DiscoveryMatch, DiscoveryPreferences } from "./discovery-types";
import type { Industry, Stage } from "./types";

export const DISCOVERY_SECTORS = ["AI & software", "AI infrastructure", "Developer tools", "Climate tech", "Fintech", "Healthcare", "Consumer", "Local business", "Robotics", "Space"];
export const DEFAULT_DISCOVERY_PREFERENCES: DiscoveryPreferences = {
  industries: [], stages: [], riskAppetite: "adventurous", horizonYears: 7,
  budget: 2000, maxAllocationPct: 25, thesis: "", sectors: [],
  revenueRequirement: "any", minAnnualRevenue: null, maxMinimumCheck: null,
  offeringOnly: true, includeUnverified: false, query: "", excludedSectors: [],
};

const sectorRules: Array<{ label: string; industry: Industry; expression: RegExp }> = [
  {label:"AI infrastructure",industry:"AI & software",expression:/\b(?:ai infrastructure|inference|gpu|compute|model infrastructure)\b/i},
  {label:"Developer tools",industry:"AI & software",expression:/\b(?:developer[- ]tools?|dev[- ]?tools?|developer infrastructure|coding tools?)\b/i},
  {label:"Climate tech",industry:"Climate",expression:/\b(?:climate|cleantech|clean energy|renewable|carbon|battery|batteries)\b/i},
  {label:"Fintech",industry:"Fintech",expression:/\b(?:fintech|payments?|banking)\b/i},
  {label:"Healthcare",industry:"Healthcare",expression:/\b(?:healthcare|health tech|medical|biotech)\b/i},
  {label:"Consumer",industry:"Consumer",expression:/\b(?:consumer|retail|food|beverage|fashion)\b/i},
  {label:"Local business",industry:"Local business",expression:/\b(?:local business|small business|neighborhood)\b/i},
  {label:"Robotics",industry:"AI & software",expression:/\b(?:robotics|robots?|automation hardware)\b/i},
  {label:"Space",industry:"AI & software",expression:/\b(?:space|aerospace|satellite)\b/i},
];
const amountValue = (raw: string, suffix = "") => Number(raw.replaceAll(",", "")) * (/^m|million/i.test(suffix) ? 1_000_000 : /^k|thousand/i.test(suffix) ? 1000 : 1);

/** Explicit preferences are deterministic, editable hard constraints, not inferred eligibility. */
export function parseDiscoveryBrief(brief: string, base: DiscoveryPreferences = DEFAULT_DISCOVERY_PREFERENCES) {
  const preferences: DiscoveryPreferences = { ...base, industries:[...base.industries],stages:[...base.stages],sectors:[...base.sectors],excludedSectors:[...(base.excludedSectors||[])],thesis:brief };
  const interpretation: string[] = [], warnings: string[] = [];
  const amount = "(?:\\$|USD\\s*)?([0-9]+(?:,[0-9]{3})*(?:\\.[0-9]+)?)\\s*(million|thousand|[km])?";
  const budget = brief.match(new RegExp(`\\b(?:have|budget(?:\\s+(?:of|is|to)|:)?|allocate|invest|allocation(?:\\s+of|:)?|deploy)\\s*${amount}`,"i"));
  if (budget) {
    const value = amountValue(budget[1],budget[2]);
    if (value>=100 && value<=10_000_000) {preferences.budget=value;interpretation.push(`Research budget: $${value.toLocaleString("en-US")}`);}
    else warnings.push("Budget must be between $100 and $10,000,000; the previous amount was kept.");
  }
  const risk = /\b(?:high[- ]risk|aggressive|adventurous)\b/i.test(brief) ? "adventurous" : /\b(?:low[- ]risk|conservative|cautious)\b/i.test(brief) ? "conservative" : /\b(?:moderate|balanced|medium[- ]risk)\b/i.test(brief) ? "balanced" : null;
  if (risk) {preferences.riskAppetite=risk;interpretation.push(`Risk preference: ${risk}`);}
  const positiveText=brief.replace(/\b(?:exclude|avoid|not interested in|don't want|do not want|no)\s+[^.;]+/gi, "");
  const positive=sectorRules.filter(rule=>rule.expression.test(positiveText));
  if (/\b(?:artificial intelligence|ai|software)\b/i.test(positiveText) && !positive.some(rule=>rule.industry==="AI & software")) positive.unshift({label:"AI & software",industry:"AI & software",expression:/\b(?:artificial intelligence|ai|software)\b/i});
  const negativeText=[...brief.matchAll(/\b(?:exclude|avoid|not interested in|don't want|do not want|no)\s+([^.;]+)/gi)].map(x=>x[1]).join(" ");
  const negative=sectorRules.filter(rule=>rule.expression.test(negativeText));
  if (/\b(?:artificial intelligence|ai|software)\b/i.test(negativeText) && !negative.some(rule=>rule.industry==="AI & software")) negative.unshift({label:"AI & software",industry:"AI & software",expression:/\b(?:artificial intelligence|ai|software)\b/i});
  if (positive.length) {preferences.sectors=positive.map(x=>x.label);preferences.industries=[...new Set(positive.map(x=>x.industry))];interpretation.push(`Interests: ${preferences.sectors.join(", ")}`);}
  else if (/\b(?:artificial intelligence|AI|software)\b/.test(positiveText)) {preferences.industries=["AI & software"];preferences.sectors=[];interpretation.push("Industry: AI & software");}
  if (negative.length) {preferences.excludedSectors=negative.map(x=>x.label);interpretation.push(`Exclude: ${preferences.excludedSectors.join(", ")}`);}
  const stages: Stage[]=[];
  if (/\bpre[- ]seed\b/i.test(brief)) stages.push("Pre-seed");
  if (/(?<!pre[- ])\bseed\b/i.test(brief)) stages.push("Seed");
  if (/\bseries\s*a\b/i.test(brief)) stages.push("Series A");
  if (/\bsmall business\b/i.test(brief)) stages.push("Small business");
  if (stages.length) {preferences.stages=[...new Set(stages)];interpretation.push(`Stages: ${preferences.stages.join(", ")}`);}
  if (/\b(?:pre[- ]revenue (?:is okay|is ok|allowed)|no revenue requirement|revenue optional)\b/i.test(brief)) preferences.revenueRequirement="any";
  else if (/\b(?:existing|generating|positive|with|have|has|reported)\s+(?:annual\s+)?(?:recurring\s+)?revenue\b|\brevenue[- ]generating\b|\brequire(?:s)? (?:annual )?revenue\b/i.test(brief)) preferences.revenueRequirement="reported-revenue";
  if (/\b(?:require|prefer|with|existing|reported)\s+(?:positive\s+)?(?:ARR|annual recurring revenue)\b/i.test(brief)) preferences.revenueRequirement="reported-arr";
  if (preferences.revenueRequirement!=="any") interpretation.push(preferences.revenueRequirement==="reported-arr"?"Reported ARR required; undisclosed ARR is excluded":"Reported positive annual revenue required; ARR is a separate option and unknown annual revenue is excluded");
  const minimumRevenue=brief.match(new RegExp(`(?:annual\\s+)?revenue(?:\\s+of)?\\s*(?:at least|above|over|>=)\\s*${amount}`,"i")) || brief.match(new RegExp(`at least\\s*${amount}\\s+(?:in\\s+)?(?:annual\\s+)?revenue`,"i"));
  if (minimumRevenue) {preferences.minAnnualRevenue=amountValue(minimumRevenue[1],minimumRevenue[2]);preferences.revenueRequirement="reported-revenue";interpretation.push(`Minimum reported annual revenue: $${preferences.minAnnualRevenue.toLocaleString("en-US")}`);}
  const check=brief.match(new RegExp(`(?:minimum check(?:\\s+(?:under|below|up to|of))?|checks? (?:under|below|up to)|max(?:imum)? check(?:\\s+of)?)\\s*${amount}`,"i"));
  if(check){preferences.maxMinimumCheck=amountValue(check[1],check[2]);interpretation.push(`Maximum minimum check: $${preferences.maxMinimumCheck.toLocaleString("en-US")}`);}
  const horizon=brief.match(/\b(\d{1,2})[- ]years?\b/i);
  if(horizon&&Number(horizon[1])>=1&&Number(horizon[1])<=30){preferences.horizonYears=Number(horizon[1]);interpretation.push(`Holding horizon: ${horizon[1]} years`);}
  if(/\b(?:research[- ]only|not raising|include known companies|any company)\b/i.test(brief)){preferences.offeringOnly=false;interpretation.push("Include companies without a current public offering");}
  if(!interpretation.length) warnings.push("No structured constraints detected. Review the editable filters; your full brief will still guide the research memo.");
  return {preferences,interpretation,warnings};
}

const normalized=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
function hasSector(company:DiscoveryCompany, sector:string){
  if (sector === "AI & software") return company.industry === "AI & software";
  const rule=sectorRules.find(x=>x.label===sector);
  const content=[company.name,company.description,...company.sectors].join(" ");
  return company.sectors.some(x=>normalized(x)===normalized(sector)) || (rule?rule.expression.test(content):normalized(content).includes(normalized(sector)));
}

export function filterAndRankCompanies(companies:DiscoveryCompany[],preferences:DiscoveryPreferences): {matches:DiscoveryMatch[];excluded:Array<{company:DiscoveryCompany;reasons:string[]}>} {
  const matches:DiscoveryMatch[]=[],excluded:Array<{company:DiscoveryCompany;reasons:string[]}>=[];
  for(const company of companies){
    const failures:string[]=[],reasons:string[]=[],warnings:string[]=[];
    if(preferences.query&&!normalized([company.name,company.description,...company.sectors].join(" ")).includes(normalized(preferences.query))) failures.push("Does not match your search");
    if(preferences.sectors.length&&!preferences.sectors.some(s=>hasSector(company,s))) failures.push("Outside your selected sectors");
    else if(!preferences.sectors.length&&preferences.industries.length&&!preferences.industries.includes(company.industry as Industry)) failures.push("Outside your selected industries");
    if(preferences.excludedSectors?.some(s=>hasSector(company,s))) failures.push("Matches an excluded sector");
    if(preferences.stages.length&&!preferences.stages.includes(company.stage as Stage)) failures.push(company.stage==="Unknown"?"Funding stage is not disclosed":"Outside your selected funding stages");
    if(preferences.riskAppetite==="conservative") failures.push("Early-stage private companies exceed your conservative risk preference");
    else if(preferences.riskAppetite==="balanced"&&company.riskLevel!=="high") failures.push(company.riskLevel==="very-high"?"Company risk exceeds your balanced preference":"Company risk is not documented, so balanced risk fit cannot be confirmed");
    if(preferences.offeringOnly&&(company.kind!=="offering"||company.offeringStatus!=="open")) failures.push("No currently open public offering is reported");
    const daysOld=(Date.now()-Date.parse(company.lastCheckedAt))/86_400_000;
    if(preferences.offeringOnly&&!preferences.includeUnverified&&(!Number.isFinite(daysOld)||daysOld>7)) failures.push("Offering status needs a fresh source check");
    if(company.offeringStatus==="unverified"&&!preferences.includeUnverified) failures.push("Offering status has not been confirmed from its source");
    const revenue=company.annualRevenue;
    if(preferences.revenueRequirement==="reported-revenue"&&(!(revenue!==null&&revenue>0)||!company.financialSourceUrl)) failures.push("Positive annual revenue is not verified in the retrieved sources");
    if(preferences.revenueRequirement==="reported-arr"&&(!(company.arr!==null&&company.arr>0)||!company.financialSourceUrl)) failures.push("Positive ARR is not verified in the retrieved sources");
    if(preferences.minAnnualRevenue!==null){
      if(company.financialCurrency!=="USD") failures.push("Annual revenue currency is not confirmed as USD, so your dollar threshold cannot be checked");
      else if(revenue===null||revenue<preferences.minAnnualRevenue||!company.financialSourceUrl) failures.push("Reported annual revenue does not meet your minimum");
    }
    const cap=Math.min(preferences.budget,preferences.budget*preferences.maxAllocationPct/100,preferences.maxMinimumCheck??Infinity);
    if(company.kind==="offering"){
      if(company.minInvestment!==null&&company.minInvestment>cap) failures.push(`Minimum check exceeds your $${Math.floor(cap).toLocaleString("en-US")} per-company limit`);
      else if(company.minInvestment===null&&(preferences.maxMinimumCheck!==null||preferences.offeringOnly)) failures.push("Minimum check is not disclosed, so budget fit cannot be confirmed");
    }
    if(failures.length){excluded.push({company,reasons:failures});continue;}
    let score=45;
    if(preferences.sectors.length||preferences.industries.length){score+=25;reasons.push("Matches your selected interests");}
    if(preferences.stages.length){score+=10;reasons.push("Matches your selected funding stage");}
    if(company.minInvestment!==null){score+=10;reasons.push(`Minimum check fits your $${Math.floor(cap).toLocaleString("en-US")} company limit`);}
    if(preferences.revenueRequirement!=="any"){score+=10;reasons.push("Meets your sourced revenue requirement");}
    else if(company.annualRevenue===null) warnings.push("Annual revenue is not verified in retrieved sources");
    if(company.kind==="company") warnings.push("Research company only; no public investment offering verified");
    if(!Number.isFinite(daysOld)||daysOld>7) warnings.push("Source information needs refreshing");
    if(company.financialsAsOf&&Date.now()-Date.parse(company.financialsAsOf)>548*86_400_000) warnings.push("Financial evidence is over 18 months old");
    if(!company.riskLevel||company.riskLevel==="unknown") warnings.push("Company-specific risk has not been assessed");
    if(preferences.horizonYears<7) warnings.push("Your stated horizon may be shorter than an illiquid private holding period");
    if(!reasons.length) reasons.push("Passes your selected discovery filters");
    matches.push({company,score:Math.min(99,score),reasons,warnings});
  }
  return {matches:matches.sort((a,b)=>b.score-a.score||a.company.name.localeCompare(b.company.name)),excluded};
}

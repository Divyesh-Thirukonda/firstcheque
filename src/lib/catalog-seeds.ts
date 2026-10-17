import financialRecords from "@/data/seed-financials.json";
import {companyFinancials} from "./company-financials";
import type {CompanyFinancials} from "./company-profile-types";
import logoRecords from "@/data/company-logos.json";
import type {CompanyLogoInfo} from "./company-profile-types";
import venture from "@/data/venture-companies.json";
import handoff from "@/data/event-handoff.json";
import { OFFERING_SEEDS } from "./offering-seeds";
import type { DiscoveryCompany } from "./discovery-types";

export const VENTURE_COMPANIES = venture.companies as DiscoveryCompany[];
export const EVENT_COMPANIES: DiscoveryCompany[] = handoff.profiles.map(profile => {
  const text=`${profile.sector} ${profile.description}`;
  const industry: DiscoveryCompany["industry"] = /health|medical|pharma/i.test(text) ? "Healthcare" : /finance|fintech|wealth|payments|banking/i.test(text) ? "Fintech" : /cybersecurity/i.test(text) ? "Cybersecurity" : /climate|renewable|carbon/i.test(text) ? "Climate" : /\bAI\b|software|developer/i.test(text) ? "AI & software" : "Other";
  const people=[...profile.founder.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g)].map(match=>({name:match[1],role:profile.founderRole,sourceUrl:match[2]}));
  return {
    id:`event-${profile.id}`,name:profile.name,website:profile.website,description:profile.description,
    industry,sectors:[profile.sector],stage:"Unknown",catalogOrigin:"event-handoff",kind:"company",offeringStatus:"not-listed",offeringUrl:null,platform:null,minInvestment:null,currency:"USD",
    annualRevenue:null,arr:null,financialsAsOf:null,financialSourceUrl:null,sourceUrls:profile.sources.map(source=>source.url),lastCheckedAt:profile.checkedAt,researchStatus:"not-started",riskLevel:"unknown",
    founders:people.length?people:[{name:profile.founder,role:profile.founderRole,sourceUrl:null}],capabilities:profile.capabilities.split(/;\s*/).map(value=>value.replace(/\.$/,"")),audience:profile.audience,businessModel:profile.businessModel,headquarters:null,
    profileNotes:[profile.reviewNotes,profile.evidence],profileSources:profile.sources.map(source=>({url:source.url,title:source.title,checkedAt:profile.checkedAt,publishedAt:null,method:"supplied-handoff"})),profileCheckedAt:profile.checkedAt,
  };
});
/** Review/history records and unidentified founder leads are deliberately not published as companies. */
export const CATALOG_SEEDS: DiscoveryCompany[] = [...VENTURE_COMPANIES,...EVENT_COMPANIES,...OFFERING_SEEDS].map(company=>({...company,logo:(logoRecords as Record<string,CompanyLogoInfo>)[company.id],financials:companyFinancials({...company,financials:(financialRecords as unknown as Record<string,CompanyFinancials>)[company.id]})}));

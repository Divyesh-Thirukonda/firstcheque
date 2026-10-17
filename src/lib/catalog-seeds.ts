import financialRecords from "@/data/seed-financials.json";
import { companyFinancials } from "./company-financials";
import type { CompanyFinancials } from "./company-profile-types";
import logoRecords from "@/data/company-logos.json";
import type { CompanyLogoInfo } from "./company-profile-types";
import venture from "@/data/venture-companies.json";
import handoff from "@/data/event-handoff.json";
import review from "@/data/catalog-review.json";
import commercialRecords from "@/data/event-commercial.json";
import eventWebsites from "@/data/event-websites.json";
import { OFFERING_SEEDS } from "./offering-seeds";
import type {
  DiscoveryCompany,
  EventPublishStatus,
  CommercialSignal,
  FounderLead,
} from "./discovery-types";

export const VENTURE_COMPANIES = venture.companies as DiscoveryCompany[];
export const EVENT_FOUNDER_LEADS: FounderLead[] = review.founderLeads.map(
  (person) => ({
    ...person,
    id: `founder-${person.profileUrl.split("/").pop()}`,
  }),
);
export const EVENT_COMPANIES: DiscoveryCompany[] = [
  ...handoff.profiles,
  ...review.companies,
].map((profile) => {
  const known = (value: string) =>
    /^(?:not established|not found|not verified|unknown|undisclosed)(?:[.;]|$)/i.test(
      value.trim(),
    )
      ? null
      : value;
  const text = `${profile.sector} ${profile.description}`;
  const industry: DiscoveryCompany["industry"] = /health|medical|pharma/i.test(
    text,
  )
    ? "Healthcare"
    : /finance|fintech|wealth|payments|banking/i.test(text)
      ? "Fintech"
      : /cybersecurity/i.test(text)
        ? "Cybersecurity"
        : /climate|renewable|carbon/i.test(text)
          ? "Climate"
          : /\bAI\b|software|developer/i.test(text)
            ? "AI & software"
            : "Other";
  const signals =
    (commercialRecords as Record<string, CommercialSignal[]>)[profile.id] || [];
  const commercialSources = [
    ...new Map(
      signals.map((signal) => [
        signal.sourceUrl,
        {
          url: signal.sourceUrl,
          title: "Public pricing and customer evidence",
          checkedAt: signal.checkedAt,
          publishedAt: signal.asOf,
          method: "public-page" as const,
          fetchStatus: "fetched" as const,
        },
      ]),
    ).values(),
  ];
  const people = [
    ...profile.founder.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g),
  ].map((match) => ({
    name: match[1],
    role: profile.founderRole,
    sourceUrl: match[2],
  }));
  return {
    id: `event-${profile.id}`,
    name: profile.name,
    website:
      (eventWebsites as Record<string, { url: string }>)[profile.id]?.url ||
      profile.website ||
      "",
    description: profile.description,
    industry,
    sectors: known(profile.sector) ? [profile.sector] : [],
    publishStatus: profile.publish_status as EventPublishStatus,
    ...(profile.publish_status !== "historical_founder_relationship" &&
    profile.publish_status !== "community_or_nonprofit_review"
      ? { revenueAssumption: "pre-revenue" as const }
      : {}),
    commercialSignals: signals,
    stage: "Unknown",
    catalogOrigin: "event-handoff",
    kind: "company",
    offeringStatus: "not-listed",
    offeringUrl: null,
    platform: null,
    minInvestment: null,
    currency: "USD",
    annualRevenue: null,
    arr: null,
    financialsAsOf: null,
    financialSourceUrl: null,
    sourceUrls: [
      ...new Set([
        ...profile.sources.map((source) => source.url),
        ...signals.map((signal) => signal.sourceUrl),
      ]),
    ],
    lastCheckedAt: profile.checkedAt,
    researchStatus: "not-started",
    riskLevel: "unknown",
    founders: people.length
      ? people
      : [{ name: profile.founder, role: profile.founderRole, sourceUrl: null }],
    capabilities: profile.capabilities
      .split(/;\s*/)
      .map((value) => value.replace(/\.$/, ""))
      .filter((value) => known(value)),
    audience: known(profile.audience),
    businessModel: known(profile.businessModel),
    headquarters: null,
    profileNotes: [profile.reviewNotes, profile.evidence, profile.founderRole],
    profileSources: [
      ...profile.sources.map((source) => ({
        url: source.url,
        title: source.title,
        checkedAt: profile.checkedAt,
        publishedAt: null,
        method: "supplied-handoff" as const,
      })),
      ...commercialSources,
    ],
    profileCheckedAt: profile.checkedAt,
  };
});
/** Attendee companies come first; person-only leads remain separately identifiable. */
export const CATALOG_SEEDS: DiscoveryCompany[] = [
  ...EVENT_COMPANIES,
  ...VENTURE_COMPANIES,
  ...OFFERING_SEEDS,
].map((company) => ({
  ...company,
  logo: (logoRecords as Record<string, CompanyLogoInfo>)[company.id],
  financials: companyFinancials({
    ...company,
    financials: (
      financialRecords as unknown as Record<string, CompanyFinancials>
    )[company.id],
  }),
}));

import type {
  CommercialSignal,
  DiscoveryCompany,
  FounderLead,
} from "./discovery-types";
export const COMMERCIAL_LABELS = {
  pilots: "Pilots",
  customers: "Customers",
  pricing: "Pricing",
  "customer-mix": "Customer breakdown",
  "revenue-mix": "Revenue breakdown",
  "pilot-program": "Pilot program",
};
export function eventPriority(company: DiscoveryCompany) {
  return company.catalogOrigin === "event-handoff"
    ? company.publishStatus === "profile_ready"
      ? 0
      : company.publishStatus === "company_details_need_review"
        ? 1
        : 2
    : 3;
}
export function eventStatus(company: DiscoveryCompany) {
  return company.publishStatus === "historical_founder_relationship"
    ? "Founder history"
    : company.publishStatus === "community_or_nonprofit_review"
      ? "Community project"
      : company.publishStatus === "company_details_need_review"
        ? "Details to confirm"
        : "Money Talks";
}
export function assumesPreRevenue(company: DiscoveryCompany) {
  return (
    company.revenueAssumption === "pre-revenue" &&
    company.annualRevenue === null &&
    company.arr === null &&
    !(company.commercialSignals || []).some(
      (signal) =>
        signal.kind === "customers" ||
        signal.kind === "customer-mix" ||
        /paying customers|paid customers|generat(?:es|ing) revenue/i.test(
          signal.value,
        ),
    )
  );
}
export function founderQuestions(company: DiscoveryCompany): string[] {
  if (company.publishStatus === "community_or_nonprofit_review")
    return [
      "Is this an operating business, nonprofit or informal community?",
      "How is it funded: memberships, sponsors, services, grants or donations?",
      "How many active members, recurring sponsors or partners are involved?",
      "What is your current role, and are you also building a startup?",
      "Which public website and activity metrics can we cite?",
    ];
  const kinds = new Set((company.commercialSignals || []).map((s) => s.kind));
  return [
    ...(company.publishStatus === "historical_founder_relationship"
      ? [
          `Are you still involved with ${company.name}, and what are you building now?`,
        ]
      : []),
    ...(!company.website
      ? ["What is the current company name, official website and product demo?"]
      : []),
    ...(!kinds.has("pilots")
      ? ["How many pilots are live, how many are paid, and how many converted?"]
      : ["What share of pilots convert into paying customers?"]),
    ...(!kinds.has("customers")
      ? ["How many active and paying customers do you have, as of which month?"]
      : [
          "How many reported users or organizations are paying, active customers?",
        ]),
    "Are you pre-revenue? If not, what are MRR or ARR, the currency and reporting period?",
    ...(!kinds.has("pricing")
      ? [
          "What are your pricing tiers, billing unit, contract size and typical discount?",
        ]
      : [
          "What is the realized contract value after discounts, and which pricing tier is most common?",
        ]),
    "What is the customer split by industry and company size, and how concentrated is revenue?",
  ].slice(0, 7);
}
export function founderLeadQuestions(person: FounderLead) {
  return [
    "Are you building a company now? What is its name and official website?",
    "Can you show a product demo and describe your target customer?",
    "How many live pilots and paying customers do you have?",
    "What is the pricing model, and are you pre-revenue?",
  ];
}
export function mergeCommercialSignals(
  previous: CommercialSignal[] | undefined,
  incoming: CommercialSignal[] | undefined,
): CommercialSignal[] {
  const old = previous || [],
    next = incoming || [];
  const key = (signal: CommercialSignal) =>
    `${signal.kind}:${signal.label.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
  const grouped = new Map<string, CommercialSignal[]>();
  for (const signal of next) {
    const id = key(signal);
    grouped.set(id, [...(grouped.get(id) || []), signal]);
  }
  const retained = old.filter((signal) => {
    const fresh = grouped.get(key(signal));
    return !fresh?.some(
      (row) => Date.parse(row.checkedAt) >= Date.parse(signal.checkedAt),
    );
  });
  const added = next.filter(
    (signal) =>
      !old.some(
        (row) =>
          key(row) === key(signal) &&
          Date.parse(row.checkedAt) > Date.parse(signal.checkedAt),
      ),
  );
  return [
    ...new Map(
      [...retained, ...added].map((signal) => [
        `${signal.kind}:${signal.value}`,
        signal,
      ]),
    ).values(),
  ].slice(0, 24);
}

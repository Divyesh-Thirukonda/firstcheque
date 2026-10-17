import type { DiscoveryCompany } from "./discovery-types";
import type {
  CompanyFinancial,
  CompanyFinancials,
} from "./company-profile-types";
import type { LiveDiligenceResult } from "./live-research-types";
export const FINANCIAL_LABELS = {
  annualRevenue: "Annual revenue",
  arr: "Recurring revenue (ARR)",
  valuation: "Disclosed valuation",
  runwayMonths: "Cash runway",
};
const empty = (): CompanyFinancial => ({
  value: null,
  currency: null,
  period: null,
  asOf: null,
  sourceUrl: null,
  quote: null,
  status: "not-found",
});
export function companyFinancials(
  company: DiscoveryCompany,
): CompanyFinancials {
  const financials: CompanyFinancials = {
    annualRevenue: empty(),
    arr: empty(),
    valuation: empty(),
    runwayMonths: empty(),
    ...company.financials,
  };
  for (const field of ["annualRevenue", "arr"] as const)
    if (
      !financials[field].sourceUrl &&
      company[field] !== null &&
      company.financialSourceUrl
    )
      financials[field] = {
        value: company[field],
        currency:
          field === "arr"
            ? company.arrCurrency || null
            : company.financialCurrency || null,
        period: company.financialsAsOf,
        asOf: company.financialsAsOf,
        sourceUrl: company.financialSourceUrl,
        quote: null,
        status: "source-reported",
        ...(field === "arr" ? { comparison: company.arrComparison } : {}),
      };
  return financials;
}
export function reportFinancials(
  report: LiveDiligenceResult,
): CompanyFinancials {
  return Object.fromEntries(
    Object.entries(report.financials).map(([key, field]) => [
      key,
      {
        ...field,
        sourceUrl:
          field.sourceIds
            .map(
              (id) =>
                report.sources.find(
                  (source) => source.id === id && source.status === "fetched",
                )?.url,
            )
            .find(Boolean) || null,
      },
    ]),
  ) as unknown as CompanyFinancials;
}
/** Missing evidence is not a new zero and does not erase an older sourced snapshot. */
export function mergeFinancials(
  previous: CompanyFinancials,
  incoming: CompanyFinancials,
): CompanyFinancials {
  return Object.fromEntries(
    Object.entries(previous).map(([key, old]) => {
      const next = incoming[key as keyof CompanyFinancials];
      return [
        key,
        next.status === "conflicting" ||
        (next.status === "source-reported" &&
          (!old.asOf ||
            Boolean(
              next.asOf && Date.parse(next.asOf) >= Date.parse(old.asOf),
            )))
          ? next
          : old,
      ];
    }),
  ) as CompanyFinancials;
}

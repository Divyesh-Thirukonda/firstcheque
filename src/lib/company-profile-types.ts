export interface CompanyLogoInfo {
  status: "fetched" | "unavailable";
  url: string | null;
  sourceUrl: string | null;
  website: string;
  checkedAt: string;
  sha256?: string;
  background?: string;
  method?: "website-icon" | "website-logo" | "favicon-cache";
  error?: string;
}
export interface CompanyFinancial {
  value: number | null;
  currency: string | null;
  period: string | null;
  asOf: string | null;
  sourceUrl: string | null;
  quote: string | null;
  status: "source-reported" | "not-found" | "conflicting";
  comparison?: "greater-than" | "at-least";
}
export type CompanyFinancials = Record<
  "annualRevenue" | "arr" | "valuation" | "runwayMonths",
  CompanyFinancial
>;

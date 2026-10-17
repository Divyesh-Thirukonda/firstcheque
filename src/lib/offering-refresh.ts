import type { DiscoveryCompany } from "./discovery-types";

const PLATFORM_HOSTS = new Set(["republic.com", "www.republic.com", "wefunder.com", "www.wefunder.com"]);
const RESERVED = new Set(["terms", "login", "register", "users", "documents", "crowdsafe", "invest", "companies", "investment-opportunities", "agents", "uploads", "cdn", "robots.txt"]);

/** Validate provenance before any future authorized platform integration is selected. */
export function validatedOfferingSource(company: DiscoveryCompany): URL | null {
  if (company.kind !== "offering" || !company.offeringUrl || company.offeringUrl.length > 2048) return null;
  try {
    const url = new URL(company.offeringUrl);
    const slug = url.pathname.replace(/^\/+|\/+$/g, "");
    if (url.protocol !== "https:" || url.username || url.password || url.port || url.search || url.hash || !PLATFORM_HOSTS.has(url.hostname)) return null;
    if (!/^[a-z0-9][a-z0-9._-]{0,100}$/i.test(slug) || RESERVED.has(slug.toLowerCase())) return null;
    if (!company.sourceUrls.some(source => { try { return new URL(source).href === url.href; } catch { return false; } })) return null;
    return url;
  } catch { return null; }
}

/**
 * Platform terms prohibit HTML scraping without authorization. Keep the manual
 * terms, disclose their freshness, and never treat an attempted check as open.
 * Company-website research and the separate SEC feed import remain independent.
 */
export async function refreshOffering(company: DiscoveryCompany): Promise<DiscoveryCompany> {
  const checkedAt = new Date().toISOString();
  if (company.kind !== "offering") return company;
  const source = validatedOfferingSource(company);
  if (!source) return { ...company, offeringStatus: "unverified", lastCheckedAt: checkedAt, statusEvidence: "The saved offering URL is not a supported, source-linked platform detail page. No network request was made; prior terms are retained and status is unverified." };
  const platform = source.hostname.includes("wefunder") ? "Wefunder" : "Republic";
  return {
    ...company, offeringStatus: "unverified", lastCheckedAt: checkedAt,
    statusEvidence: `${platform} source status was not refreshed: automated HTML extraction requires platform authorization. Prior manually checked terms are retained; visit the original offering page to verify current status. This attempt is not a fresh confirmation that the offering is open.`,
    minimumEvidence: company.minInvestment === null ? company.minimumEvidence : `Previously source-reported minimum: USD ${company.minInvestment}. It was not reverified by this refresh attempt.`,
  };
}

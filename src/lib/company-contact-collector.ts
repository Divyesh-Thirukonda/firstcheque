import "server-only";
import { fetchPublicPage, normalizePublicUrl } from "./safe-fetch";
import {
  extractWebsitePhones,
  sameContactDomain,
  type CompanyContacts,
} from "./company-contacts";
export async function collectCompanyContacts(
  website: string,
): Promise<CompanyContacts> {
  const checkedAt = new Date().toISOString(),
    pagesChecked: string[] = [],
    warnings: string[] = [],
    phones = new Map();
  try {
    const home = await fetchPublicPage(normalizePublicUrl(website).href, {
      timeoutMs: 8000,
    });
    if (!sameContactDomain(home.url, website))
      throw new Error(
        "The website redirected to a different company domain. Confirm the company website first.",
      );
    const retain = (page: typeof home) => {
      pagesChecked.push(page.url);
      for (const phone of extractWebsitePhones(page, website, checkedAt))
        phones.set(phone.number, phone);
    };
    retain(home);
    const links = [
      ...new Set(
        home.links.flatMap((link) => {
          try {
            const url = normalizePublicUrl(link, home.url);
            return sameContactDomain(url.href, website) &&
              /contact|about|team|impressum/i.test(url.pathname)
              ? [url.href]
              : [];
          } catch {
            return [];
          }
        }),
      ),
    ].slice(0, 3);
    const results = await Promise.allSettled(
      links.map((url) => fetchPublicPage(url, { timeoutMs: 7000 })),
    );
    for (const result of results)
      if (result.status === "fulfilled") retain(result.value);
      else warnings.push("A linked contact page could not be read.");
    return {
      phones: [...phones.values()].slice(0, 5),
      checkedAt,
      pagesChecked,
      status: phones.size ? "found" : "not-found",
      warnings,
    };
  } catch (error) {
    return {
      phones: [],
      checkedAt,
      pagesChecked,
      status: "unavailable",
      warnings: [
        error instanceof Error
          ? error.message
          : "Company contact pages could not be read.",
      ],
    };
  }
}

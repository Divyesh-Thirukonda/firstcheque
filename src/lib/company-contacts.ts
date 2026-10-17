import {
  findPhoneNumbersInText,
  parsePhoneNumberFromString,
} from "libphonenumber-js";
export interface CompanyPhone {
  number: string;
  display: string;
  sourceUrl: string;
  checkedAt: string;
  evidence: string;
  method: "website-tel-link" | "website-text";
  consent: "not-established";
}
export interface CompanyContacts {
  phones: CompanyPhone[];
  checkedAt: string;
  pagesChecked: string[];
  status: "found" | "not-found" | "unavailable";
  warnings: string[];
}
export function sameContactDomain(a: string, b: string) {
  try {
    return (
      new URL(a).hostname.replace(/^www\./, "") ===
      new URL(b).hostname.replace(/^www\./, "")
    );
  } catch {
    return false;
  }
}
export function extractWebsitePhones(
  page: { url: string; text: string; links: string[]; contactText?: string },
  website: string,
  checkedAt = new Date().toISOString(),
): CompanyPhone[] {
  if (!sameContactDomain(page.url, website)) return [];
  const found = new Map<string, CompanyPhone>();
  for (const link of page.links.filter((link) => /^tel:/i.test(link))) {
    const raw = decodeURIComponent(link.slice(4)).split(/[;?]/)[0];
    const phone = parsePhoneNumberFromString(raw);
    if (phone?.isValid() && !phone.ext)
      found.set(phone.number, {
        number: phone.number,
        display: phone.formatInternational(),
        sourceUrl: page.url,
        checkedAt,
        evidence: link,
        method: "website-tel-link",
        consent: "not-established",
      });
  }
  // Text numbers need an explicit country code: never guess a country's dialing prefix.
  const text = page.contactText || page.text;
  for (const match of findPhoneNumbersInText(text)) {
    const phone = match.number,
      excerpt = text.slice(match.startsAt, match.endsAt);
    if (
      !excerpt.trim().startsWith("+") ||
      !phone.isValid() ||
      phone.ext ||
      found.has(phone.number)
    )
      continue;
    found.set(phone.number, {
      number: phone.number,
      display: phone.formatInternational(),
      sourceUrl: page.url,
      checkedAt,
      evidence: text.slice(Math.max(0, match.startsAt - 45), match.endsAt + 45),
      method: "website-text",
      consent: "not-established",
    });
  }
  return [...found.values()].slice(0, 5);
}

/** Normalize provider RFC/ISO dates before using them in profiles or freshness comparisons. */
export function evidenceDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = Date.parse(value);
  return Number.isFinite(date)
    ? new Date(date).toISOString().slice(0, 10)
    : null;
}
/** A quoted historical date takes precedence over the publication date of a retrospective. */
export function quotedRoundDate(
  quote: string,
  publishedAt: string | null,
  checkedAt: string,
): string | null {
  const months =
    "Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?";
  const dates = [
    ...quote.matchAll(
      new RegExp(
        `\\b(?:20\\d{2}-\\d{2}-\\d{2}|(?:${months})\\s+\\d{1,2},?\\s+20\\d{2}|(?:${months})\\s+20\\d{2})\\b`,
        "gi",
      ),
    ),
  ]
    .map((m) => ({ raw: m[0], date: evidenceDate(m[0]) }))
    .filter((d) => d.date && Date.parse(d.date) <= Date.parse(checkedAt));
  const distinct = [
    ...new Set(
      dates.map((d) =>
        /\d{1,2},?\s+20\d{2}/.test(d.raw) || /^20\d{2}-/.test(d.raw)
          ? d.date!
          : d.date!.slice(0, 7),
      ),
    ),
  ];
  if (distinct.length) return distinct.length === 1 ? distinct[0] : null;
  const years=[...new Set(quote.match(/\b20\d{2}\b/g)||[])];
  if(years.length)return years.length===1&&Number(years[0])<=new Date(checkedAt).getUTCFullYear()?years[0]:null;
  const publication = evidenceDate(publishedAt);
  return publication && Date.parse(publication) <= Date.parse(checkedAt)
    ? publication
    : null;
}

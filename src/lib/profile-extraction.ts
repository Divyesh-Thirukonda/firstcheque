import { quotedRoundDate, evidenceDate } from "./evidence-dates";
import { z } from "zod";
import type { DiscoveryCompany } from "./discovery-types";
import type { DiligenceSource } from "./live-research-types";
const text = z.object({
  value: z.string().max(500).nullable(),
  sourceIds: z.array(z.string()).max(3),
  quote: z.string().max(900).nullable(),
});
const number = z.object({
  value: z.number().nullable(),
  sourceIds: z.array(z.string()).max(3),
  quote: z.string().max(900).nullable(),
});
export const researchedProfileSchema = z.object({
  description: text,
  capabilities: z.array(text).max(6),
  audience: text,
  businessModel: text,
  headquarters: text,
  foundedYear: number,
  founders: z
    .array(
      z.object({
        name: z.string().max(100),
        role: z.string().max(100),
        sourceIds: z.array(z.string()).max(3),
        quote: z.string().max(900),
      }),
    )
    .max(6),
  funding: z
    .array(
      z.object({
        stage: z.enum([
          "Pre-seed",
          "Seed",
          "Series A",
          "Series B",
          "Series C",
          "Series D",
          "Series E",
          "Series F",
          "Series G",
        ]),
        amount: z.number().nonnegative().nullable(),
        currency: z.string().nullable(),
        announcedAt: z.string().nullable(),
        sourceIds: z.array(z.string()).max(3),
        quote: z.string().max(1200),
      }),
    )
    .max(3),
  reportedMetrics: z
    .array(
      z.object({
        label: z.string().max(80),
        value: z.string().max(180),
        sourceIds: z.array(z.string()).max(3),
        quote: z.string().max(900),
      }),
    )
    .max(4),
});
const normal = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
function moneyPresent(quote: string, value: number) {
  return [
    ...quote.matchAll(
      /(?:USD|US\$|EUR|GBP|\$|€|£)\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(billion|million|thousand|bn|mn|[bmk])?\b/gi,
    ),
  ].some(
    (m) =>
      Number(m[1].replaceAll(",", "")) *
        (/^(b|bn|billion)$/i.test(m[2] || "")
          ? 1e9
          : /^(m|mn|million)$/i.test(m[2] || "")
            ? 1e6
            : /^(k|thousand)$/i.test(m[2] || "")
              ? 1e3
              : 1) ===
      value,
  );
}
/** Promote only exact supported facts; incomplete extraction does not invent a complete profile. */
export function groundedProfile(
  candidate: z.infer<typeof researchedProfileSchema> | undefined,
  sources: DiligenceSource[],
  name: string,
  checkedAt: string,
): Partial<DiscoveryCompany> {
  if (!candidate) return {};
  const supported = (fact: { sourceIds: string[]; quote: string | null }) =>
    fact.quote
      ? sources.find(
          (source) =>
            source.status === "fetched" &&
            fact.sourceIds.includes(source.id) &&
            normal(source.text).includes(normal(fact.quote!)) &&
            (source.officialCompanySource ||
              normal(fact.quote!).includes(normal(name))),
        )
      : undefined;
  const field = (fact: z.infer<typeof text>) => {
    const source = supported(fact);
    return source &&
      fact.value &&
      normal(fact.quote!).includes(normal(fact.value))
      ? { value: fact.value, source }
      : null;
  };
  const result: Partial<DiscoveryCompany> = {
    profileCheckedAt: checkedAt,
    profileFieldSources: {},
    profileSources: sources
      .filter((s) => s.status === "fetched")
      .map((s) => ({
        url: s.url,
        title: s.title,
        checkedAt: s.retrievedAt,
        publishedAt: s.publishedAt,
        method: "public-page",
        fetchStatus: "fetched",
      })),
  };
  for (const key of [
    "description",
    "audience",
    "businessModel",
    "headquarters",
  ] as const) {
    const fact = field(candidate[key]);
    if (
      fact &&
      (key !== "headquarters" ||
        /headquarter|based in/i.test(candidate[key].quote!))
    ) {
      result[key] = fact.value;
      result.profileFieldSources![key] = fact.source.url;
    }
  }
  result.capabilities = candidate.capabilities.flatMap((fact) => {
    const valid = field(fact);
    return valid ? [valid.value] : [];
  });
  const founded = supported(candidate.foundedYear);
  if (
    founded &&
    candidate.foundedYear.value !== null &&
    Number.isInteger(candidate.foundedYear.value) &&
    candidate.foundedYear.value >= 1800 &&
    candidate.foundedYear.value <= new Date(checkedAt).getUTCFullYear() &&
    /founded|established|launched/i.test(candidate.foundedYear.quote!) &&
    new RegExp(`\\b${candidate.foundedYear.value}\\b`).test(
      candidate.foundedYear.quote!,
    )
  ) {
    result.foundedYear = candidate.foundedYear.value;
    result.profileFieldSources!.foundedYear = founded.url;
  }
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  result.founders = candidate.founders.flatMap((person) => {
    const source = supported(person);
    if (
      !source ||
      !normal(person.quote).includes(normal(person.name)) ||
      !normal(person.quote).includes(normal(person.role)) ||
      !/founder/i.test(person.role)
    )
      return [];
    const related =
      new RegExp(
        `(?:founder[^.!?]{0,60}(?:of|at)\\s+${escaped}|${escaped}[^.!?]{0,90}founded\\s+by|${escaped}[^.!?]{0,60}(?:co-?founder|founder))`,
        "i",
      ).test(person.quote) ||
      (source.officialCompanySource &&
        (source.category === "founders" ||
          /^the founders\b/i.test(person.quote)));
    return related
      ? [{ name: person.name, role: person.role, sourceUrl: source.url }]
      : [];
  });
  const funding = candidate.funding
    .flatMap((round) => {
      const source = supported(round);
      if (
        !source ||
        !normal(round.quote).includes(normal(round.stage)) ||
        !/rais(?:ed|es|ing)|closed|secured|funding|financing/i.test(round.quote)
      )
        return [];
      // The round must be a completed disclosed financing, not a future plan or a valuation cap.
      if (
        /plans? to|seeks? to|targeting|hopes? to|aims? to|valuation cap|total across|total funding|cumulative/i.test(
          round.quote,
        )
      )
        return [];
      // A generated date is not evidence. Prefer the retained document's publication date.
      const date = quotedRoundDate(round.quote, source.publishedAt, checkedAt);
      const amount =
        round.amount !== null &&
        moneyPresent(round.quote, round.amount) &&
        !/(?:debt|credit facility|secondary|tender)/i.test(round.quote)
          ? round.amount
          : null;
      const currency =
        round.currency &&
        new RegExp(
          round.currency.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          "i",
        ).test(round.quote)
          ? round.currency
          : round.quote.includes("$")
            ? "$"
            : round.quote.includes("€")
              ? "EUR"
              : round.quote.includes("£")
                ? "GBP"
                : "";
      return [
        {
          stage: round.stage,
          amount,
          currency,
          announcedAt: date,
          sourceUrl: source.url,
          note: round.quote,
          basis: "disclosed-round" as const,
        },
      ];
    })
    .sort((a, b) => (b.announcedAt || "").localeCompare(a.announcedAt || ""));
  if (funding[0]) {
    result.funding = funding[0];
    result.stage = funding[0].stage;
    result.profileFieldSources!.funding = funding[0].sourceUrl;
  }
  result.reportedMetrics = candidate.reportedMetrics.flatMap((metric) => {
    const source = supported(metric);
    return source && normal(metric.quote).includes(normal(metric.value))
      ? [
          {
            label: normal(metric.quote).includes(normal(metric.label))
              ? metric.label
              : "Reported traction",
            value: metric.value,
            sourceUrl: source.url,
            asOf: evidenceDate(source.publishedAt) || checkedAt.slice(0, 10),
          },
        ]
      : [];
  });
  return result;
}

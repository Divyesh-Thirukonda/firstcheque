import test from "node:test";
import assert from "node:assert/strict";
import {
  CATALOG_SEEDS,
  EVENT_COMPANIES,
  EVENT_FOUNDER_LEADS,
  VENTURE_COMPANIES,
} from "../src/lib/catalog-seeds";
import {
  assumesPreRevenue,
  eventPriority,
  founderQuestions,
  mergeCommercialSignals,
} from "../src/lib/event-discovery";
import { companyFinancials } from "../src/lib/company-financials";
import {
  filterAndRankCompanies,
  DEFAULT_DISCOVERY_PREFERENCES,
  matchesCatalogQuery,
} from "../src/lib/discovery";
import {
  groundedProfile,
  researchedProfileSchema,
} from "../src/lib/profile-extraction";
import type { CommercialSignal } from "../src/lib/discovery-types";
import type { DiligenceSource } from "../src/lib/live-research-types";
const none = { value: null, sourceIds: [], quote: null };
const profile = () =>
  researchedProfileSchema.parse({
    description: none,
    capabilities: [],
    audience: none,
    businessModel: none,
    headquarters: none,
    foundedYear: none,
    founders: [],
    funding: [],
    reportedMetrics: [],
  });
const source = (text: string): DiligenceSource => ({
  id: "s1",
  url: "https://brand.example.com/pricing",
  title: "Acme pricing",
  text,
  status: "fetched",
  publisher: "brand.example.com",
  publishedAt: null,
  retrievedAt: "2026-10-17T00:00:00Z",
  officialCompanySource: true,
  category: "company",
  query: "",
  contentHash: "fixture",
});
test("Money Talks companies appear before the general catalog while founder leads remain separate", () => {
  assert.equal(CATALOG_SEEDS.length, 165);
  assert.ok(
    CATALOG_SEEDS.slice(0, 75).every(
      (c) => c.catalogOrigin === "event-handoff",
    ),
  );
  assert.equal(EVENT_FOUNDER_LEADS.length, 13);
  assert.equal(new Set(EVENT_FOUNDER_LEADS.map((p) => p.id)).size, 13);
  assert.ok(EVENT_COMPANIES.filter((c) => !c.website).length > 0);
  const alchemy = EVENT_COMPANIES.find(
    (c) => c.id === "event-alchemy-jason-kende",
  )!;
  assert.equal(alchemy.website, "");
  assert.equal(alchemy.publishStatus, "historical_founder_relationship");
  assert.match(alchemy.profileNotes!.join(" "), /blockchain/);
  assert.ok(
    founderQuestions(alchemy).some((q) => q.includes("still involved")),
  );
  const ranked = filterAndRankCompanies(
    [VENTURE_COMPANIES[0], EVENT_COMPANIES[0]],
    {
      ...DEFAULT_DISCOVERY_PREFERENCES,
      offeringOnly: false,
      industries: [],
      sectors: [],
      stages: [],
      revenueRequirement: "any",
      riskAppetite: "adventurous",
    },
  ).matches;
  assert.equal(ranked[0].company.catalogOrigin, "event-handoff");
  assert.ok(
    eventPriority(EVENT_COMPANIES[0]) < eventPriority(VENTURE_COMPANIES[0]),
  );
});
test("assumed pre-revenue is a labeled planning assumption and cannot satisfy financial filters", () => {
  const company = EVENT_COMPANIES.find((c) => c.id === "event-alethical")!;
  assert.ok(assumesPreRevenue(company));
  assert.equal(company.annualRevenue, null);
  assert.equal(companyFinancials(company).arr.value, null);
  assert.equal(
    filterAndRankCompanies([company], {
      ...DEFAULT_DISCOVERY_PREFERENCES,
      offeringOnly: false,
      riskAppetite: "adventurous",
      revenueRequirement: "reported-revenue",
    }).matches.length,
    0,
  );
  assert.equal(assumesPreRevenue({ ...company, arr: 10000 }), false);
});
test("public plans and downstream customer cases stay separate from company revenue and direct customer counts", () => {
  const kojable = EVENT_COMPANIES.find((c) => c.id === "event-kojable")!;
  assert.ok(kojable.commercialSignals?.some((s) => s.value === "$99/mo"));
  assert.equal(kojable.annualRevenue, null);
  assert.equal(kojable.arr, null);
  assert.ok(matchesCatalogQuery(kojable, "pricing"));
  const nxt = EVENT_COMPANIES.find((c) => c.id === "event-nxtconnect-ai")!;
  assert.ok(nxt.commercialSignals?.some((s) => s.label.includes("downstream")));
  assert.ok(!nxt.commercialSignals?.some((s) => s.kind === "customers"));
  assert.equal(assumesPreRevenue(nxt), false);
  for (const company of EVENT_COMPANIES)
    for (const signal of company.commercialSignals || []) {
      assert.ok(signal.quote.includes(signal.value), company.name);
      assert.match(signal.sourceUrl, /^https:\/\//);
      assert.ok(Number.isFinite(Date.parse(signal.checkedAt)));
    }
});
test("live commercial facts require verbatim evidence and reject demos, workflow counts and competitor figures", () => {
  const input = profile();
  const quote =
    "Acme serves 12 paying customers. Starter costs $99 per month, billed monthly.";
  input.commercialSignals = [
    {
      kind: "customers",
      label: "Customers",
      value: "12 paying customers",
      quote,
      sourceIds: ["s1"],
    },
    {
      kind: "pricing",
      label: "Starter",
      value: "$99 per month",
      quote,
      sourceIds: ["s1"],
    },
  ];
  const kept = groundedProfile(
    input,
    [source(quote)],
    "Acme",
    "2026-10-17",
  ).commercialSignals!;
  assert.equal(kept.length, 2);
  assert.equal(kept[0].asOf, null);
  for (const text of [
    "Illustrative demo data: Acme serves 12 paying customers.",
    "Acme compares a competitor with 12 paying customers.",
  ]) {
    input.commercialSignals = [
      {
        kind: "customers",
        label: "Customers",
        value: "12 paying customers",
        quote: text,
        sourceIds: ["s1"],
      },
    ];
    assert.equal(
      groundedProfile(input, [source(text)], "Acme", "2026-10-17")
        .commercialSignals?.length,
      0,
    );
  }
  const pilot = "Our pilot starts with 2 workflows.";
  input.commercialSignals = [
    {
      kind: "pilots",
      label: "Pilots",
      value: "2",
      quote: pilot,
      sourceIds: ["s1"],
    },
  ];
  assert.equal(
    groundedProfile(input, [source(pilot)], "Acme", "2026-10-17")
      .commercialSignals?.length,
    0,
  );
  const numberedScope = "Our pilot 1–2 workflows are scoped per pharmacy.";
  input.commercialSignals[0].quote = numberedScope;
  assert.equal(
    groundedProfile(input, [source(numberedScope)], "Acme", "2026-10-17")
      .commercialSignals?.length,
    0,
  );
  input.commercialSignals[0] = {
    kind: "pilot-program",
    label: "Pilot scope",
    value: "2 workflows",
    quote: pilot,
    sourceIds: ["s1"],
  };
  assert.equal(
    groundedProfile(input, [source(pilot)], "Acme", "2026-10-17")
      .commercialSignals?.length,
    1,
  );
});
test("commercial refresh replaces an updated pricing snapshot and retains topics missing from the new result", () => {
  const signal = (
    kind: CommercialSignal["kind"],
    value: string,
    date: string,
  ): CommercialSignal => ({
    kind,
    label: "Published pricing",
    value,
    quote: value,
    sourceUrl: "https://brand.example.com/pricing",
    checkedAt: date,
    asOf: null,
  });
  const old = [
    signal("pricing", "$49/mo", "2026-01-01"),
    signal("customers", "12 customers", "2026-02-01"),
  ];
  const next = mergeCommercialSignals(old, [
    signal("pricing", "$99/mo", "2026-10-17"),
    signal("pricing", "$199/mo", "2026-10-17"),
  ]);
  assert.equal(next.length, 3);
  assert.ok(!next.some((s) => s.value === "$49/mo"));
  assert.ok(next.some((s) => s.value === "12 customers"));
  assert.equal(mergeCommercialSignals(old, []).length, 2);
});

test("a misplaced commercial wrapper is recovered while uncited placeholders still fail grounding", async () => {
  const { parseWebReport, groundedClaims } =
    await import("../src/lib/web-research");
  const quote = "Acme Starter costs $99 per month.";
  const empty = {
    value: null,
    currency: null,
    period: null,
    sourceIds: [],
    quote: null,
  };
  const parsed = parseWebReport(
    JSON.stringify({
      profile: profile(),
      commercialSignals: [
        {
          kind: "pricing",
          label: "Starter price",
          value: "$99 per month",
          quote,
          sourceIds: ["s1"],
        },
      ],
      title: "Acme",
      summary: "Public research",
      sections: [
        {
          category: "market",
          title: "Market",
          summary: "Unknown",
          claims: [
            {
              text: "No evidence found",
              quote: "No evidence found",
              sourceIds: [],
            },
          ],
        },
      ],
      financials: {
        annualRevenue: empty,
        arr: empty,
        valuation: empty,
        runwayMonths: empty,
      },
      missingEvidence: [],
      conflicts: [],
      diligenceQuestions: ["Who are the customers?", "What is the revenue?"],
    }),
  );
  assert.equal(parsed.profile.commercialSignals?.length, 1);
  assert.equal(
    groundedClaims(parsed.sections[0].claims, [source(quote)]).claims.length,
    0,
  );
  assert.equal(
    groundedProfile(parsed.profile, [source(quote)], "Acme", "2026-10-17")
      .commercialSignals?.[0].value,
    "$99 per month",
  );
});

test("omitted optional profile lists stay empty rather than discarding a sourced report", () => {
  const candidate = profile() as Record<string, unknown>;
  for (const key of ["reportedMetrics", "founders", "funding", "capabilities"])
    delete candidate[key];
  const result = researchedProfileSchema.parse(candidate);
  assert.deepEqual(result.reportedMetrics, []);
  assert.deepEqual(result.founders, []);
  assert.deepEqual(result.funding, []);
  assert.deepEqual(result.capabilities, []);
});

test("builder icons are excluded on customer sites while the builder can use its own brand", async () => {
  const { isGenericBuilderLogo } =
    await import("../src/lib/company-logo-collector");
  const triangle =
    "93d974188f770765cbbe050a8f491672d6e37748e5896a40c2581963139be900";
  assert.equal(isGenericBuilderLogo(triangle, "https://palura.net"), true);
  assert.equal(isGenericBuilderLogo(triangle, "https://vercel.com"), false);
});

test("PillPilot's observed official-domain redirect merges a live .com report into its event profile", async () => {
  const { mergeCatalogCompanies } = await import("../src/lib/dossier-store");
  const seed = EVENT_COMPANIES.find((company) => company.name === "PillPilot")!;
  assert.equal(seed.website, "https://www.pillpilot.com/");
  const merged = mergeCatalogCompanies(EVENT_COMPANIES, [
    {
      ...seed,
      id: "live-pillpilot",
      industry: "Other",
      sectors: [],
      commercialSignals: [],
    },
  ]);
  assert.equal(merged.length, 75);
  assert.equal(
    merged.find((company) => company.name === "PillPilot")?.industry,
    "Healthcare",
  );
  assert.equal(
    merged.filter((company) => company.name === "PillPilot").length,
    1,
  );
  assert.equal(
    merged.find((company) => company.name === "PillPilot")?.catalogOrigin,
    "event-handoff",
  );
});

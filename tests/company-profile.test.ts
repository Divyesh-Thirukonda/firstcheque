import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  normalizedLogo,
  websiteIconCandidates,
} from "../src/lib/company-logo-collector";
import {
  researchedProfileSchema,
  groundedProfile,
} from "../src/lib/profile-extraction";
import {
  companyFinancials,
  mergeFinancials,
} from "../src/lib/company-financials";
import { mergeCatalogCompanies } from "../src/lib/dossier-store";
import { CATALOG_SEEDS } from "../src/lib/catalog-seeds";
import { validateFinancialEvidence } from "../src/lib/web-research";
import type { DiligenceSource } from "../src/lib/live-research-types";
const source = (text: string): DiligenceSource => ({
  id: "s1",
  url: "https://example.com/news",
  title: "Company release",
  publisher: "example.com",
  publishedAt: "2026-01-15T00:00:00Z",
  retrievedAt: "2026-10-17T00:00:00Z",
  category: "company",
  query: "",
  text,
  contentHash: "fixture",
  officialCompanySource: true,
  status: "fetched",
});
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
test("website logo candidates resolve published assets and reject site-builder defaults or unrelated pictures", () => {
  const candidates = websiteIconCandidates(
    '<link rel="icon" href="https://static.parastorage.com/client/pfavico.ico"><link rel="apple-touch-icon" href="/touch.png"><meta property="og:image" content="/founder.jpg"><img alt="Example" src="/brand.png"><img alt="Customer" src="/customer.png">',
    "https://example.com/about",
    "Example",
  );
  assert.deepEqual(
    candidates.map((c) => c.url),
    [
      "https://example.com/touch.png",
      "https://example.com/brand.png",
      "https://example.com/favicon.ico",
    ],
  );
});
test("normalized images retain actual artwork and reject active SVGs, empty and oversized images", async () => {
  const icon = await normalizedLogo(
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="18" fill="white"/></svg>',
    ),
    "image/svg+xml",
  );
  assert.equal((await sharp(icon.png).metadata()).format, "png");
  assert.equal(icon.background, "#171717");
  for (const svg of [
    "<svg><script>alert(1)</script></svg>",
    '<svg><image href="https://evil.example/a"/></svg>',
    '<svg><rect onload="bad()"/></svg>',
  ])
    await assert.rejects(
      normalizedLogo(Buffer.from(svg), "image/svg+xml"),
      /active or external/,
    );
  await assert.rejects(
    normalizedLogo(
      await sharp({
        create: { width: 10, height: 10, channels: 4, background: "#0000" },
      })
        .png()
        .toBuffer(),
      "image/png",
    ),
    /transparent or empty/,
  );
});
test("every retained seed logo is a small local PNG matching its source receipt", async () => {
  const fetched = CATALOG_SEEDS.filter((c) => c.logo?.status === "fetched");
  assert.ok(fetched.length >= 115);
  for (const c of fetched) {
    const bytes = await readFile(`public${c.logo!.url}`);
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      c.logo!.sha256,
      c.name,
    );
    assert.ok(bytes.length <= 28000);
    assert.equal((await sharp(bytes).metadata()).format, "png");
    assert.match(c.logo!.sourceUrl!, /^https:\/\//);
  }
  for (const c of CATALOG_SEEDS) {
    assert.deepEqual(Object.keys(companyFinancials(c)).sort(), [
      "annualRevenue",
      "arr",
      "runwayMonths",
      "valuation",
    ]);
    for (const f of Object.values(companyFinancials(c)))
      if (f.value !== null) {
        assert.ok(f.sourceUrl, c.name);
        assert.ok(f.asOf, c.name);
      }
  }
});
test("profile promotion requires exact evidence, company attribution and source dates", () => {
  const text =
    "Example makes email tools. Example was founded by Ada Lin. Ada Lin is co-founder of Example. Example raised $20 million Series A funding.";
  const input = profile();
  input.description = {
    value: "makes email tools",
    quote: "Example makes email tools.",
    sourceIds: ["s1"],
  };
  input.founders = [
    {
      name: "Ada Lin",
      role: "co-founder",
      quote: "Ada Lin is co-founder of Example.",
      sourceIds: ["s1"],
    },
  ];
  input.funding = [
    {
      stage: "Series A",
      amount: 20000000,
      currency: "USD",
      announcedAt: "2026-08-01",
      quote: "Example raised $20 million Series A funding.",
      sourceIds: ["s1"],
    },
  ];
  const result = groundedProfile(
    input,
    [source(text)],
    "Example",
    "2026-10-17T00:00:00Z",
  );
  assert.equal(result.description, "makes email tools");
  assert.equal(result.founders?.[0]?.name, "Ada Lin");
  assert.equal(result.funding?.currency, "$");
  assert.equal(result.funding?.announcedAt, "2026-01-15");
  input.description.value = "invented ARR";
  assert.equal(
    groundedProfile(input, [source(text)], "Example", "2026-10-17").description,
    undefined,
  );
  input.funding[0].quote =
    "Example plans to raise $20 million Series A funding.";
  assert.equal(
    groundedProfile(
      input,
      [source(input.funding[0].quote)],
      "Example",
      "2026-10-17",
    ).funding,
    undefined,
  );
});
test("dated financials survive missing, undated or older research and keep revenue filters consistent", () => {
  const company = CATALOG_SEEDS.find((c) => c.arr !== null)!;
  assert.ok(company);
  const previous = companyFinancials(company),
    empty = companyFinancials({
      ...company,
      arr: null,
      annualRevenue: null,
      financials: undefined,
    });
  assert.equal(mergeFinancials(previous, empty).arr.value, previous.arr.value);
  const stale = {
    ...empty,
    arr: { ...previous.arr, asOf: "2020-01-01", value: 1 },
  };
  assert.equal(mergeFinancials(previous, stale).arr.value, previous.arr.value);
  const merged = mergeCatalogCompanies(
    [company],
    [
      {
        ...company,
        financials: empty,
        arr: null,
        annualRevenue: null,
        profileCheckedAt: "2026-10-17",
      },
    ],
  )[0];
  assert.equal(merged.arr, previous.arr.value);
  assert.equal(merged.arrCurrency, previous.arr.currency);
});
test("financial qualifiers and source snapshots remain distinct from forecasts and run rate", () => {
  const quote = "Example ARR surpassed $100 million.";
  const candidate = {
    value: 100000000,
    currency: null,
    period: null,
    quote,
    sourceIds: ["s1"],
  };
  const result = validateFinancialEvidence(
    candidate,
    "arr",
    [source(quote)],
    "Example",
  );
  assert.equal(result.value, 100000000);
  assert.equal(result.comparison, "greater-than");
  assert.equal(result.asOf, "2026-01-15");
  for (const quote of [
    "Example contracted ARR was $100 million in 2025.",
    "Example ARR run rate was $100 million in 2025.",
    "Example targets ARR of $100 million in 2025.",
  ])
    assert.equal(
      validateFinancialEvidence(
        { ...candidate, quote },
        "arr",
        [source(quote)],
        "Example",
      ).value,
      null,
    );
});

test("provider dates normalize and historical round dates do not become article dates", async () => {
  const { evidenceDate, quotedRoundDate } =
    await import("../src/lib/evidence-dates");
  assert.equal(evidenceDate("Fri, 28 Aug 2026 01:00:00 GMT"), "2026-08-28");
  assert.equal(
    quotedRoundDate(
      "Example raised $18 million Series A funding in December 2024.",
      "2026-08-28",
      "2026-10-17",
    ),
    "2024-12",
  );
  assert.equal(
    quotedRoundDate(
      "Example raises $18M Series A Dec 4, 2024",
      "2026-08-28",
      "2026-10-17",
    ),
    "2024-12-04",
  );
  assert.equal(
    quotedRoundDate(
      "Example raised $18M Series A.",
      "2027-08-28",
      "2026-10-17",
    ),
    null,
  );
  const input = profile();
  input.funding = [
    {
      stage: "Pre-seed",
      amount: 500000,
      currency: "$",
      announcedAt: null,
      sourceIds: ["s1"],
      quote:
        "Example raised $21.5M total across three rounds: $500K pre-seed (April 2023)",
    },
  ];
  assert.equal(
    groundedProfile(
      input,
      [source(input.funding[0].quote)],
      "Example",
      "2026-10-17",
    ).funding,
    undefined,
  );
});

test("a qualifier on valuation does not turn exact ARR into a lower bound", () => {
  const quote =
    "Example ARR was $100 million in 2025 and valuation was over $1 billion.";
  const result = validateFinancialEvidence(
    {
      value: 100000000,
      currency: null,
      period: "2025",
      quote,
      sourceIds: ["s1"],
    },
    "arr",
    [source(quote)],
    "Example",
  );
  assert.equal(result.value, 100000000);
  assert.equal(result.comparison, undefined);
});

test("name-only research uses an observed matching domain and title, never a guessed website", async () => {
  const { inferCompanyWebsite } = await import("../src/lib/web-research");
  assert.equal(
    inferCompanyWebsite([{ ...source(""), title: "Example" }], "Example"),
    "https://example.com/",
  );
  assert.equal(
    inferCompanyWebsite(
      [{ ...source(""), title: "Another company" }],
      "Example",
    ),
    null,
  );
  assert.equal(
    inferCompanyWebsite(
      [
        {
          ...source(""),
          url: "https://directory.example.net/example",
          title: "Example",
        },
      ],
      "Example",
    ),
    null,
  );
  assert.equal(
    inferCompanyWebsite(
      [
        { ...source(""), title: "Example" },
        { ...source(""), url: "https://example.ai", title: "Example" },
      ],
      "Example",
    ),
    null,
  );
});

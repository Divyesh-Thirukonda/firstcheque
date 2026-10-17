import test from "node:test";
import assert from "node:assert/strict";
import { CATALOG_SEEDS, EVENT_COMPANIES, VENTURE_COMPANIES } from "../src/lib/catalog-seeds";
import review from "../src/data/catalog-review.json";
import { DEFAULT_DISCOVERY_PREFERENCES,filterAndRankCompanies,matchesCatalogQuery,parseDiscoveryBrief } from "../src/lib/discovery";
import { isDiscoveryPreferences,createSearchThread,hydrateSearchThreads } from "../src/lib/search-threads";
import { mergeCatalogCompanies } from "../src/lib/dossier-store";

test("80 sourced venture profiles provide four companies per industry in every A–D stage",()=>{
  assert.equal(VENTURE_COMPANIES.length,80);
  for(const stage of ["Series A","Series B","Series C","Series D"]){
    const companies=VENTURE_COMPANIES.filter(company=>company.stage===stage);assert.equal(companies.length,20,stage);
    for(const industry of ["AI & software","Cybersecurity","Fintech","Healthcare","Climate"])assert.equal(companies.filter(company=>company.industry===industry).length,4,`${stage}: ${industry}`);
  }
  assert.equal(new Set(CATALOG_SEEDS.map(company=>company.id)).size,CATALOG_SEEDS.length);
  assert.equal(new Set([...VENTURE_COMPANIES,...EVENT_COMPANIES].map(company=>new URL(company.website).hostname.replace(/^www\./,""))).size,114);
  for(const company of VENTURE_COMPANIES){assert.ok(company.funding?.sourceUrl.startsWith("https://"));assert.ok(company.profileSources?.length);assert.equal(company.researchStatus,"not-started");assert.ok(company.capabilities?.length);assert.ok(company.audience);}
});
test("the handoff publishes only 34 profile-ready companies, preserving 41 reviews and 13 person-only leads",()=>{
  assert.equal(EVENT_COMPANIES.length,34);assert.equal(review.companies.length,41);assert.equal(review.founderLeads.length,13);
  assert.ok(EVENT_COMPANIES.every(company=>company.stage==="Unknown"&&company.arr===null&&company.annualRevenue===null&&company.minInvestment===null&&company.offeringUrl===null));
  for(const record of review.companies)assert.ok(!EVENT_COMPANIES.some(company=>company.id===`event-${record.id}`));
});
test("basic search matches founders, product capabilities and audiences from stored facts",()=>{
  const find=(query:string)=>CATALOG_SEEDS.filter(company=>matchesCatalogQuery(company,query)).map(company=>company.name);
  assert.ok(find("Zain Asgar").includes("Gimlet Labs"));assert.ok(find("optical circuit switching").includes("Salience Labs"));assert.ok(find("registered dietitian").includes("Nourish"));
  assert.ok(find("Eugene Lopin").includes("Alethical"));assert.equal(find("totallyunknownword").length,0);
  assert.ok(CATALOG_SEEDS.filter(company=>matchesCatalogQuery(company,"Series B")).every(company=>company.stage==="Series B"));
  assert.ok(!matchesCatalogQuery({...EVENT_COMPANIES[0],name:"Retail business",website:"https://example.com",description:"Retail business",industry:"Consumer",sectors:[],capabilities:[],founders:[],audience:null,businessModel:null,headquarters:null},"AI"));
});
test("Series B–D and cybersecurity briefs survive validation, ranking and saved-search hydration",()=>{
  const {preferences}=parseDiscoveryBrief("Find Series B-D cybersecurity companies");
  assert.equal(preferences.offeringOnly,false);assert.deepEqual(preferences.stages,["Series B","Series C","Series D"]);assert.ok(isDiscoveryPreferences(preferences));
  const matches=filterAndRankCompanies(VENTURE_COMPANIES,preferences).matches;assert.equal(matches.length,12);assert.ok(matches.every(match=>match.company.industry==="Cybersecurity"));
  const thread=createSearchThread(preferences,matches.map(match=>match.company.id));assert.deepEqual(hydrateSearchThreads(JSON.stringify([thread]))[0].preferences.stages,preferences.stages);
});
test("completed funding rounds never pass the open-offering filter; contracted and run-rate claims cannot satisfy ARR",()=>{
  assert.equal(filterAndRankCompanies(VENTURE_COMPANIES,DEFAULT_DISCOVERY_PREFERENCES).matches.length,0);
  const result=filterAndRankCompanies(VENTURE_COMPANIES,{...DEFAULT_DISCOVERY_PREFERENCES,offeringOnly:false,revenueRequirement:"reported-arr"});
  assert.deepEqual(result.matches.map(match=>match.company.name),["Pentera"]);
  const pentera=result.matches[0].company;assert.equal(pentera.arrComparison,"greater-than");assert.equal(pentera.financialsAsOf,"2026-01-06");
  assert.equal(filterAndRankCompanies(VENTURE_COMPANIES,{...DEFAULT_DISCOVERY_PREFERENCES,offeringOnly:false,revenueRequirement:"reported-revenue"}).matches.length,0);
  const byName=(name:string)=>VENTURE_COMPANIES.find(company=>company.name===name)!;
  assert.equal(byName("GMI Cloud").funding?.amount,223000000);assert.equal(byName("Antares").funding?.amount,370000000);assert.equal(byName("Lunar Energy").funding?.amount,102000000);
  assert.ok(!VENTURE_COMPANIES.some(company=>company.name==="Temporal"));
});
test("live reports enrich seeded companies by website without duplicate cards, lost facts or a stale ARR qualifier",()=>{
  const seed=VENTURE_COMPANIES.find(company=>company.name==="Pentera")!;
  const saved={...seed,id:"legacy-pentera",website:"https://www.pentera.io/",description:"Public source evidence is retained",arr:150000000,arrComparison:undefined,researchStatus:"complete" as const,dossierId:"dossier-legacy-pentera"};
  const merged=mergeCatalogCompanies([seed],[saved]);assert.equal(merged.length,1);assert.equal(merged[0].id,"legacy-pentera");assert.equal(merged[0].arrComparison,undefined);assert.equal(merged[0].description,seed.description);assert.equal(merged[0].funding?.stage,"Series D");assert.ok(merged[0].capabilities?.length);
});

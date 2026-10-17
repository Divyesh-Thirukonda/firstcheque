import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_DISCOVERY_PREFERENCES,filterAndRankCompanies,parseDiscoveryBrief } from "../src/lib/discovery";
import type { DiscoveryCompany } from "../src/lib/discovery-types";
const company:DiscoveryCompany={id:"a",name:"Example",website:"https://example.com",description:"AI infrastructure for inference teams",industry:"AI & software",sectors:["AI infrastructure"],stage:"Seed",kind:"offering",offeringStatus:"open",offeringUrl:"https://example.com/offering",platform:"Example",minInvestment:100,currency:"USD",annualRevenue:100000,arr:60000,financialsAsOf:"2026-09-30",financialSourceUrl:"https://example.com/financials",sourceUrls:["https://example.com/offering"],lastCheckedAt:new Date().toISOString(),researchStatus:"not-started"};
test("the actual product pitch becomes editable explicit budget, risk, sectors and revenue constraints",()=>{
  const {preferences}=parseDiscoveryBrief("I have $2,000 to allocate to high-risk startup investments. I'm interested in AI infrastructure, developer tools, and climate tech. I prefer companies with existing revenue.");
  assert.equal(preferences.budget,2000);assert.equal(preferences.riskAppetite,"adventurous");
  assert.deepEqual(preferences.sectors,["AI infrastructure","Developer tools","Climate tech"]);
  assert.equal(preferences.revenueRequirement,"reported-revenue");
});
test("unknown, zero and unsourced revenue fail a required-revenue filter rather than becoming zero or a bonus",()=>{
  const prefs={...DEFAULT_DISCOVERY_PREFERENCES,revenueRequirement:"reported-revenue" as const};
  for(const patch of [{annualRevenue:null},{annualRevenue:0},{financialSourceUrl:null}]){
    const result=filterAndRankCompanies([{...company,...patch}],prefs);assert.equal(result.matches.length,0);assert.equal(result.excluded.length,1);
  }
  assert.equal(filterAndRankCompanies([company],prefs).matches.length,1);
});
test("budget, company concentration, exact sector, stage, exclusion and source status are hard constraints",()=>{
  for(const patch of [{minInvestment:501},{sectors:["Climate tech"],description:"Solar projects",industry:"Climate" as const},{stage:"Unknown" as const},{offeringStatus:"closed" as const},{lastCheckedAt:"2020-01-01"}]){
    const prefs={...DEFAULT_DISCOVERY_PREFERENCES,sectors:["AI infrastructure"],stages:["Seed" as const]};
    assert.equal(filterAndRankCompanies([{...company,...patch}],prefs).matches.length,0,JSON.stringify(patch));
  }
  assert.equal(filterAndRankCompanies([company],{...DEFAULT_DISCOVERY_PREFERENCES,excludedSectors:["AI infrastructure"]}).matches.length,0);
});
test("reported ARR requirements cannot be met by total revenue and research-only companies are not offerings",()=>{
  assert.equal(filterAndRankCompanies([{...company,arr:null}],{...DEFAULT_DISCOVERY_PREFERENCES,revenueRequirement:"reported-arr"}).matches.length,0);
  const research={...company,kind:"company" as const,offeringStatus:"not-listed" as const,minInvestment:null};
  assert.equal(filterAndRankCompanies([research],DEFAULT_DISCOVERY_PREFERENCES).matches.length,0);
  const result=filterAndRankCompanies([research],{...DEFAULT_DISCOVERY_PREFERENCES,offeringOnly:false});
  assert.equal(result.matches.length,1);assert.ok(result.matches[0].warnings.some(w=>w.includes("no public investment offering")));
});
test("unknown minimum checks cannot silently satisfy an explicit maximum",()=>{
  const result=filterAndRankCompanies([{...company,minInvestment:null}],{...DEFAULT_DISCOVERY_PREFERENCES,maxMinimumCheck:500});
  assert.equal(result.matches.length,0);assert.ok(result.excluded[0].reasons.some(r=>r.includes("not disclosed")));
});
test("check sizes and budgets do not become revenue thresholds; dollar revenue requires USD evidence",()=>{
  assert.equal(parseDiscoveryBrief("I have at least $2,000 to invest, with minimum checks under $500").preferences.minAnnualRevenue,null);
  assert.equal(parseDiscoveryBrief("I want at least $1 million annual revenue").preferences.minAnnualRevenue,1_000_000);
  assert.equal(parseDiscoveryBrief("Annual revenue above $1m").preferences.minAnnualRevenue,1_000_000);
  const prefs={...DEFAULT_DISCOVERY_PREFERENCES,minAnnualRevenue:50000};
  for(const financialCurrency of [null,"EUR","$"]){
    assert.equal(filterAndRankCompanies([{...company,financialCurrency}],prefs).matches.length,0);
  }
  assert.equal(filterAndRankCompanies([{...company,financialCurrency:"USD"}],prefs).matches.length,1);
});
test("a risk preference excludes incompatible and unknown risk instead of awarding a soft match",()=>{
  assert.equal(filterAndRankCompanies([company],{...DEFAULT_DISCOVERY_PREFERENCES,riskAppetite:"conservative"}).matches.length,0);
  assert.equal(filterAndRankCompanies([{...company,riskLevel:"very-high"}],{...DEFAULT_DISCOVERY_PREFERENCES,riskAppetite:"balanced"}).matches.length,0);
  assert.equal(filterAndRankCompanies([{...company,riskLevel:"unknown"}],{...DEFAULT_DISCOVERY_PREFERENCES,riskAppetite:"balanced"}).matches.length,0);
  assert.equal(filterAndRankCompanies([{...company,riskLevel:"high"}],{...DEFAULT_DISCOVERY_PREFERENCES,riskAppetite:"balanced"}).matches.length,1);
});
test("ordinary AI-or-climate briefs preserve both interests and the annual revenue rule",()=>{
  const {preferences}=parseDiscoveryBrief("I have $2,000 to invest in AI or climate startups. I am comfortable with high risk and prefer companies with existing annual revenue.");
  assert.deepEqual(preferences.sectors,["AI & software","Climate tech"]);
  assert.equal(preferences.revenueRequirement,"reported-revenue");
  assert.equal(filterAndRankCompanies([company],preferences).matches.length,1);
  const climate={...company,id:"climate",industry:"Climate" as const,sectors:["Climate tech"],description:"Clean energy"};
  assert.equal(filterAndRankCompanies([climate],preferences).matches.length,1);
  assert.equal(parseDiscoveryBrief("I prefer companies with annual revenue.").preferences.revenueRequirement,"reported-revenue");
});

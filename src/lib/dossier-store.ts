import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { get, list, put } from "@vercel/blob";
import { companyFinancials, reportFinancials, mergeFinancials } from "./company-financials";
import { CATALOG_SEEDS } from "./catalog-seeds";
import type { CatalogResponse, DiscoveryCompany } from "./discovery-types";
import type { LiveDiligenceResult } from "./live-research-types";

const blobConfigured=()=>Boolean(process.env.BLOB_READ_WRITE_TOKEN || (process.env.BLOB_STORE_ID&&process.env.VERCEL_OIDC_TOKEN));
const root=()=>join(process.cwd(),"work","company-library");
const auth=()=>process.env.BLOB_READ_WRITE_TOKEN?{token:process.env.BLOB_READ_WRITE_TOKEN}:{};
const safeId=(value:string)=>/^[a-zA-Z0-9_-]{1,100}$/.test(value);
export const libraryStorage=()=>({mode:blobConfigured()?"blob" as const:"local" as const,persistent:blobConfigured()||!process.env.VERCEL,shared:blobConfigured()});

async function readRecord<T>(path:string):Promise<T|null>{
  if(blobConfigured()){
    const result=await get(`firstcheque/${path}.json`,{...auth(),access:"private",useCache:false,abortSignal:AbortSignal.timeout(12000)});
    if(!result||result.statusCode!==200)return null;
    return JSON.parse(await new Response(result.stream).text()) as T;
  }
  if(process.env.VERCEL)throw new Error("Persistent research storage is not configured in this deployment.");
  try{return JSON.parse(await readFile(join(root(),`${path}.json`),"utf8")) as T;}
  catch(error){if((error as NodeJS.ErrnoException).code==="ENOENT")return null;throw error;}
}
async function writeRecord(path:string,value:unknown){
  const body=JSON.stringify(value);
  if(body.length>1_500_000)throw new Error("Research record exceeds the library size limit.");
  if(blobConfigured()){
    await put(`firstcheque/${path}.json`,body,{...auth(),access:"private",addRandomSuffix:false,allowOverwrite:true,contentType:"application/json",cacheControlMaxAge:60,abortSignal:AbortSignal.timeout(15000)});
    return;
  }
  if(process.env.VERCEL)throw new Error("Persistent research storage is not configured in this deployment.");
  const target=join(root(),`${path}.json`);
  await mkdir(join(root(),path.split("/")[0]),{recursive:true});
  const temp=`${target}.${randomUUID()}.tmp`;
  await writeFile(temp,body,{mode:0o600});await rename(temp,target);
}
async function readGroup<T>(prefix:string):Promise<T[]>{
  if(blobConfigured()){
    const response=await list({...auth(),prefix:`firstcheque/${prefix}/`,limit:200,abortSignal:AbortSignal.timeout(12000)});
    const result:T[]=[];
    for(let i=0;i<response.blobs.length;i+=5){
      const rows=await Promise.all(response.blobs.slice(i,i+5).map(blob=>readRecord<T>(blob.pathname.replace(/^firstcheque\//,"").replace(/\.json$/,""))));
      for(const row of rows)if(row!==null)result.push(row as T);
    }
    return result;
  }
  if(process.env.VERCEL)throw new Error("Persistent research storage is not configured in this deployment.");
  let names:string[];
  try{names=await readdir(join(root(),prefix));}catch(error){if((error as NodeJS.ErrnoException).code==="ENOENT")return [];throw error;}
  return (await Promise.all(names.filter(n=>/^[a-zA-Z0-9_-]+\.json$/.test(n)).slice(0,200).map(name=>readRecord<T>(`${prefix}/${name.replace(/\.json$/,"")}`)))).filter(value=>value!==null) as T[];
}

export async function listLibraryCompanies(){return readGroup<DiscoveryCompany>("catalog");}
export async function saveCatalogCompany(company:DiscoveryCompany){
  if(!safeId(company.id))throw new Error("Invalid company identifier.");
  await writeRecord(`catalog/${company.id}`,company);return company;
}
export async function getDossier(id:string){if(!safeId(id))return null;return readRecord<LiveDiligenceResult>(`dossiers/${id}`);}
export async function listDossiers(){return (await readGroup<LiveDiligenceResult>("dossiers")).sort((a,b)=>b.generatedAt.localeCompare(a.generatedAt));}

function identity(url:string){
  try{const value=new URL(url);const host=value.hostname.toLowerCase().replace(/^www\./,"");return host+(host.endsWith("republic.com")||host.endsWith("wefunder.com")?value.pathname.replace(/\/$/,""):"");}
  catch{return "";}
}
function classify(report:LiveDiligenceResult):Pick<DiscoveryCompany,"industry"|"sectors">{
  const text=[report.summary,...report.sources.filter(x=>x.officialCompanySource).map(x=>x.text.slice(0,3000))].join(" ").toLowerCase();
  const sectors:string[]=[];
  if(/\b(developer|devtools|coding|software development)\b/.test(text))sectors.push("Developer tools");
  if(/\b(gpu|inference|ai infrastructure|compute infrastructure|model serving)\b/.test(text))sectors.push("AI infrastructure");
  if(/\b(climate|clean energy|carbon|renewable|battery|batteries)\b/.test(text))sectors.push("Climate tech");
  if(/\b(robotics|robots)\b/.test(text))sectors.push("Robotics");
  if(/\b(cybersecurity|cyber security|security operations|appsec)\b/.test(text))sectors.push("Cybersecurity");
  if(/\b(payments|fintech|banking)\b/.test(text))sectors.push("Fintech");
  if(/\b(healthcare|medical|biotech)\b/.test(text))sectors.push("Healthcare");
  return {industry:sectors.includes("Cybersecurity")?"Cybersecurity":sectors.includes("Climate tech")?"Climate":sectors.includes("Fintech")?"Fintech":sectors.includes("Healthcare")?"Healthcare":sectors.some(s=>["Developer tools","AI infrastructure","Robotics"].includes(s))?"AI & software":"Other",sectors};
}

/** The shared library stores company research, never another investor's budget or personal thesis fit. */
export async function saveDiligenceReport(result:LiveDiligenceResult):Promise<{dossierId:string;companyId:string}>{
  const companies=await listLibraryCompanies();
  const key=identity(result.company.website||"");
  const existing=[...companies,...CATALOG_SEEDS].find(c=>key&&([c.website,c.offeringUrl||""].some(url=>identity(url)===key)));
  const companyId=existing?.id||`co-${createHash("sha256").update(key||result.company.name.toLowerCase()).digest("hex").slice(0,18)}`;
  if(!existing&&companies.length>=200)throw new Error("The shared library has reached its 200-company prototype limit.");
  const dossierId=`dossier-${companyId}`;
  const neutral:LiveDiligenceResult={...result,id:dossierId,dossierId,companyId,thesisFit:{score:null,explanation:"Shared company research. Apply your own editable preferences in Discover.",caveats:[]},persisted:true};
  const incoming=result.profile||{};
  const financials=mergeFinancials(existing?companyFinancials(existing):companyFinancials({annualRevenue:null,arr:null} as DiscoveryCompany),reportFinancials(result));
  const revenue=financials.annualRevenue,arr=financials.arr;
  const financialSource=revenue.sourceUrl||arr.sourceUrl||null;
  const newerFunding=incoming.funding&&(!existing?.funding?.announcedAt||!Number.isFinite(Date.parse(existing.funding.announcedAt))||incoming.funding.announcedAt&&Date.parse(incoming.funding.announcedAt)>=Date.parse(existing.funding.announcedAt))?incoming.funding:existing?.funding;
  const validatedProfile=Object.fromEntries(Object.entries(incoming).filter(([,value])=>value!==null&&value!==undefined&&(!Array.isArray(value)||value.length>0))) as Partial<DiscoveryCompany>;
  const company:DiscoveryCompany={
    ...existing,...validatedProfile,profileFieldSources:{...existing?.profileFieldSources,...incoming.profileFieldSources},profileSources:[...new Map([...(existing?.profileSources||[]),...(incoming.profileSources||[])].map(s=>[s.url,s])).values()],financials,logo:result.logo?.status==="fetched"?result.logo:existing?.logo||result.logo,
    id:companyId,name:result.company.name,website:result.company.website||existing?.website||"",description:incoming.description||existing?.description||result.sections.find(section=>section.category==="company")?.claims[0]?.text.slice(0,500)||result.summary,
    ...(existing?{industry:existing.industry,sectors:existing.sectors}:classify(result)),stage:newerFunding?.stage as DiscoveryCompany["stage"]||existing?.stage||"Unknown",funding:newerFunding,
    kind:existing?.kind||"company",offeringStatus:existing?.offeringStatus||"not-listed",offeringUrl:existing?.offeringUrl||null,platform:existing?.platform||null,
    minInvestment:existing?.minInvestment??null,currency:"USD",
    annualRevenue:revenue.status==="source-reported"?revenue.value:null,
    arrComparison:arr.comparison,
    arr:arr.status==="source-reported"?arr.value:null,financialCurrency:revenue.status==="source-reported"?revenue.currency:null,arrCurrency:arr.status==="source-reported"?arr.currency:null,
    financialsAsOf:revenue.asOf||arr.asOf||null,financialSourceUrl:financialSource,
    // Replace prior research evidence: rejected namesakes or stale sources must not survive a refresh.
    sourceUrls:[...new Set([...(existing?.offeringUrl?[existing.offeringUrl]:[]),...result.sources.filter(s=>s.status==="fetched").map(s=>s.url)])].slice(0,30),
    profileCheckedAt:result.generatedAt,lastCheckedAt:existing?.lastCheckedAt||result.generatedAt,researchStatus:result.status==="unavailable"?"failed":"complete",dossierId,
    ...(existing?.statusEvidence?{statusEvidence:existing.statusEvidence}:{}),...(existing?.minimumEvidence?{minimumEvidence:existing.minimumEvidence}:{}),
  };
  await writeRecord(`dossiers/${dossierId}`,neutral);
  await saveCatalogCompany(company);
  return {dossierId,companyId};
}

export async function catalogSnapshot(seeds:DiscoveryCompany[]):Promise<CatalogResponse>{
  const stored=process.env.VERCEL&&!blobConfigured()?[]:await listLibraryCompanies();
  const merged=mergeCatalogCompanies(seeds,stored);
  return {companies:merged,storage:libraryStorage(),updatedAt:new Date().toISOString()};
}

/** Match canonical websites as well as IDs so a live report enriches the seeded company. */
export function mergeCatalogCompanies(seeds:DiscoveryCompany[],stored:DiscoveryCompany[]):DiscoveryCompany[]{
  const merged=new Map(seeds.map(company=>[company.id,company]));
  for(const company of stored){
    const key=identity(company.website);
    const seed=merged.get(company.id)||(key?seeds.find(candidate=>identity(candidate.website)===key):undefined);
    const newestOffering=seed&&Date.parse(seed.lastCheckedAt)>Date.parse(company.lastCheckedAt);
    const liveNewer=Boolean(company.profileCheckedAt&&(!seed?.profileCheckedAt||Date.parse(company.profileCheckedAt)>=Date.parse(seed.profileCheckedAt)));
    const profile=seed?.catalogOrigin ? {...(liveNewer?{}:{reportedMetrics:seed.reportedMetrics,profileFieldSources:seed.profileFieldSources,founders:seed.founders,capabilities:seed.capabilities,audience:seed.audience,businessModel:seed.businessModel,headquarters:seed.headquarters,foundedYear:seed.foundedYear,funding:seed.funding,profileNotes:seed.profileNotes,profileSources:seed.profileSources,profileCheckedAt:seed.profileCheckedAt,stage:seed.stage,industry:seed.industry,sectors:seed.sectors}),catalogOrigin:seed.catalogOrigin} : {};
    // Preserve a legacy saved ID so existing watchlists and search/report links still resolve.
    if(seed&&seed.id!==company.id)merged.delete(seed.id);
    const financials=mergeFinancials(seed?companyFinancials(seed):companyFinancials(company),companyFinancials(company));
    const revenue=financials.annualRevenue,arr=financials.arr;
    merged.set(company.id,{...seed,...company,...profile,logo:company.logo?.status==="fetched"?company.logo:seed?.logo||company.logo,financials,annualRevenue:revenue.status==="source-reported"?revenue.value:null,arr:arr.status==="source-reported"?arr.value:null,financialCurrency:revenue.currency,arrCurrency:arr.currency,financialsAsOf:revenue.asOf||arr.asOf,financialSourceUrl:revenue.sourceUrl||arr.sourceUrl,arrComparison:arr.comparison,...(seed&&/public source evidence is retained|review source dates|research retained in this session/i.test(company.description)?{description:seed.description}:{}),...(newestOffering?{offeringStatus:seed.offeringStatus,minInvestment:seed.minInvestment,statusEvidence:seed.statusEvidence,minimumEvidence:seed.minimumEvidence,lastCheckedAt:seed.lastCheckedAt}:{}),sourceUrls:[...new Set([...(seed?.sourceUrls||[]),...company.sourceUrls])]});
  }
  return [...merged.values()];
}

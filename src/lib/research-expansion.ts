import type {DiligenceCategory,DiligenceSource} from './live-research-types';
/** Keep one current source per URL while attempt history remains in tracing. */
export function retainResearchSource(sources:DiligenceSource[],incoming:DiligenceSource){
 const index=sources.findIndex(source=>source.id===incoming.id||source.url===incoming.url);
 if(index<0)sources.push(incoming);
 else if(sources[index].status!=='fetched'||incoming.status==='fetched')sources[index]=incoming;
}
export function resolveResearchName(name:string,website:string,page:{title:string;text:string}){
 const host=new URL(website).hostname.replace(/^www\./,'');
 if(![host,host.split('.')[0]].includes(name.toLowerCase()))return name;
 const candidate=page.title.split(/\s*(?:[:|]|[–—]| - )\s*/)[0].trim();
 if(!candidate||candidate.length>60||candidate.split(/\s+/).length>5||/^(home|welcome|index|dashboard|sign in|app)$/i.test(candidate))return name;
 return page.text.toLowerCase().includes(candidate.toLowerCase())?candidate:name;
}
export function followupCompanyLinks(website:string,sources:(Pick<DiligenceSource,'url'|'links'|'officialCompanySource'> & Partial<Pick<DiligenceSource,'status'>>)[]){
 const host=new URL(website).hostname.replace(/^www\./,'');
 // A failed search-result fetch must not suppress a retry through the company's own navigation.
 const seen=new Set(sources.filter(s=>s.status!=="unavailable").map(s=>s.url));
 const hits=sources.filter(s=>s.officialCompanySource).flatMap(s=>(s.links||[]).flatMap(link=>{
  try{
   const u=new URL(link,s.url);u.hash='';const h=u.hostname.replace(/^www\./,'');
   if(!/^https?:$/.test(u.protocol)||h!==host||seen.has(u.href)||!/about|team|founder|company|product|solution|pricing|security|trust|integration|handover|investor|financial|funding|leadership|contact/i.test(u.pathname)||/login|sign.?in|sample|demo|dashboard|workspace/i.test(u.pathname)||/sample|demo/i.test(u.search))return [];
   seen.add(u.href);
   return [{url:u.href,category:/investor|financial|funding/i.test(u.pathname)?'disclosures' as const:/about|team|founder|company|leadership/i.test(u.pathname)?'founders' as const:'company' as const}];
  }catch{return [];}
 }));
 const priority=(hit:typeof hits[number])=>hit.category==='disclosures'?0:hit.category==='founders'?1:/pricing/i.test(new URL(hit.url).pathname)?2:3;
 // Reserve the bounded crawl for investor/team/pricing evidence before generic product pages.
 return hits.sort((a,b)=>priority(a)-priority(b)).slice(0,4);
}
export function researchSourceScope(category:DiligenceCategory,related:boolean):DiligenceSource['scope']|null{
 if(related)return 'company';
 return category==='competitors'?'competitive-context':category==='market'?'market-context':null;
}

export function normalizeResearchQueries(value:unknown,company:string){
 const input=value&&typeof value==='object'&&'queries' in value?(value as {queries:unknown}).queries:[];
 if(!Array.isArray(input))return [];
 return input.slice(0,6).flatMap(row=>{
 if(!row||typeof row.query!=='string'||!['competitors','market','founders','disclosures'].includes(row.category))return [];
 let query=row.query.replace(/[\u0000-\u001f]/g,' ').trim().split(/\s+/).slice(0,24).join(' ').slice(0,240);
 if(query.length<8)return [];
 const category=row.category==='founders'&&/funding|investors|financing/i.test(query)?'disclosures':row.category;
 if(['founders','disclosures'].includes(category)&&!query.toLowerCase().includes(company.toLowerCase()))query=`"${company.replaceAll('"','')}" ${query}`;
 return [{category:category as DiligenceCategory,query}];
 });
}
export function ensureContextQueries(queries:{category:DiligenceCategory;query:string}[],title:string){
 const result=[...queries];const topic=(queries.find(q=>q.category==='competitors')?.query||title).split(/\s+/).slice(0,12).join(' ');
 if(!result.some(q=>q.category==='market'))result.unshift({category:'market',query:`${topic} industry needs standards adoption`.slice(0,240)});
 if(!result.some(q=>q.category==='competitors'))result.unshift({category:'competitors',query:`${title} software alternatives comparison`.slice(0,240)});
 return result.slice(0,6);
}

/** Follow actual product documentation links even when web search is unavailable. */
export function linkedProductReferences(website:string,sources:Pick<DiligenceSource,'url'|'links'|'officialCompanySource'>[]){
 const host=new URL(website).hostname;const seen=new Set(sources.map(s=>s.url));
 return sources.filter(s=>s.officialCompanySource).flatMap(source=>(source.links||[]).flatMap(link=>{
  try{const url=new URL(link,source.url);url.hash='';
   if(url.protocol!=='https:'||url.hostname===host||seen.has(url.href)||!/(?:product|developer|documentation|docs|integration|solutions?)/i.test(url.pathname)||/modelcontextprotocol|github\.com|linkedin|twitter|facebook/i.test(url.hostname))return [];
   seen.add(url.href);return [{url:url.href,category:'competitors' as const,query:`Product reference linked by ${source.url}`}];
  }catch{return [];}
 })).slice(0,3);
}
/** Model-suggested URLs are leads, never evidence; safe-fetch applies network and source checks. */
export function normalizeSourceLeads(value:unknown){
 const rows=value&&typeof value==='object'&&'urls' in value?(value as {urls:unknown}).urls:[];
 if(!Array.isArray(rows))return [];
 const seen=new Set<string>();
 return rows.slice(0,4).flatMap(row=>{try{
  if(!row||!['competitors','market','founders','disclosures'].includes(row.category)||typeof row.url!=='string')return [];
  const url=new URL(row.url);url.hash='';if(url.protocol!=='https:'||url.username||url.password||url.href.length>2048||seen.has(url.href))return [];
  seen.add(url.href);return [{url:url.href,category:row.category as DiligenceCategory,query:'Product-led research plan: suggested source, fetched before use'}];
 }catch{return [];}});
}

export function linkedCompanyProfiles(sources:Pick<DiligenceSource,'url'|'links'|'officialCompanySource'>[]){
 const seen=new Set(sources.map(s=>s.url));
 return sources.filter(s=>s.officialCompanySource).flatMap(source=>(source.links||[]).flatMap(link=>{try{const url=new URL(link,source.url);if(url.protocol!=='https:'||seen.has(url.href)||!/^devpost\.com$/.test(url.hostname)||!url.pathname.startsWith('/software/'))return [];seen.add(url.href);return [{url:url.href,category:'founders' as const,query:`Project/team profile linked by ${source.url}`}];}catch{return [];}})).slice(0,2);
}

import type {DiligenceCategory,DiligenceSource} from './live-research-types';
export function resolveResearchName(name:string,website:string,page:{title:string;text:string}){
 const host=new URL(website).hostname.replace(/^www\./,'');
 if(![host,host.split('.')[0]].includes(name.toLowerCase()))return name;
 const candidate=page.title.split(/\s*(?:[:|]|[–—]| - )\s*/)[0].trim();
 if(!candidate||candidate.length>60||candidate.split(/\s+/).length>5||/^(home|welcome|index|dashboard|sign in|app)$/i.test(candidate))return name;
 return page.text.toLowerCase().includes(candidate.toLowerCase())?candidate:name;
}
export function followupCompanyLinks(website:string,sources:Pick<DiligenceSource,'url'|'links'|'officialCompanySource'>[]){
 const host=new URL(website).hostname.replace(/^www\./,'');const seen=new Set(sources.map(s=>s.url));
 return sources.filter(s=>s.officialCompanySource).flatMap(s=>(s.links||[]).flatMap(link=>{try{const u=new URL(link,s.url);u.hash='';const h=u.hostname.replace(/^www\./,'');if(!/^https?:$/.test(u.protocol)||h!==host||seen.has(u.href)||!/about|team|founder|company|product|solution|pricing|security|trust|integration|handover/i.test(u.pathname)||/login|sign.?in|sample|demo|dashboard|workspace/i.test(u.pathname)||/sample|demo/i.test(u.search))return [];seen.add(u.href);return [{url:u.href,category:/about|team|founder|company/i.test(u.pathname)?'founders' as const:'company' as const}];}catch{return [];}})).slice(0,4);
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

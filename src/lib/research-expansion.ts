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
 return sources.filter(s=>s.officialCompanySource).flatMap(s=>(s.links||[]).flatMap(link=>{try{const u=new URL(link,s.url);u.hash='';const h=u.hostname.replace(/^www\./,'');if(!/^https?:$/.test(u.protocol)||h!==host||seen.has(u.href)||!/about|team|founder|company|product|solution|pricing|security|trust/i.test(u.pathname)||/login|sign.?in|sample|demo|dashboard/i.test(u.pathname))return [];seen.add(u.href);return [{url:u.href,category:/about|team|founder|company/i.test(u.pathname)?'founders' as const:'company' as const}];}catch{return [];}})).slice(0,4);
}
export function researchSourceScope(category:DiligenceCategory,related:boolean):DiligenceSource['scope']|null{
 if(related)return 'company';
 return category==='competitors'?'competitive-context':category==='market'?'market-context':null;
}

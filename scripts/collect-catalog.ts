/** Model-free refresh of retained source URLs. Facts require review before publication. */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fetchPublicPage } from "../src/lib/safe-fetch";
import venture from "../src/data/venture-companies.json";
import handoff from "../src/data/event-handoff.json";

type Request = { name: string; url: string; kind: string };
type Receipt = Request & { status: "fetched" | "unavailable"; checkedAt: string; error?: string; title?: string; publishedAt?: string | null; sha256?: string };
async function main() {
  const requests: Request[] = [
    ...venture.companies.flatMap(company => company.profileSources.map(source => ({ name: company.name, url: source.url, kind: source.url === company.funding.sourceUrl ? "funding" : "company-profile" }))),
    ...handoff.profiles.map(company => ({ name: company.name, url: company.website, kind: "event-website" })),
  ].filter((row,index,all)=>all.findIndex(other=>other.url===row.url)===index);
  await mkdir("work/catalog-pages",{ recursive:true });
  const results: Receipt[]=[];
  let next=0;
  await Promise.all(Array.from({ length:6 },async()=>{
    while(next<requests.length){
      const request=requests[next++];
      const checkedAt=new Date().toISOString();
      const id=createHash("sha256").update(request.url).digest("hex").slice(0,20);
      let receipt: Receipt;
      try {
        const page=await fetchPublicPage(request.url,{ timeoutMs:14000 });
        receipt={...request,status:"fetched",checkedAt,title:page.title,publishedAt:page.publishedAt,sha256:createHash("sha256").update(page.text).digest("hex")};
        // Full retained text is private development evidence, never part of the public catalog response.
        await writeFile(`work/catalog-pages/${id}.json`,JSON.stringify({...receipt,...page},null,2));
      } catch(error) {
        receipt={...request,status:"unavailable",checkedAt,error:error instanceof Error?error.message:String(error)};
        await writeFile(`work/catalog-pages/${id}.json`,JSON.stringify(receipt,null,2));
      }
      results.push(receipt);
      console.log(`${results.length}/${requests.length} ${request.name}: ${receipt.status}`);
    }
  }));
  await writeFile("work/catalog-refresh.json",JSON.stringify({collectedAt:new Date().toISOString(),requestedPages:results.length,fetchedPages:results.filter(result=>result.status==="fetched").length,records:results},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});

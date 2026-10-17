import { NextResponse } from "next/server";
import { z } from "zod";
import { DEFAULT_DISCOVERY_PREFERENCES, parseDiscoveryBrief } from "@/lib/discovery";
import { thesisSchema } from "@/lib/validation";

export const runtime = "nodejs";
const preferencesSchema = thesisSchema.extend({
  sectors:z.array(z.string().max(80)).max(20),
  excludedSectors:z.array(z.string().max(80)).max(20).optional(),
  revenueRequirement:z.enum(["any","reported-revenue","reported-arr"]),
  minAnnualRevenue:z.number().finite().min(0).max(1e12).nullable(),
  maxMinimumCheck:z.number().finite().min(0).max(1e8).nullable(),
  offeringOnly:z.boolean(),includeUnverified:z.boolean(),query:z.string().max(300),
});
export async function POST(request:Request){
  try{
    const text=await request.text();
    if(text.length>16000)return NextResponse.json({error:"Brief is too long."},{status:413});
    const body=z.object({brief:z.string().trim().min(1).max(2000),base:preferencesSchema.partial().optional()}).safeParse(JSON.parse(text));
    if(!body.success)return NextResponse.json({error:"Please enter a brief and valid preferences."},{status:400});
    const base=preferencesSchema.parse({...DEFAULT_DISCOVERY_PREFERENCES,...body.data.base});
    return NextResponse.json(parseDiscoveryBrief(body.data.brief,base),{headers:{"Cache-Control":"no-store"}});
  }catch{return NextResponse.json({error:"Could not read these preferences."},{status:400});}
}

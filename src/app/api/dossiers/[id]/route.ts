import { NextResponse } from "next/server";
import { getDossier } from "@/lib/dossier-store";
export const runtime="nodejs";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  try{const {id}=await params;const dossier=await getDossier(id);return dossier?NextResponse.json(dossier,{headers:{"Cache-Control":"no-store"}}):NextResponse.json({error:"Research dossier not found."},{status:404});}
  catch{return NextResponse.json({error:"This dossier could not be loaded."},{status:503});}
}

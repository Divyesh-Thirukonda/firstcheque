import { NextResponse } from "next/server";
import { catalogSnapshot } from "@/lib/dossier-store";
import { CATALOG_SEEDS } from "@/lib/catalog-seeds";
export const runtime="nodejs";
export async function GET(){
  try{return NextResponse.json(await catalogSnapshot(CATALOG_SEEDS),{headers:{"Cache-Control":"no-store"}});}
  catch{return NextResponse.json({error:"The company library is temporarily unavailable. Your local preferences have not changed."},{status:503});}
}

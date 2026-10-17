import { NextResponse } from "next/server";
import { listDossiers,libraryStorage } from "@/lib/dossier-store";
export const runtime="nodejs";
export async function GET(){
  try{return NextResponse.json({dossiers:await listDossiers(),storage:libraryStorage()},{headers:{"Cache-Control":"no-store"}});}
  catch{return NextResponse.json({error:"The shared research library could not be read."},{status:503});}
}

import { NextResponse } from "next/server";
import { EVIDENCE, STARTUPS } from "@/lib/data";
import { MODEL, nicrronConfigured } from "@/lib/research";
import { prismConfigured } from "@/lib/telemetry";

export const runtime = "nodejs";
export async function GET() {
  return NextResponse.json({
    status: "ok", simulation: true, catalog: { companies: STARTUPS.length, sources: EVIDENCE.length, fictional: true },
    integrations: {
      nicrron: { configured: nicrronConfigured(), model: MODEL(), baseUrl: "https://api.nicrron.ai/v1" },
      prism: { configured: prismConfigured(), agentId: process.env.PRISM_AGENT_ID || "firstcheque-analyst" },
    },
  }, { headers: { "Cache-Control": "no-store" } });
}

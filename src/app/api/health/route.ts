import { NextResponse } from "next/server";
import { EVIDENCE, STARTUPS } from "@/lib/data";
import { MODEL, nicrronConfigured } from "@/lib/research";
import { prismConfigured } from "@/lib/telemetry";
import { libraryStorage } from "@/lib/dossier-store";
import { OFFERING_SEEDS } from "@/lib/offering-seeds";

export const runtime = "nodejs";
export async function GET() {
  return NextResponse.json({
    status: "ok", simulation: true, catalog: { companies: STARTUPS.length, sources: EVIDENCE.length, fictional: true },
    workspace: { default: "real-company-research", offeringSnapshots: OFFERING_SEEDS.length, offeringFeed: "manual-source-snapshots", storage: libraryStorage(), webAgentId: "firstcheque-web-analyst" },
    legacyDemo: { simulation: true, fictional: true },
    integrations: {
      nicrron: { configured: nicrronConfigured(), model: MODEL(), baseUrl: "https://api.nicrron.ai/v1" },
      prism: { configured: prismConfigured(), agentId: process.env.PRISM_AGENT_ID || "firstcheque-analyst" },
    },
  }, { headers: { "Cache-Control": "no-store" } });
}

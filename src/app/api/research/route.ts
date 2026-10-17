import { NextResponse } from "next/server";
import { getStartup } from "@/lib/data";
import { runResearch } from "@/lib/research";
import { researchRequestSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 120;
const requests = new Map<string, { count: number; reset: number }>();

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "local";
    const current = requests.get(ip);
    if (current && current.reset > Date.now() && current.count >= 20) return NextResponse.json({ error: "Research limit reached. Please try again in a minute." }, { status: 429 });
    if (!current || current.reset < Date.now()) requests.set(ip, { count: 1, reset: Date.now() + 60000 });
    else current.count++;
    if (requests.size > 1000) for (const [key, value] of requests) if (value.reset < Date.now()) requests.delete(key);
    const body = await request.text();
    if (body.length > 12000) return NextResponse.json({ error: "Request too large." }, { status: 413 });
    const parsed = researchRequestSchema.safeParse(JSON.parse(body));
    if (!parsed.success) return NextResponse.json({ error: "Please check your investor preferences.", issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) }, { status: 400 });
    if (!getStartup(parsed.data.startupId)) return NextResponse.json({ error: "Company not found." }, { status: 404 });
    // Public research always uses the validated v2. Baseline experiments use the CLI.
    const report = await runResearch({ ...parsed.data, version: "v2" });
    return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "The request must contain valid JSON." }, { status: 400 });
    const message = error instanceof Error ? error.message : "Research is unavailable.";
    return NextResponse.json({ error: message.slice(0, 500), replayAvailable: true }, { status: 503 });
  }
}

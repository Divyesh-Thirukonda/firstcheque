import { NextResponse } from "next/server";
import { diligenceRequestSchema, runWebDiligence } from "@/lib/web-research";
import { saveDiligenceReport } from "@/lib/dossier-store";
import type { DiligenceStreamEvent, LiveDiligenceResult } from "@/lib/live-research-types";

export const runtime = "nodejs";
export const maxDuration = 180;
const visits = new Map<string, { count: number; until: number }>();

async function persist(result: LiveDiligenceResult) {
  if (!result.sources.some((source) => source.status === "fetched")) return result;
  try { const saved = await saveDiligenceReport(result); return { ...result, ...saved, persisted: true }; }
  catch (error) { return { ...result, persisted: false, warnings: [...result.warnings, error instanceof Error ? `Dossier could not be saved: ${error.message}` : "Dossier could not be saved."] }; }
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "local";
  const prior = visits.get(ip);
  if (prior && prior.until > Date.now() && prior.count >= 4) return NextResponse.json({ error: "Research is rate limited to four new dossiers per minute. Please retry shortly.", retryable: true }, { status: 429 });
  if (prior && prior.until > Date.now()) prior.count++; else visits.set(ip, { count: 1, until: Date.now() + 60000 });
  if (visits.size > 1000) for (const [key, value] of visits) if (value.until < Date.now()) visits.delete(key);
  let parsed;
  try { const text = await request.text(); if (text.length > 14000) return NextResponse.json({ error: "Research request is too large." }, { status: 413 }); parsed = diligenceRequestSchema.safeParse(JSON.parse(text)); }
  catch { return NextResponse.json({ error: "Send a valid JSON research request." }, { status: 400 }); }
  if (!parsed.success) return NextResponse.json({ error: "Check the company and investor preferences.", issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) }, { status: 400 });
  if (!request.headers.get("accept")?.includes("text/event-stream")) {
    try { return NextResponse.json(await persist(await runWebDiligence(parsed.data)), { headers: { "Cache-Control": "no-store" } }); }
    catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Public research failed.", retryable: true }, { status: 400 }); }
  }
  const input = parsed.data;
  let closed = false;
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: DiligenceStreamEvent) => { if (!closed) { try { controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`)); } catch { closed = true; } } };
      void (async () => {
        try { const result = await persist(await runWebDiligence(input, send)); send({ type: "result", result }); }
        catch (error) { send({ type: "error", runId: "", error: error instanceof Error ? error.message : "Public research failed.", retryable: true }); }
        finally { if (!closed) { closed = true; controller.close(); } }
      })();
    },
    cancel() { closed = true; },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" } });
}

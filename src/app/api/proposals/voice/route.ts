import { z } from "zod";
import { traceProposalOperation } from "@/lib/proposal-telemetry";
import { proposalRequestAllowed } from "@/lib/proposal-request";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET() {
  return Response.json(
    { configured: !!process.env.ELEVENLABS_API_KEY, mode: "preview-only" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(request: Request) {
  if (!proposalRequestAllowed(request, "voice"))
    return Response.json(
      { error: "Please wait before generating another voice preview." },
      { status: 429 },
    );
  const started = Date.now();
  let text: string;
  let sample = false;
  try {
    const raw = await request.text();
    if (raw.length > 6000)
      return Response.json(
        { error: "Voice preview is too long." },
        { status: 413 },
      );
    const parsed = z
      .object({
        text: z.string().trim().min(10).max(1800),
        sample: z.boolean().optional(),
      })
      .parse(JSON.parse(raw));
    text = parsed.text;
    sample = parsed.sample === true;
  } catch {
    return Response.json(
      { error: "Enter a short call opening." },
      { status: 400 },
    );
  }
  if (!process.env.ELEVENLABS_API_KEY)
    return Response.json(
      { error: "Live voice preview is not configured. Your script is saved." },
      { status: 503 },
    );
  try {
    const response = await fetch(
      "https://api.elevenlabs.io/v1/text-to-speech/JBFqnCBsd6RMkjVDRZzb?output_format=mp3_44100_128",
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: `This is an AI voice preview for Seed Street. ${text}`,
          model_id: "eleven_multilingual_v2",
        }),
        signal: AbortSignal.timeout(40000),
      },
    );
    if (!response.ok) throw new Error("Voice generation unavailable");
    const audio = await response.arrayBuffer();
    if (!audio.byteLength || audio.byteLength > 8000000)
      throw new Error("Invalid audio response");
    const trace = await traceProposalOperation({
      operation: "speech-preview",
      started,
      model: "elevenlabs/eleven_multilingual_v2",
      success: true,
      sample,
    });
    return new Response(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "X-Voice-Mode": "preview-only",
        "X-Prism-Recorded": String(trace.recorded),
      },
    });
  } catch {
    await traceProposalOperation({
      operation: "speech-preview",
      started,
      model: "elevenlabs/eleven_multilingual_v2",
      success: false,
      sample,
    });
    return Response.json(
      {
        error: "ElevenLabs could not generate the preview. Try again shortly.",
      },
      { status: 502 },
    );
  }
}

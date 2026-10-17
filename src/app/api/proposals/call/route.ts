import { z } from "zod";
import { proposalSchema } from "@/lib/proposals";
import { callBrief, conversationNotes } from "@/lib/proposal-calls";
import {
  callConfiguration,
  elevenAgents,
  signCall,
  verifyCall,
} from "@/lib/proposal-call-server";
import { getCatalogCompany } from "@/lib/dossier-store";
import { proposalRequestAllowed } from "@/lib/proposal-request";
import { traceProposalOperation } from "@/lib/proposal-telemetry";
export const runtime = "nodejs";
export const maxDuration = 60;
const headers = { "Cache-Control": "no-store" };
export async function GET() {
  return Response.json(callConfiguration(), { headers });
}
export async function POST(request: Request) {
  if (!proposalRequestAllowed(request, "outbound-call"))
    return Response.json(
      { error: "Please wait before starting another call." },
      { status: 429 },
    );
  const started = Date.now();
  try {
    const raw = await request.text();
    if (raw.length > 35000)
      return Response.json({ error: "Request too large." }, { status: 413 });
    const input = z
      .object({
        purpose: z.enum(["missing-info", "offer"]),
        draft: proposalSchema,
        phone: z.string().regex(/^\+[1-9]\d{6,14}$/),
        consentConfirmed: z.literal(true),
      })
      .parse(JSON.parse(raw));
    if (!callConfiguration().configured)
      return Response.json(
        {
          error:
            "Outbound calling is not connected yet. Add an ElevenLabs agent, an outbound number and an Agents API key.",
          configured: false,
        },
        { status: 503 },
      );
    const company = await getCatalogCompany(input.draft.companyId);
    const contact = company?.contacts?.phones.find(
      (phone) => phone.number === input.phone,
    );
    if (
      !company ||
      !contact ||
      Date.now() - Date.parse(contact.checkedAt) > 7 * 86400000
    )
      return Response.json(
        { error: "Refresh and select a company-published phone number first." },
        { status: 409 },
      );
    if (input.draft.sample)
      return Response.json(
        { error: "Clear fictional rehearsal notes before making a real call." },
        { status: 409 },
      );
    // Only a configured Nicrron proxy may provide the conversational model. No untraced provider fallback.
    const agentResponse = await elevenAgents(
      `agents/${encodeURIComponent(process.env.ELEVENLABS_AGENT_ID!)}`,
    );
    if (!agentResponse.ok)
      return Response.json(
        {
          error:
            "The configured ElevenLabs agent cannot be read. Check Agents key permissions.",
        },
        { status: 503 },
      );
    const agent = await agentResponse.json();
    const custom = agent.conversation_config?.agent?.prompt?.custom_llm;
    if (
      agent.conversation_config?.agent?.prompt?.llm !== "custom-llm" ||
      custom?.url !== process.env.ELEVENLABS_LLM_URL ||
      !agent.conversation_config?.agent?.prompt?.prompt?.includes("{{brief}}")
    )
      return Response.json(
        {
          error:
            "Configure the voice agent to use the Seed Street Nicrron endpoint before calling.",
        },
        { status: 503 },
      );
    const first =
      input.purpose === "offer"
        ? `Hi, this is Seed Street's AI assistant, working with Divyesh. An investor would like to discuss a proposed investment in ${company.name}. Is this a good time to discuss details for an unsigned draft? This AI conversation will be transcribed; no investment is accepted or completed on this call.`
        : `Hi, this is Seed Street's AI research assistant, working with Divyesh. May I ask a few missing research questions about ${company.name}? This AI conversation will be transcribed. Is that okay?`;
    const response = await elevenAgents(
      `${process.env.ELEVENLABS_PHONE_PROVIDER === "sip" ? "sip-trunk" : "twilio"}/outbound-call`,
      {
        agent_id: process.env.ELEVENLABS_AGENT_ID,
        agent_phone_number_id: process.env.ELEVENLABS_PHONE_NUMBER_ID,
        to_number: contact.number,
        call_recording_enabled: false,
        conversation_initiation_client_data: {
          dynamic_variables: {
            brief: callBrief(
              { ...input.draft, companyName: company.name },
              input.purpose,
            ),
          },
          conversation_config_override: {
            agent: { first_message: first },
            conversation: { max_duration_seconds: 180 },
          },
        },
      },
    );
    const data = await response.json();
    const success =
      response.ok &&
      data.success === true &&
      typeof data.conversation_id === "string";
    await traceProposalOperation({
      operation: "outbound-call",
      started,
      model: "elevenlabs/agents",
      success,
    });
    if (!success)
      return Response.json(
        {
          error:
            "ElevenLabs could not start this call. No completed conversation was received.",
        },
        { status: 502 },
      );
    return Response.json(
      {
        call: {
          conversationId: data.conversation_id,
          token: signCall(data.conversation_id),
          purpose: input.purpose,
          status: "initiated",
          startedAt: new Date().toISOString(),
        },
      },
      { headers },
    );
  } catch (error) {
    if (error instanceof z.ZodError)
      return Response.json(
        {
          error:
            "Select a published phone number and confirm the recipient agreed to an AI-transcribed call.",
        },
        { status: 400 },
      );
    await traceProposalOperation({
      operation: "outbound-call",
      started,
      model: "elevenlabs/agents",
      success: false,
    });
    return Response.json(
      {
        error:
          "Call start could not be confirmed. Check ElevenLabs conversation history before trying again; the call may have started.",
      },
      { status: 502 },
    );
  }
}
export async function PUT(request: Request) {
  if (!proposalRequestAllowed(request, "call-status"))
    return Response.json(
      { error: "Please wait before checking the call again." },
      { status: 429 },
    );
  try {
    const raw = await request.text();
    if (raw.length > 2000)
      return Response.json({ error: "Invalid call token." }, { status: 400 });
    const { token } = z
      .object({ token: z.string().max(1500) })
      .parse(JSON.parse(raw));
    const id = verifyCall(token);
    if (!id)
      return Response.json(
        { error: "This call session expired or is invalid." },
        { status: 403 },
      );
    const response = await elevenAgents(
      `conversations/${encodeURIComponent(id)}`,
    );
    if (!response.ok)
      return Response.json(
        { error: "Call status is temporarily unavailable." },
        { status: 502 },
      );
    const data = await response.json();
    const status =
      data.status === "done"
        ? "done"
        : data.status === "failed"
          ? "failed"
          : "processing";
    return Response.json(
      {
        status,
        notes: status === "done" ? conversationNotes(data.transcript) : "",
        transcriptReady:
          status === "done" &&
          Array.isArray(data.transcript) &&
          data.transcript.some(
            (turn: { role: string; message?: string }) =>
              turn.role === "user" && turn.message,
          ),
      },
      { headers },
    );
  } catch {
    return Response.json(
      { error: "Could not check this call." },
      { status: 502 },
    );
  }
}

import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
export function callConfiguration() {
  const missing = [
    "ELEVENLABS_AGENTS_API_KEY",
    "ELEVENLABS_AGENT_ID",
    "ELEVENLABS_PHONE_NUMBER_ID",
    "ELEVENLABS_CALL_SECRET",
    "ELEVENLABS_LLM_URL",
  ].filter((key) => !process.env[key]);
  return { configured: missing.length === 0, missing };
}
export function signCall(conversationId: string, now = Date.now()) {
  const body = Buffer.from(
    JSON.stringify({ conversationId, expires: now + 2 * 60 * 60 * 1000 }),
  ).toString("base64url");
  return `${body}.${createHmac("sha256", process.env.ELEVENLABS_CALL_SECRET!).update(body).digest("base64url")}`;
}
export function verifyCall(token: string, now = Date.now()): string | null {
  try {
    const [body, signature, ...extra] = token.split(".");
    if (
      extra.length ||
      !body ||
      !signature ||
      !process.env.ELEVENLABS_CALL_SECRET
    )
      return null;
    const expected = createHmac("sha256", process.env.ELEVENLABS_CALL_SECRET)
      .update(body)
      .digest();
    const received = Buffer.from(signature, "base64url");
    if (
      received.length !== expected.length ||
      !timingSafeEqual(received, expected)
    )
      return null;
    const data = JSON.parse(Buffer.from(body, "base64url").toString());
    return typeof data.conversationId === "string" &&
      /^[\w-]{1,160}$/.test(data.conversationId) &&
      data.expires > now
      ? data.conversationId
      : null;
  } catch {
    return null;
  }
}
export async function elevenAgents(path: string, body?: unknown) {
  return fetch(`https://api.elevenlabs.io/v1/convai/${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_AGENTS_API_KEY!,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
}

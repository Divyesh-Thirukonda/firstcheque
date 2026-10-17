import { z } from "zod";
export const callSessionSchema = z.object({
  conversationId: z.string().max(160),
  token: z.string().max(1500),
  purpose: z.enum(["missing-info", "offer"]),
  status: z.enum(["initiated", "processing", "done", "failed"]),
  startedAt: z.string().datetime(),
});
export type CallSession = z.infer<typeof callSessionSchema>;

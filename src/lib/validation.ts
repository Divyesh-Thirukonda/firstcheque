import { z } from "zod";
import { INDUSTRIES, STAGES } from "./data";

export const thesisSchema = z.object({
  industries: z.array(z.enum(INDUSTRIES as [typeof INDUSTRIES[number], ...typeof INDUSTRIES[number][]])).max(6),
  stages: z.array(z.enum(STAGES as [typeof STAGES[number], ...typeof STAGES[number][]])).max(4),
  riskAppetite: z.enum(["conservative", "balanced", "adventurous"]),
  horizonYears: z.number().min(1).max(30),
  budget: z.number().min(100).max(10000000),
  maxAllocationPct: z.number().min(1).max(100),
  thesis: z.string().trim().max(2000),
});

export const researchRequestSchema = z.object({
  startupId: z.string().min(1).max(64),
  thesis: thesisSchema,
  mode: z.enum(["auto", "replay", "live"]).default("auto"),
  version: z.enum(["v1", "v2"]).default("v2"),
  sessionId: z.string().max(128).optional(),
  question: z.string().max(1000).optional(),
});

export const modelReportSchema = z.object({
  title: z.string().max(180),
  summary: z.string().max(1800),
  recommendation: z.enum(["research", "watch", "pass"]),
  strengths: z.array(z.object({ text: z.string().max(700), sourceIds: z.array(z.string()).max(5), confidence: z.enum(["high", "medium", "low"]), metric: z.object({ key: z.enum(["annualRevenue", "arr", "growthPct", "runwayMonths", "customers", "valuation", "grossMarginPct", "customerConcentrationPct"]), value: z.number() }).nullable() })).min(1).max(5),
  risks: z.array(z.object({ text: z.string().max(700), sourceIds: z.array(z.string()).max(5), confidence: z.enum(["high", "medium", "low"]), metric: z.object({ key: z.enum(["annualRevenue", "arr", "growthPct", "runwayMonths", "customers", "valuation", "grossMarginPct", "customerConcentrationPct"]), value: z.number() }).nullable() })).min(1).max(5),
  diligenceQuestions: z.array(z.string().max(500)).min(2).max(6),
});

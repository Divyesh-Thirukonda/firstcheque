"use client";

import { Check, ChevronDown, CircleCheck, Eye, FileCheck2, Globe2, Layers3, LoaderCircle, Search, Sparkles, TriangleAlert } from "lucide-react";
import type { DiligenceStep } from "@/lib/live-research-types";

const taskIcons = { discovery: Search, fetch: Eye, synthesis: Sparkles, validation: FileCheck2, catalog: Globe2, scope: Search, evidence: Eye, collection: Layers3 };

/** Status is driven by returned events or completed local work, never a timer. */
export function TaskTimeline({ steps, running = false, failed = false, expanded = false, formatDetail = (value: string) => value }: {
  steps: DiligenceStep[]; running?: boolean; failed?: boolean; expanded?: boolean; formatDetail?: (value: string) => string;
}) {
  const complete = steps.filter(step => step.status === "complete").length;
  const needsReview = steps.some(step => step.status === "warning" || step.status === "failed");
  return <details className={`fc-agent-timeline ${running ? "is-running" : ""}`} open={running || expanded || undefined}>
    <summary><span className="fc-timeline-summary-icon">{running ? <LoaderCircle size={15} className="spin"/> : failed || needsReview ? <TriangleAlert size={15}/> : <CircleCheck size={15}/>}</span><span>{running ? "Working" : failed ? "Needs attention" : needsReview ? "Finished with gaps" : "Completed"}<strong>{steps.length} tasks</strong></span><ChevronDown size={13}/></summary>
    <ol aria-label="Research tasks">{steps.map(step => {
      const Icon = taskIcons[step.id as keyof typeof taskIcons] || Layers3;
      return <li key={step.id} className={`fc-timeline-task ${step.status}`}><span className="fc-timeline-node">{step.status === "running" ? <LoaderCircle className="spin" size={15}/> : step.status === "warning" || step.status === "failed" ? <TriangleAlert size={15}/> : <Icon size={15}/>}</span><div>{step.detail ? <details className="fc-timeline-detail"><summary className="fc-timeline-task-label">{step.label}<ChevronDown size={11}/></summary><small>{formatDetail(step.detail)}</small></details> : <span className="fc-timeline-task-label">{step.label}</span>}</div><span className="fc-timeline-state" aria-label={step.status}>{step.status === "complete" ? <Check size={12}/> : step.status === "running" ? "Running" : "Gap"}</span></li>;
    })}</ol>
    {running ? <span className="fc-sr-only" role="status">{complete} of {steps.length} tasks completed</span> : null}
  </details>;
}

"use client";

import { useState } from "react";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import type { DiscoveryCompany } from "@/lib/discovery-types";
import type { DiligenceSource, LiveDiligenceResult } from "@/lib/live-research-types";
import { ResearchReport, displayDate, safeWebUrl } from "./agent-workspace";
import { InvestmentProposal } from "./investment-proposal";
import { CompanyOverview } from "./company-overview";
import { WorkspaceDialog } from "./workspace-dialog";

/** Browsing a company does not create a search or change an existing search's intent. */
export function CompanyProfile({ company, report, saved, onSave, onResearch, onClose, initialProposal=false }: {
  initialProposal?:boolean;
  company: DiscoveryCompany; report: LiveDiligenceResult | null; saved: boolean;
  onSave: () => void; onResearch: () => void; onClose: () => void;
}) {
  const [view, setView] = useState<"Overview" | "Research" | "Proposal">(initialProposal?"Proposal":"Overview");
  const [tab, setTab] = useState<"Report" | "Financials" | "Sources">("Report");
  const [source, setSource] = useState<DiligenceSource | null>(null);
  const [passage, setPassage] = useState<string | null>(null);
  return <>
    <WorkspaceDialog title="Company details" onClose={onClose} className={`fc-company-profile-dialog ${view==="Proposal"?"sp-proposal-dialog":""}`} wide>
      <nav className="fc-company-subnav" aria-label="Company views"><button className={view === "Overview" ? "active" : ""} aria-pressed={view === "Overview"} onClick={() => setView("Overview")}>Overview</button><button className={view === "Proposal" ? "active" : ""} aria-pressed={view === "Proposal"} onClick={() => setView("Proposal")}>Proposal</button>{report ? <button className={view === "Research" ? "active" : ""} aria-pressed={view === "Research"} onClick={() => setView("Research")}>Research<span>{report.sources.filter(item => item.status === "fetched").length} sources</span></button> : null}</nav>
      {view === "Proposal"?<InvestmentProposal company={company} onBack={()=>setView("Overview")}/> : view === "Research" && report ? <ResearchReport report={report} tab={tab} onTab={setTab} onSource={(next, quote) => { setSource(next); setPassage(quote || null); }} offeringUrl={company.offeringUrl} platform={company.platform} running={false} onRetry={onResearch}/> : <CompanyOverview onProposal={()=>setView("Proposal")} company={company} report={report} researchLabel={report ? "Read research" : "Deep research"} saved={saved} onSave={onSave} onResearch={() => report ? setView("Research") : onResearch()}/>}
    </WorkspaceDialog>
    {source ? <WorkspaceDialog title={source.title} onClose={() => setSource(null)} wide><div className="fc-source-metadata"><span>{source.publishedAt ? `Published ${displayDate(source.publishedAt)}` : "Publication date unavailable"}</span><span>Read {displayDate(source.retrievedAt)}</span></div>{passage ? <section className="fc-source-focus"><h3>Passage behind this claim</h3><blockquote>{passage}</blockquote></section> : null}<details className="fc-source-extract" open={!passage || undefined}><summary>Full page text<ChevronDown size={17}/></summary><div className="fc-retained-source">{source.text || source.error || "Source content is unavailable."}</div></details><div className="fc-dialog-actions"><button className="fc-btn secondary" onClick={() => setSource(null)}>Back to research</button>{safeWebUrl(source.url) ? <a className="fc-btn primary" href={safeWebUrl(source.url)} target="_blank" rel="noreferrer">Open original source<ArrowUpRight size={15}/></a> : null}</div></WorkspaceDialog> : null}
  </>;
}

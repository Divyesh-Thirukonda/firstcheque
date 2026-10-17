"use client";

import { ArrowRight, ArrowUpRight, BookOpen, Database, Layers3, Radar, Sparkles, TrendingUp } from "lucide-react";
import type { DiscoveryCompany } from "@/lib/discovery-types";
import type { LiveDiligenceResult, DiligenceStep } from "@/lib/live-research-types";
import { EXPLORATIONS, explorationEvidence, type ExplorationKind } from "@/lib/exploration";
import { CompanyLogo } from "./company-logo";
import { CompanyTile } from "./company-list";
import { companyTagline } from "@/lib/company-presentation";
import { TaskTimeline } from "./task-timeline";

export function ExplorationResults({ kind, prompt, companies, catalogCount, reports, reportsLoading, savedIds, onSave, onSelectCompany, onExplore, onNewSearch, onAddCompany }: {
  kind: ExplorationKind; prompt: string; companies: DiscoveryCompany[]; catalogCount: number; reports: LiveDiligenceResult[]; reportsLoading: boolean; savedIds: string[];
  onSave: (id: string) => void; onSelectCompany: (id: string) => void; onExplore: (kind: ExplorationKind) => void; onNewSearch: () => void; onAddCompany: () => void;
}) {
  const evidence = companies.map(company => ({ company, ...explorationEvidence(company.id, reports) }));
  const sourceCount = evidence.reduce((count, row) => count + row.sourceCount, 0);
  const researched = evidence.filter(row => row.sourceCount > 0).length;
  const steps: DiligenceStep[] = [
    { id: "catalog", label: `Loaded ${catalogCount} company snapshots`, detail: "Seed Street catalog", status: "complete", durationMs: 0 },
    { id: "scope", label: kind === "fundraising" ? `Found ${companies.length} AI infrastructure companies` : `Mapped ${companies.length} companies`, detail: "Research universe · Includes companies without open offerings", status: "complete", durationMs: 0 },
    { id: "evidence", label: reportsLoading ? "Loading saved evidence" : `Checked ${researched} saved research report${researched === 1 ? "" : "s"}`, detail: reportsLoading ? "" : `${sourceCount} readable sources · No new web research`, status: reportsLoading ? "running" : "complete", durationMs: 0 },
    { id: "collection", label: kind === "growth" ? "Growth ranking needs comparable periods" : "Future fundraising remains unverified", detail: kind === "growth" ? "A single revenue figure is not a growth rate" : "An open offering is not a forecast of the next round", status: "warning", durationMs: 0 },
  ];
  return <div className="fc-exploration-result">
    <h1 className="fc-sr-only">{EXPLORATIONS[kind].title}</h1>
    <div className="fc-search-request">{prompt}</div>
    <div className="fc-agent-presence"><Sparkles size={19}/><span>Seed Street</span><span className="fc-quiet-badge">Catalog research</span></div>
    <TaskTimeline steps={steps} running={reportsLoading} expanded/>
    <div className="fc-explore-answer"><h2>{kind === "growth" ? "A starting map. Now find the momentum." : "AI infrastructure, before the next round."}</h2><p>{kind === "growth" ? "Compare the evidence behind each company’s growth." : "Investigate funding history, runway and plans to raise."}</p></div>
    <div className="fc-signal-metrics" aria-label="Evidence coverage"><div><Database size={16}/><strong>{companies.length}</strong><span>companies</span></div><div><BookOpen size={16}/><strong>{reportsLoading ? "…" : sourceCount}</strong><span>sources read</span></div><div><Radar size={16}/><strong>Unknown</strong><span>{kind === "growth" ? "growth ranking" : "raise likelihood"}</span></div></div>
    <section className="fc-explore-collection" aria-label={EXPLORATIONS[kind].label}>
      <header><Layers3 size={17}/><h2>{EXPLORATIONS[kind].label}</h2><span>{companies.length} companies</span></header>
      <div className="fc-company-grid">{evidence.map(({ company, sourceCount }) => <CompanyTile key={company.id} id={company.id} name={company.name} logo={<CompanyLogo id={company.id} name={company.name} logo={company.logo}/>} description={companyTagline(company)} sector={company.sectors[0] || company.industry} footer={sourceCount ? `${sourceCount} sources · Read research` : "Research needed"} saved={savedIds.includes(company.id)} onSave={() => onSave(company.id)} onOpen={() => onSelectCompany(company.id)}/>)}</div>
      {!companies.length ? <div className="fc-empty-state"><h2>No companies in this scope yet</h2><button className="fc-btn secondary" onClick={onAddCompany}>Add company<ArrowRight size={16}/></button></div> : null}
      <footer><span className="fc-signal-dot"/>Research universe · No growth or fundraising rank assigned</footer>
    </section>
    <div className="fc-agent-followups" aria-label="Continue exploring"><button onClick={() => onExplore(kind === "growth" ? "fundraising" : "growth")}><ArrowRight size={15}/>{kind === "growth" ? "Explore AI infrastructure fundraising" : "Map startup growth"}<ArrowUpRight size={13}/></button><button onClick={onAddCompany}><ArrowRight size={15}/>Research a company website<ArrowUpRight size={13}/></button><button onClick={onNewSearch}><TrendingUp size={15}/>Find offerings for my budget<ArrowUpRight size={13}/></button></div>
  </div>;
}

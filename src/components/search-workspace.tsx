"use client";

import { useState } from "react";
import { ArrowRight, ChevronDown, History, LoaderCircle, MessageSquare, PanelLeftClose, Plus, Search, Settings2, Sparkles, TriangleAlert, Wallet, Coins, Gauge, Banknote, HardDrive } from "lucide-react";
import type { DiscoveryCompany } from "@/lib/discovery-types";
import { filterAndRankCompanies } from "@/lib/discovery";
import type { LiveDiligenceResult } from "@/lib/live-research-types";
import type { SearchMessage, SearchThread } from "@/lib/search-threads";
import { AgentWorkspace, displayDate } from "./agent-workspace";
import { CompanyList, CompanyTile, formatUSD, readableFilterReason } from "./company-list";
import { companyTagline } from "@/lib/company-presentation";
import { riskLabel } from "./investment-preferences";

interface SearchWorkspaceProps {
  threads: SearchThread[];
  activeThread: SearchThread | null;
  companies: DiscoveryCompany[];
  reports: LiveDiligenceResult[];
  reportsLoading: boolean;
  savedIds: string[];
  initialUrl: string;
  loading: boolean;
  catalogError: string;
  onSelectThread: (id: string) => void;
  onNewSearch: () => void;
  onAddCompany: () => void;
  onRefine: (brief?: string, field?: "budget" | "company-limit" | "risk" | "revenue") => void;
  onRefresh: () => void;
  onSelectCompany: (id: string | null) => void;
  onSave: (id: string) => void;
  onMessage: (threadId: string, message: SearchMessage) => void;
  onResult: (result: LiveDiligenceResult, threadId: string) => void;
  onClearInitialUrl: () => void;
}

export function SearchWorkspace({ threads, activeThread, companies, reports, reportsLoading, savedIds, initialUrl, loading, catalogError, onSelectThread, onNewSearch, onAddCompany, onRefine, onRefresh, onSelectCompany, onSave, onMessage, onResult, onClearInitialUrl }: SearchWorkspaceProps) {
  const [railOpen, setRailOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [refinement, setRefinement] = useState("");
  const list = threads.filter(thread => `${thread.title} ${thread.brief}`.toLowerCase().includes(searchQuery.toLowerCase()));
  const preferences = activeThread?.preferences;
  const knownCompanies = [...companies, ...reports.filter(report => !companies.some(company => company.id === report.companyId)).map(report => ({ id: report.companyId, name: report.company.name, website: report.company.website || "", description: "Research retained in this session.", offeringStatus: "unverified", offeringUrl: report.offering.url, platform: null, dossierId: report.dossierId }))];
  const ranked = preferences ? filterAndRankCompanies(companies, preferences) : null;
  const entries = activeThread?.resultCompanyIds.flatMap(id => {
    const company = companies.find(item => item.id === id);
    if (!company) return [];
    const match = ranked?.matches.find(item => item.company.id === id);
    return [{ company, reasons: match?.reasons || [], score: match?.score, warnings: match?.warnings || ranked?.excluded.find(item => item.company.id === id)?.reasons || [] }];
  }) || [];
  const selectedMatch = ranked?.matches.find(match => match.company.id === activeThread?.selectedCompanyId);
  const selectedFit = selectedMatch || { reasons: [], warnings: ranked?.excluded.find(item => item.company.id === activeThread?.selectedCompanyId)?.reasons || [] };
  const searchInterests = preferences?.sectors.length ? preferences.sectors.join(" or ") : preferences?.industries.join(" or ");
  const searchHeading = preferences?.query || searchInterests || "Startups";
  const companyLimit = preferences ? Math.min(preferences.budget * preferences.maxAllocationPct / 100, preferences.maxMinimumCheck ?? Infinity) : 0;
  const detailOpen = !!activeThread && (!!activeThread.selectedCompanyId || !!initialUrl);
  const researchedCompanies = [...new Set(activeThread?.messages.flatMap(message => message.kind === "research" && message.companyId ? [message.companyId] : []) || [])].filter(id => !activeThread?.resultCompanyIds.includes(id)).flatMap(id => { const company = knownCompanies.find(item => item.id === id); return company ? [company] : []; });
  const restoringReport = !!activeThread?.selectedCompanyId && ((loading && !knownCompanies.length) || (reportsLoading && !reports.some(report => report.companyId === activeThread.selectedCompanyId)));
  const newMatches = ranked?.matches.filter(match => !activeThread?.resultCompanyIds.includes(match.company.id)).length || 0;

  return <div className={`fc-search-workspace ${railOpen ? "fc-search-rail-open" : ""}`}>
    <aside className="fc-search-rail" id="search-thread-rail" aria-label="Saved searches">
      <div className="fc-pane-heading"><span><MessageSquare size={16}/>Your searches</span><button className="fc-icon-btn fc-search-rail-close" onClick={() => setRailOpen(false)} aria-label="Close searches"><PanelLeftClose size={16}/></button></div>
      <button className="fc-new-search" onClick={onNewSearch}><Plus size={17}/>New search</button>
      {threads.length > 4 ? <label className="fc-rail-search"><Search size={14}/><input aria-label="Find a saved search" placeholder="Find a search…" value={searchQuery} onChange={event => setSearchQuery(event.target.value)}/></label> : null}
      <div className="fc-search-thread-list">
        {list.map(thread => <button key={thread.id} className={`fc-thread-row ${activeThread?.id === thread.id ? "active" : ""}`} aria-current={activeThread?.id === thread.id ? "true" : undefined} onClick={() => { onSelectThread(thread.id); setRailOpen(false); setRefinement(""); }}><MessageSquare size={16}/><span><strong>{thread.title}</strong><small>{thread.resultCompanyIds.length} result{thread.resultCompanyIds.length === 1 ? "" : "s"} · {displayDate(thread.createdAt)}</small></span></button>)}
        {!list.length ? <p className="fc-rail-empty">{threads.length ? "No matching searches." : "No searches yet"}</p> : null}
      </div>
      <p className="fc-search-storage"><HardDrive size={14}/><span>Saved locally</span></p>
    </aside>

    <section className="fc-search-canvas" aria-label={activeThread ? `Search: ${activeThread.title}` : "Search workspace"}>
      <div className="fc-search-context-bar"><button className="fc-icon-btn fc-search-rail-toggle" aria-label="Show searches" aria-controls="search-thread-rail" aria-expanded={railOpen} onClick={() => setRailOpen(!railOpen)}><PanelLeftClose size={17}/><span>Searches</span></button><MessageSquare size={15}/><span className="fc-search-context-title">{activeThread?.title || "Searches"}</span>{activeThread ? <button className="fc-text-btn" onClick={() => onRefine()}><Settings2 size={15}/><span>Filters</span></button> : null}</div>
      {detailOpen && restoringReport ? <div className="fc-loading-state" role="status"><LoaderCircle className="spin" size={24}/><p>Opening company research…</p><button className="fc-text-btn" onClick={() => onSelectCompany(null)}>Back to results<ArrowRight size={15}/></button></div> : detailOpen && activeThread && preferences ? <AgentWorkspace key={activeThread.id} companies={knownCompanies} companyDetails={companies.find(company => company.id === activeThread.selectedCompanyId)} fit={selectedFit} savedIds={savedIds} onSaveCompany={onSave} preferences={{ ...preferences, requireRevenue: preferences.revenueRequirement !== "any", minimumAnnualRevenue: preferences.minAnnualRevenue }} reports={reports} selectedId={activeThread.selectedCompanyId} initialUrl={initialUrl} threadId={activeThread.id} messages={activeThread.messages} onMessage={onMessage} onSelect={onSelectCompany} onResult={result => onResult(result, activeThread.id)} onClearInitialUrl={onClearInitialUrl} onBack={() => { onClearInitialUrl(); onSelectCompany(null); }}/> : activeThread && preferences ? <div className="fc-search-results-scroll">
        <div className="fc-search-results-content">
          <header className="fc-search-objective"><h1>{searchHeading}</h1>
            <div className="fc-filter-facts" aria-label="Search filters">
              <button onClick={() => onRefine(undefined, "budget")} aria-label={`Edit budget: ${formatUSD(preferences.budget)}`}><Wallet size={19}/><span><small>Budget</small><strong>{formatUSD(preferences.budget)}</strong></span></button>
              <button onClick={() => onRefine(undefined, "company-limit")} aria-label={`Edit company limit: ${formatUSD(companyLimit)}`}><Coins size={19}/><span><small>Per company</small><strong>{formatUSD(companyLimit)} max</strong></span></button>
              <button onClick={() => onRefine(undefined, "risk")} aria-label={`Edit risk: ${riskLabel(preferences.riskAppetite)}`}><Gauge size={19}/><span><small>Risk</small><strong>{riskLabel(preferences.riskAppetite)}</strong></span></button>
              <button onClick={() => onRefine(undefined, "revenue")} aria-label="Edit revenue requirement"><Banknote size={19}/><span><small>Revenue</small><strong>{preferences.revenueRequirement === "any" ? "Any stage" : preferences.revenueRequirement === "reported-arr" ? "Sourced ARR" : "Annual · sourced"}</strong></span></button>
            </div>
            {activeThread.brief ? <details className="fc-search-original-brief"><summary>Your brief<ChevronDown size={14}/></summary><p>{activeThread.brief}</p></details> : null}
          </header>
          <div className="fc-search-results-header"><div><h2>{loading && !companies.length ? "Search results" : `${entries.length} ${entries.length === 1 ? "company" : "companies"}`}</h2></div><div className="fc-search-results-actions"><button className="fc-text-btn" onClick={onAddCompany}><Plus size={15}/>Add company</button><button className="fc-text-btn" onClick={onRefresh}>Refresh</button></div></div>
          {newMatches ? <p className="fc-search-update">{newMatches} new match{newMatches === 1 ? "" : "es"}<button className="fc-text-btn" onClick={onRefresh}>Refresh<ArrowRight size={14}/></button></p> : null}
          {loading && !companies.length ? <div className="fc-loading-state"><LoaderCircle className="spin" size={23}/><p>Loading your results…</p></div> : catalogError ? <div className="fc-empty-state"><TriangleAlert size={26}/><h2>Companies could not be loaded</h2><p>{catalogError}</p><button className="fc-btn secondary" onClick={onRefresh}>Try again</button></div> : entries.length ? <CompanyList entries={entries} savedIds={savedIds} onSave={onSave} onResearch={company => onSelectCompany(company.id)}/> : <div className="fc-empty-state"><Search size={28}/><h2>No matches</h2><button className="fc-btn primary" onClick={() => onRefine()}>Edit filters<ArrowRight size={16}/></button></div>}
          {researchedCompanies.length ? <section className="fc-search-researched"><h2>Other research <span className="fc-quiet-badge">Outside results</span></h2><div className="fc-company-grid">{researchedCompanies.map(company => <CompanyTile key={company.id} id={company.id} name={company.name} description={companyTagline(company)} sector={"sectors" in company ? company.sectors[0] || company.industry : "Company research"} footer="Read research" saved={savedIds.includes(company.id)} onSave={() => onSave(company.id)} onOpen={() => onSelectCompany(company.id)}/>)}</div></section> : null}
          {ranked?.excluded.length ? <details className="fc-search-exclusions"><summary>{ranked.excluded.length} outside your filters<ChevronDown size={16}/></summary><div>{ranked.excluded.map(({ company, reasons }) => <section key={company.id}><div><h3>{company.name}</h3><p>{reasons.map(readableFilterReason).join(" · ")}</p></div><button className="fc-text-btn" onClick={() => onSelectCompany(company.id)}>View company<ArrowRight size={14}/></button></section>)}</div></details> : null}
          {activeThread.messages.length ? <details className="fc-search-history"><summary><History size={16}/>Activity<span>{activeThread.messages.length}</span><ChevronDown size={16}/></summary><div>{activeThread.messages.map(message => <div key={message.id} className={`fc-search-history-message ${message.role}`}><small>{message.role === "user" ? "You" : "FirstCheque"}{message.kind === "research" ? " · Company research" : " · Search"}</small><p>{message.text}</p>{message.companyId && knownCompanies.some(company => company.id === message.companyId) ? <button className="fc-text-btn" onClick={() => onSelectCompany(message.companyId!)}>View report<ArrowRight size={14}/></button> : null}</div>)}</div></details> : null}
          <form className="fc-search-refinement" onSubmit={event => { event.preventDefault(); if (refinement.trim()) { onRefine(refinement.trim()); setRefinement(""); } }}><label className="fc-sr-only" htmlFor="search-refinement">Refine search</label><div><input id="search-refinement" value={refinement} maxLength={1200} onChange={event => setRefinement(event.target.value)} placeholder="Refine this search…"/><button className="fc-btn primary" type="submit" disabled={!refinement.trim()}>Update<ArrowRight size={16}/></button></div></form>
        </div>
      </div> : <div className="fc-agent-empty"><span className="fc-agent-symbol"><Sparkles size={30}/></span><h1>What are you looking for?</h1><button className="fc-btn primary" onClick={onNewSearch}>New search<ArrowRight size={17}/></button></div>}
    </section>
  </div>;
}

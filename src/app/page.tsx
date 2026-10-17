"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Bookmark, Check, ChevronDown, CircleHelp, Compass, FlaskConical, Link2, LoaderCircle, Plus, Search, Settings2, ShieldCheck, Sparkles, TriangleAlert, Wallet } from "lucide-react";
import { DEFAULT_DISCOVERY_PREFERENCES, filterAndRankCompanies } from "@/lib/discovery";
import { INDUSTRIES, STAGES } from "@/lib/data";
import type { CatalogResponse, DiscoveryCompany, DiscoveryPreferences } from "@/lib/discovery-types";
import type { LiveDiligenceResult } from "@/lib/live-research-types";
import { AgentWorkspace, safeWebUrl } from "@/components/agent-workspace";
import { CompanyList, readableFilterReason, formatUSD as currency } from "@/components/company-list";
import { InvestmentPreferences, riskLabel, revenueLabel, type BriefProposal } from "@/components/investment-preferences";
import { WorkspaceDialog } from "@/components/workspace-dialog";

const DemoWorkspace = dynamic(() => import("@/components/demo-workspace"), { loading: () => <div className="fc-loading-page"><LoaderCircle className="spin" size={24}/>Opening paper demo…</div> });
type View = "Discover" | "Agent" | "Watchlist" | "Portfolio";
const STORAGE_KEY = "firstcheque.live-workspace.v1";
function isPreferences(value: unknown): value is DiscoveryPreferences {
  if (!value || typeof value !== "object") return false;
  const item = value as DiscoveryPreferences;
  return Array.isArray(item.industries) && item.industries.every(industry => INDUSTRIES.includes(industry)) && Array.isArray(item.stages) && item.stages.every(stage => STAGES.includes(stage)) && Array.isArray(item.sectors) && item.sectors.every(sector => typeof sector === "string") && (item.excludedSectors === undefined || Array.isArray(item.excludedSectors) && item.excludedSectors.every(sector => typeof sector === "string")) && ["conservative", "balanced", "adventurous"].includes(item.riskAppetite) && Number.isFinite(item.budget) && item.budget >= 100 && item.budget <= 10000000 && Number.isFinite(item.maxAllocationPct) && item.maxAllocationPct > 0 && item.maxAllocationPct <= 100 && Number.isFinite(item.horizonYears) && item.horizonYears >= 1 && item.horizonYears <= 30 && ["any", "reported-revenue", "reported-arr"].includes(item.revenueRequirement) && typeof item.offeringOnly === "boolean" && typeof item.includeUnverified === "boolean" && typeof item.thesis === "string" && typeof item.query === "string" && (item.minAnnualRevenue === null || Number.isFinite(item.minAnnualRevenue) && item.minAnnualRevenue >= 0) && (item.maxMinimumCheck === null || Number.isFinite(item.maxMinimumCheck) && item.maxMinimumCheck >= 0);
}


export default function Home() {
  const [view, setView] = useState<View>("Discover");
  const [demoView, setDemoView] = useState<"Discover" | "Portfolio" | "Research Lab" | null>(null);
  const [preferences, setPreferences] = useState<DiscoveryPreferences>(DEFAULT_DISCOVERY_PREFERENCES);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [reports, setReports] = useState<LiveDiligenceResult[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [initialUrl, setInitialUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [brief, setBrief] = useState("");
  const [parsing, setParsing] = useState(false);
  const [briefError, setBriefError] = useState("");
  const [proposal, setProposal] = useState<BriefProposal | null>(null);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [excludedOpen, setExcludedOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [sort, setSort] = useState("fit");
  const companies = catalog?.companies || [];
  const ranked = useMemo(() => filterAndRankCompanies(companies, preferences), [companies, preferences]);
  const savedCompanies = companies.filter(company => watchlist.includes(company.id));
  const entries = view === "Watchlist" ? savedCompanies.filter(company => `${company.name} ${company.description}`.toLowerCase().includes(preferences.query.toLowerCase())).map(company => { const match = ranked.matches.find(item => item.company.id === company.id); return { company, reasons: match?.reasons || [], score: match?.score, warnings: match?.warnings || ranked.excluded.find(item => item.company.id === company.id)?.reasons || [] }; }) : ranked.matches;
  const visibleEntries = [...entries].sort((a, b) => sort === "name" ? a.company.name.localeCompare(b.company.name) : sort === "minimum" ? (a.company.minInvestment ?? Infinity) - (b.company.minInvestment ?? Infinity) : 0);
  const perCompany = Math.min(preferences.budget * preferences.maxAllocationPct / 100, preferences.maxMinimumCheck ?? Infinity);
  const loadCatalog = useCallback(async () => {
    setLoading(true); setCatalogError("");
    try { const response = await fetch("/api/catalog", { cache: "no-store" }); if (!response.ok) throw new Error("The company catalog is unavailable. Please try again."); const data = await response.json(); if (!Array.isArray(data.companies)) throw new Error("The catalog response could not be read."); setCatalog(data); } catch (error) { setCatalogError(error instanceof Error ? error.message : "The catalog could not be loaded."); } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); if (saved?.version === 1) { if (isPreferences(saved.preferences)) { setPreferences(saved.preferences); setBrief(saved.preferences.thesis); } if (Array.isArray(saved.watchlist)) setWatchlist([...new Set(saved.watchlist.filter((id: unknown): id is string => typeof id === "string"))] as string[]); } } catch { /* Malformed local state starts a new workspace. */ }
    const params = new URLSearchParams(window.location.search); const initial = params.get("view"); if (initial && ["Discover", "Agent", "Watchlist", "Portfolio"].includes(initial)) setView(initial as View); setSelectedId(params.get("company")); setLoaded(true);
    void loadCatalog();
    fetch("/api/dossiers", { cache: "no-store" }).then(response => response.ok ? response.json() : null).then(data => { if (Array.isArray(data?.dossiers)) setReports(data.dossiers); }).catch(() => { /* A report remains available in the current session if persistence is unavailable. */ });
  }, [loadCatalog]);
  useEffect(() => { if (loaded) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, preferences, watchlist })); } catch { /* Storage may be disabled; the current session remains usable. */ } } }, [preferences, watchlist, loaded]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(""), 3500); return () => clearTimeout(timer); }, [toast]);
  function navigate(next: View, companyId: string | null = selectedId) { setView(next); if (next === "Agent") setSelectedId(companyId); const url = new URL(window.location.href); url.searchParams.set("view", next); if (next === "Agent" && companyId) url.searchParams.set("company", companyId); else url.searchParams.delete("company"); window.history.replaceState({}, "", url); window.scrollTo({ top: 0 }); }
  function openCompany(company: DiscoveryCompany) { setSelectedId(company.id); navigate("Agent", company.id); }
  function toggleSave(id: string) { const saved = watchlist.includes(id); setWatchlist(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]); setToast(saved ? "Removed from your watchlist" : "Saved to your watchlist"); }
  async function parseBrief(event: React.FormEvent) {
    event.preventDefault(); if (!brief.trim()) { setBriefError("Write a short investing brief, or use the filters below."); return; } setParsing(true); setBriefError("");
    try { const response = await fetch("/api/preferences", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brief: brief.trim(), base: preferences }) }); const data = await response.json(); if (!response.ok || !isPreferences(data.preferences)) throw new Error(data.error || "Your brief couldn’t be parsed. Try again or edit the filters directly."); setProposal(data); setPrefsOpen(true); } catch (error) { setBriefError(error instanceof Error ? error.message : "Preferences are unavailable."); } finally { setParsing(false); }
  }
  const receivedResult = useCallback((result: LiveDiligenceResult) => { setReports(current => [result, ...current.filter(item => item.companyId !== result.companyId)]); setSelectedId(result.companyId); void loadCatalog(); }, [loadCatalog]);
  const clearInitialUrl = useCallback(() => setInitialUrl(""), []);
  const editPreferences = () => { setProposal(null); setPrefsOpen(true); };
  if (demoView) return <DemoWorkspace initialView={demoView} onExit={() => setDemoView(null)}/>;
  const nav = [{ title: "Discover", icon: Compass }, { title: "Agent", icon: Sparkles }, { title: "Watchlist", icon: Bookmark }, { title: "Portfolio", icon: Wallet }] as const;
  const interests = preferences.sectors.length ? preferences.sectors.join(", ") : preferences.industries.length ? preferences.industries.join(", ") : "All sectors";

  return <div className="fc-workspace">
    <a className="skip-link" href="#fc-main">Skip to main content</a>
    <aside className="fc-sidebar">
      <button className="fc-brand" onClick={() => navigate("Discover")} aria-label="FirstCheque home"><span className="brand-mark"/><span>firstcheque<span className="lime">.</span></span></button>
      <nav className="fc-navigation" aria-label="Primary navigation">
        {nav.map(item => <button key={item.title} className={view === item.title ? "active" : ""} aria-current={view === item.title ? "page" : undefined} onClick={() => navigate(item.title)} title={item.title}><item.icon size={21}/><span>{item.title}</span>{item.title === "Watchlist" && watchlist.length ? <span className="fc-nav-count">{watchlist.length}</span> : null}</button>)}
      </nav>
      <div className="fc-sidebar-footer">
        <button onClick={() => setHelpOpen(true)} title="How it works"><CircleHelp size={19}/><span>How it works</span></button>
        <button onClick={() => setDemoView("Research Lab")} title="Demo and proof lab"><FlaskConical size={19}/><span>Demo & proof</span></button>
        <button onClick={editPreferences} title="Investment preferences"><Settings2 size={19}/><span>Preferences</span></button>
      </div>
    </aside>

    <div className="fc-main-shell">
      <header className="fc-topbar">
        <span className="fc-breadcrumb">{view === "Agent" ? "Research workspace" : view}</span>
        <div className="fc-top-actions">
          <label className="fc-global-search"><Search size={18}/><input aria-label="Search companies" placeholder="Search companies" value={preferences.query} onChange={event => { setPreferences(current => ({ ...current, query: event.target.value })); if (view === "Agent" || view === "Portfolio") navigate("Discover"); }}/></label>
          <button className="fc-text-btn" onClick={() => setDemoView("Discover")}>Paper demo</button>
        </div>
      </header>

      <main id="fc-main" tabIndex={-1} className={view === "Agent" ? "fc-agent-main" : "fc-main-content"}>
        {view === "Agent" ? <AgentWorkspace companies={companies} preferences={{ ...preferences, requireRevenue: preferences.revenueRequirement !== "any", minimumAnnualRevenue: preferences.minAnnualRevenue }} reports={reports} selectedId={selectedId} initialUrl={initialUrl} onSelect={id => navigate("Agent", id)} onResult={receivedResult} onClearInitialUrl={clearInitialUrl} onDiscover={() => navigate("Discover")}/> : <>
          <div className="fc-page-heading">
            <div><h1>{view === "Discover" ? "Discover startups" : view === "Watchlist" ? "Your watchlist" : "Your workspace"}</h1><p>{view === "Discover" ? "Find companies that fit your goals. Research before you decide." : view === "Watchlist" ? "Your saved companies, even when your preferences change." : "Keep track of your research and practice with a paper portfolio."}</p></div>
            <button className="fc-btn secondary" onClick={() => setImportOpen(true)}><Plus size={18}/>Add a company</button>
          </div>

          {view === "Portfolio" ? <>
            <div className="fc-overview-stats"><div><span>Saved companies</span><strong>{savedCompanies.length}</strong></div><div><span>Research reports</span><strong>{reports.length}</strong></div></div>
            <div className="fc-portfolio-callout"><Wallet size={28}/><div><h2>Try paper investing</h2><p>Practice with fictional startups. No money moves.</p></div><button className="fc-btn primary" onClick={() => setDemoView("Portfolio")}>Open paper portfolio<ArrowRight size={17}/></button></div>
            <div className="fc-results-heading"><h2>Your research shortlist</h2></div>
            {savedCompanies.length ? <CompanyList entries={savedCompanies.map(company => ({ company, reasons: [] }))} savedIds={watchlist} onSave={toggleSave} onResearch={openCompany}/> : <div className="fc-empty-state"><Bookmark size={28}/><h2>No saved companies yet</h2><p>Save a company while exploring to keep your research here.</p><button className="fc-btn secondary" onClick={() => navigate("Discover")}>Explore companies<ArrowRight size={17}/></button></div>}
          </> : <>
            {view === "Discover" ? <>
              <form className="fc-brief-card" onSubmit={parseBrief}>
                <label className="fc-brief-title" htmlFor="investing-brief">What are you looking for?</label>
                <textarea id="investing-brief" aria-label="Your investment brief" value={brief} maxLength={1200} onChange={event => setBrief(event.target.value)} placeholder={"I have $2,000 to invest in AI or climate startups.\nI prefer companies with annual revenue."}/>
                <div className="fc-brief-bottom"><span>You’ll review the filters first.</span><button className="fc-btn primary" type="submit" disabled={parsing}>{parsing ? <LoaderCircle size={17} className="spin"/> : null}{parsing ? "Reading your brief…" : preferences.thesis ? "Update matches" : "Find companies"}<ArrowRight size={17}/></button></div>
                {briefError ? <p className="fc-inline-error" role="alert">{briefError}</p> : null}
              </form>
              <section className="fc-criteria-strip" aria-label="Your current preferences">
                <dl><div><dt>Budget</dt><dd>{currency(preferences.budget)}<small>{riskLabel(preferences.riskAppetite)} risk</small></dd></div><div><dt>Per company</dt><dd>Up to {currency(perCompany)}</dd></div><div><dt>Interests</dt><dd>{interests}</dd></div><div><dt>Revenue</dt><dd>{revenueLabel(preferences.revenueRequirement)}</dd></div></dl>
                <button className="fc-text-btn" onClick={editPreferences}>Edit preferences<Settings2 size={16}/></button>
              </section>
            </> : null}

            <div className="fc-results-heading">
              <h2>{view === "Watchlist" ? "Saved companies" : "Your matches"}<span className="fc-count">{visibleEntries.length}</span></h2>
              <label className="fc-sort">Sort by<select aria-label="Sort companies" value={sort} onChange={event => setSort(event.target.value)}><option value="fit">Best filter fit</option><option value="name">Name</option><option value="minimum">Minimum investment</option></select></label>
            </div>
            {loading && !catalog ? <div className="fc-loading-state"><LoaderCircle className="spin" size={24}/><p>Loading companies…</p></div> : catalogError ? <div className="fc-empty-state"><TriangleAlert size={28}/><h2>We couldn’t load the companies</h2><p>{catalogError}</p><button className="fc-btn secondary" onClick={() => loadCatalog()}>Try again</button></div> : visibleEntries.length ? <CompanyList entries={visibleEntries} savedIds={watchlist} onSave={toggleSave} onResearch={openCompany}/> : <div className="fc-empty-state"><Search size={28}/><h2>{view === "Watchlist" ? "No saved companies yet" : "No companies match all your filters"}</h2><p>{view === "Watchlist" ? "Save a company from Discover to start your shortlist." : "Some companies have missing evidence. Review the exclusions below or change your preferences."}</p><button className="fc-btn secondary" onClick={() => view === "Watchlist" ? navigate("Discover") : editPreferences()}>{view === "Watchlist" ? "Explore companies" : "Adjust preferences"}<ArrowRight size={17}/></button></div>}

            {view === "Discover" && ranked.excluded.length ? <button className="fc-exclusions-summary" onClick={() => setExcludedOpen(true)}><span><strong>{ranked.excluded.length} companies</strong> are outside your filters</span><span>See why<ArrowRight size={17}/></span></button> : null}
            {view === "Discover" ? <p className="fc-catalog-note">Offering information is a dated snapshot. Check current terms at the source.</p> : null}
          </>}
          <footer className="fc-page-footer"><ShieldCheck size={16}/><span>Research only. Investment terms and eligibility are checked at the original platform.</span></footer>
        </>}
      </main>
    </div>

    {prefsOpen ? <InvestmentPreferences preferences={proposal?.preferences || preferences} proposal={proposal} validate={isPreferences} onClose={() => { setPrefsOpen(false); setProposal(null); }} onSave={next => { setPreferences(next); setBrief(next.thesis); setPrefsOpen(false); setProposal(null); setToast("Preferences saved"); }}/> : null}
    {importOpen ? <WorkspaceDialog title="Research a company" subtitle="Paste its website to open it in Agent." onClose={() => setImportOpen(false)}><form onSubmit={event => { event.preventDefault(); if (!safeWebUrl(importUrl)) return; setInitialUrl(importUrl.trim()); setSelectedId(null); setImportOpen(false); navigate("Agent", null); }}><label className="fc-field"><span>Company website</span><input type="url" required placeholder="https://company.com" value={importUrl} onChange={event => setImportUrl(event.target.value)}/></label><p className="fc-preference-footnote">You’ll choose a research question next. Adding a company doesn’t mean it has an investment offering.</p><div className="fc-dialog-actions"><button className="fc-btn secondary" type="button" onClick={() => setImportOpen(false)}>Cancel</button><button className="fc-btn primary" type="submit">Continue<ArrowRight size={17}/></button></div></form></WorkspaceDialog> : null}
    {excludedOpen ? <WorkspaceDialog title="Why companies don’t match" subtitle="You can still research a company that doesn’t meet your filters." onClose={() => setExcludedOpen(false)} wide><div className="fc-excluded-list">{ranked.excluded.map(({ company, reasons }) => <div key={company.id}><div><h3>{company.name}</h3><ul>{reasons.map(reason => <li key={reason}>{readableFilterReason(reason)}</li>)}</ul></div><button className="fc-btn secondary" onClick={() => { setExcludedOpen(false); openCompany(company); }}>{company.dossierId ? "View research" : "Research company"}<ArrowRight size={16}/></button></div>)}</div></WorkspaceDialog> : null}
    {helpOpen ? <WorkspaceDialog title="How FirstCheque works" onClose={() => setHelpOpen(false)}><ol className="fc-help-steps"><li><strong>Set your preferences</strong><p>Describe your budget, interests, and requirements. Review the filters before applying them.</p></li><li><strong>Research a company</strong><p>Read the findings, inspect the evidence, and look for unanswered questions.</p></li><li><strong>Continue at the source</strong><p>Review current offering terms and eligibility on the original platform.</p></li></ol><p className="fc-preference-footnote">FirstCheque does not hold money or execute trades. The paper demo uses fictional companies.</p><div className="fc-dialog-actions"><button className="fc-btn primary" onClick={() => setHelpOpen(false)}>Got it</button></div></WorkspaceDialog> : null}
    {toast ? <div className="fc-toast" role="status"><Check size={17}/>{toast}</div> : null}
  </div>;
}

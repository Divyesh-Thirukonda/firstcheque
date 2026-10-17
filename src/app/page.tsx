"use client";

import {ResearchHub,YourThesis} from "@/components/research-hub";
import { SeedStreetBrand } from "@/components/seed-street-brand";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { FileText, ArrowRight, Bookmark, Check, CircleHelp, Compass, FlaskConical, LoaderCircle, Plus, Search, Settings2, ShieldCheck, Sparkles, TriangleAlert, Wallet, TrendingUp, Radar, ArrowUpRight } from "lucide-react";
import { DEFAULT_DISCOVERY_PREFERENCES, DISCOVERY_INDUSTRIES, DISCOVERY_STAGES, matchesCatalogQuery, filterAndRankCompanies } from "@/lib/discovery";
import type { CatalogResponse, DiscoveryCompany, DiscoveryPreferences } from "@/lib/discovery-types";
import type { LiveDiligenceResult } from "@/lib/live-research-types";
import { appendSearchMessage, createSearchThread, hydrateSearchThreads, isDiscoveryPreferences, selectThreadCompany, updateSearchThreadPreferences, type SearchMessage, type SearchThread } from "@/lib/search-threads";
import { safeWebUrl } from "@/components/agent-workspace";
import { SearchWorkspace } from "@/components/search-workspace";
import { ProposalLibrary } from "@/components/investment-proposal";
import { CompanyProfile } from "@/components/company-profile";
import {FounderLeads} from "@/components/commercial-profile";
import {eventPriority} from "@/lib/event-discovery";
import { CompanyList, formatUSD as currency } from "@/components/company-list";
import { InvestmentPreferences, riskLabel, revenueLabel, type BriefProposal } from "@/components/investment-preferences";
import { EXPLORATIONS, explorationCompanies, explorationIntent, type ExplorationKind } from "@/lib/exploration";
import { WorkspaceDialog } from "@/components/workspace-dialog";

type View = "Discover" | "Agent" | "Watchlist" | "Research" | "Your thesis" | "Proposals";
type ReviewIntent = { kind: "new" } | { kind: "refine"; threadId: string };
const STORAGE_KEY = "firstcheque.live-workspace.v1";
const SEARCH_STORAGE_KEY = "firstcheque.searches.v1";

const resultIds = (companies: DiscoveryCompany[], preferences: DiscoveryPreferences) => filterAndRankCompanies(companies, preferences).matches.map(({ company }) => company.id);
function searchCriteriaText(preferences: DiscoveryPreferences) {
  const interests = preferences.sectors.join(", ") || preferences.industries.join(", ") || "all sectors";
  const limit = Math.min(preferences.budget * preferences.maxAllocationPct / 100, preferences.maxMinimumCheck ?? Infinity);
  return `${currency(preferences.budget)} budget; up to ${currency(limit)} per company; ${interests}; ${revenueLabel(preferences.revenueRequirement).toLowerCase()}; ${riskLabel(preferences.riskAppetite).toLowerCase()} risk.`;
}
function recordSearch(thread: SearchThread, request: string): SearchThread {
  const withRequest = appendSearchMessage(thread, { id: crypto.randomUUID(), role: "user", kind: "search", text: request });
  return appendSearchMessage(withRequest, { id: crypto.randomUUID(), role: "assistant", kind: "search", text: `${thread.resultCompanyIds.length} compan${thread.resultCompanyIds.length === 1 ? "y meets" : "ies meet"} the reviewed filters in the sourced catalog. ${searchCriteriaText(thread.preferences)}` });
}

export default function Home() {
  const [view, setView] = useState<View>("Discover");
  const [preferences, setPreferences] = useState<DiscoveryPreferences>(DEFAULT_DISCOVERY_PREFERENCES);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [threads, setThreads] = useState<SearchThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [legacyCompanyId, setLegacyCompanyId] = useState<string | null>(null);
  const [browseProposal, setBrowseProposal] = useState(false);
  const [browseCompany, setBrowseCompany] = useState<DiscoveryCompany | null>(null);
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [reports, setReports] = useState<LiveDiligenceResult[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [initialUrl, setInitialUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [brief, setBrief] = useState("");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogStage, setCatalogStage] = useState("all");
  const [catalogIndustry, setCatalogIndustry] = useState("all");
  const [catalogGroup, setCatalogGroup] = useState("event-handoff");
  const [catalogLimit, setCatalogLimit] = useState(24);
  const [parsing, setParsing] = useState(false);
  const [briefError, setBriefError] = useState("");
  const [proposal, setProposal] = useState<BriefProposal | null>(null);
  const [reviewPreferences, setReviewPreferences] = useState<DiscoveryPreferences>(DEFAULT_DISCOVERY_PREFERENCES);
  const [reviewIntent, setReviewIntent] = useState<ReviewIntent>({ kind: "new" });
  const [reviewRequest, setReviewRequest] = useState("");
  const [filterFocus, setFilterFocus] = useState<"budget" | "company-limit" | "risk" | "revenue" | undefined>();
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [sort, setSort] = useState("fit");
  const companies = catalog?.companies || [];
  const founderLeads=(catalog?.founderLeads||[]).filter(person=>!catalogQuery||`${person.name} ${person.role}`.toLowerCase().includes(catalogQuery.toLowerCase()));
  const eventCount=companies.filter(company=>company.catalogOrigin==='event-handoff').length;
  const activeThread = threads.find(thread => thread.id === activeThreadId) || null;
  const browsePreferences = useMemo(() => ({ ...preferences, query: catalogQuery }), [preferences, catalogQuery]);
  const ranked = useMemo(() => filterAndRankCompanies(companies, browsePreferences), [companies, browsePreferences]);
  const savedCompanies = companies.filter(company => watchlist.includes(company.id));
  const entries = (view === "Watchlist" ? savedCompanies : companies).filter(company => matchesCatalogQuery(company,catalogQuery)
    && (catalogStage === "all" || company.stage === catalogStage)
    && (catalogIndustry === "all" || company.industry === catalogIndustry)
    && (catalogGroup === "all" || (catalogGroup === "offering" ? company.kind === "offering" : catalogGroup === "event-review" ? company.catalogOrigin === "event-handoff" && company.publishStatus!=="profile_ready" : company.catalogOrigin === catalogGroup)))
    .map(company => {const match=ranked.matches.find(item=>item.company.id===company.id);return {company,reasons:match?.reasons||[],score:match?.score,warnings:match?.warnings||ranked.excluded.find(item=>item.company.id===company.id)?.reasons||[]};});
  const sortedEntries = [...entries].sort((a,b)=>sort === "name" ? a.company.name.localeCompare(b.company.name) : sort === "minimum" ? (a.company.minInvestment??Infinity)-(b.company.minInvestment??Infinity) : eventPriority(a.company)-eventPriority(b.company));
  const visibleEntries = sortedEntries.slice(0,catalogLimit);
  useEffect(()=>setCatalogLimit(24),[catalogQuery,catalogStage,catalogIndustry,catalogGroup,view,sort]);
  function browseCollection(group:string){setCatalogGroup(group);setCatalogQuery("");setCatalogStage("all");setCatalogIndustry("all");setSort("fit");}
  function clearCatalogFilters(){setCatalogQuery("");setCatalogStage("all");setCatalogIndustry("all");setCatalogGroup("all");}


  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setCatalogError("");
    try {
      const response = await fetch("/api/catalog", { cache: "no-store" });
      if (!response.ok) throw new Error("The company catalog is unavailable. Please try again.");
      const data = await response.json();
      if (!Array.isArray(data.companies)) throw new Error("The catalog response could not be read.");
      setCatalog(data);
      return data as CatalogResponse;
    } catch (error) {
      setCatalogError(error instanceof Error ? error.message : "The catalog could not be loaded.");
      return null;
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let restoredThreads: SearchThread[] = [];
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved?.version === 1) {
        if (isDiscoveryPreferences(saved.preferences)) setPreferences(saved.preferences);
        if (Array.isArray(saved.watchlist)) setWatchlist([...new Set(saved.watchlist.filter((id: unknown): id is string => typeof id === "string"))] as string[]);
      }
    } catch { /* Malformed preferences do not affect separately stored searches. */ }
    try {
      restoredThreads = hydrateSearchThreads(localStorage.getItem(SEARCH_STORAGE_KEY));
      setThreads(restoredThreads);
    } catch { /* Search history may be unavailable when browser storage is disabled. */ }
    const params = new URLSearchParams(window.location.search);
    const initial = params.get("view");
    if (initial && ["Discover", "Agent", "Watchlist", "Research", "Your thesis", "Proposals"].includes(initial)) setView(initial as View);
    const requestedSearch = params.get("search");
    const requestedCompany = params.get("company");
    const restored = restoredThreads.find(thread => thread.id === requestedSearch) || (!requestedSearch ? restoredThreads[0] : null);
    if (restored) {
      setActiveThreadId(restored.id);
      if (requestedCompany && initial === "Agent") setThreads(current => current.map(thread => thread.id === restored.id ? selectThreadCompany(thread, requestedCompany) : thread));
    } else if (requestedCompany && initial === "Agent") setLegacyCompanyId(requestedCompany);
    setLoaded(true);
    void loadCatalog();
    fetch("/api/dossiers", { cache: "no-store" }).then(response => response.ok ? response.json() : null).then(data => {
      if (Array.isArray(data?.dossiers)) setReports(current => [...current, ...(data.dossiers as LiveDiligenceResult[]).filter(report => !current.some(item => item.companyId === report.companyId))]);
    }).catch(() => { /* Reports created in this session remain usable if persistence is unavailable. */ }).finally(() => setReportsLoading(false));
  }, [loadCatalog]);

  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, preferences, watchlist })); }
    catch { /* Storage may be disabled; the current session remains usable. */ }
  }, [preferences, watchlist, loaded]);
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(SEARCH_STORAGE_KEY, JSON.stringify({ version: 1, threads })); }
    catch { /* Search history remains available for this session. */ }
  }, [threads, loaded]);
  useEffect(() => {
    if (!loaded || legacyCompanyId) return;
    const url = new URL(window.location.href);
    url.searchParams.set("view", view);
    if (view === "Agent" && activeThreadId) url.searchParams.set("search", activeThreadId);
    else url.searchParams.delete("search");
    if (view === "Agent" && activeThread?.selectedCompanyId) url.searchParams.set("company", activeThread.selectedCompanyId);
    else url.searchParams.delete("company");
    window.history.replaceState({}, "", url);
  }, [loaded, view, activeThreadId, activeThread?.selectedCompanyId, legacyCompanyId]);
  useEffect(() => {
    if (!legacyCompanyId || !catalog) return;
    const company = catalog.companies.find(item => item.id === legacyCompanyId);
    if (company) {
      const thread = createSearchThread(preferences, resultIds(catalog.companies, preferences), company.id);
      setThreads(current => [thread, ...current]);
      setActiveThreadId(thread.id);
    }
    setLegacyCompanyId(null);
  }, [legacyCompanyId, catalog, preferences]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  function navigate(next: View) {
    if(next!=="Discover"&&catalogGroup==="founders")setCatalogGroup("all");
    setView(next);
    setInitialUrl("");
    window.scrollTo({ top: 0 });
  }
  function newSearch() {
    setBrief(preferences.thesis);
    setBriefError("");
    setCatalogQuery("");
    navigate("Discover");
    requestAnimationFrame(() => document.getElementById("investing-brief")?.focus());
  }
  function selectSearch(id: string) {
    setActiveThreadId(id);
    setInitialUrl("");
    setView("Agent");
  }
  function openCompany(company: DiscoveryCompany) { setBrowseProposal(false); setBrowseCompany(company); }
  function startCompanyResearch(company: DiscoveryCompany) {
    const context = { ...preferences, query: company.name, thesis: `Research ${company.name}. Investigate its business, founders, competition, financials, and risks.` };
    const existing = threads.find(thread => thread.brief === context.thesis);
    const thread = existing ? selectThreadCompany(existing, company.id) : recordSearch(createSearchThread(context, resultIds(companies, context), company.id), context.thesis);
    setThreads(current => existing ? current.map(item => item.id === thread.id ? thread : item) : [thread, ...current]);
    setActiveThreadId(thread.id);
    setBrowseCompany(null);
    setInitialUrl("");
    setView("Agent");
    window.scrollTo({ top: 0 });
  }
  function toggleSave(id: string) {
    const saved = watchlist.includes(id);
    setWatchlist(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
    setToast(saved ? "Removed from your watchlist" : "Saved to your watchlist");
  }
  async function prepareBrief(text: string, base: DiscoveryPreferences, intent: ReviewIntent) {
    if (!text.trim()) { setBriefError("Enter a search or choose filters."); return; }
    setFilterFocus(undefined);
    setParsing(true);
    setBriefError("");
    setReviewIntent(intent);
    setReviewRequest(text.trim());
    setReviewPreferences(base);
    try {
      const response = await fetch("/api/preferences", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brief: text.trim(), base }) });
      const data = await response.json();
      if (!response.ok || !isDiscoveryPreferences(data.preferences)) throw new Error(data.error || "Your brief couldn’t be parsed. Try again or edit the filters directly.");
      setProposal(data);
      setPrefsOpen(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Preferences are unavailable.";
      setBriefError(message);
      if (intent.kind === "refine") setToast(message);
    } finally { setParsing(false); }
  }
  function startExploration(kind: ExplorationKind, prompt = EXPLORATIONS[kind].prompt as string) {
    const context = { ...DEFAULT_DISCOVERY_PREFERENCES, sectors: kind === "fundraising" ? ["AI infrastructure"] : [], offeringOnly: false, includeUnverified: true, thesis: prompt };
    const candidates = explorationCompanies(companies, kind);
    const thread: SearchThread = { ...createSearchThread(context, candidates.map(company => company.id)), exploration: kind, title: EXPLORATIONS[kind].title };
    setThreads(current => [thread, ...current]);
    setActiveThreadId(thread.id);
    setInitialUrl("");
    setView("Agent");
    setBriefError("");
  }
  function parseBrief(event: FormEvent) {
    event.preventDefault();
    const exploration = explorationIntent(brief);
    if (exploration) { startExploration(exploration, brief.trim()); return; }
    void prepareBrief(brief, { ...preferences, query: "" }, { kind: "new" });
  }
  function refineSearch(text?: string, field?: "budget" | "company-limit" | "risk" | "revenue") {
    setFilterFocus(field);
    if (!activeThread) { newSearch(); return; }
    const intent: ReviewIntent = { kind: "refine", threadId: activeThread.id };
    if (text !== undefined) { void prepareBrief(text, activeThread.preferences, intent); return; }
    setReviewIntent(intent);
    setReviewRequest("");
    setReviewPreferences(activeThread.preferences);
    setProposal(null);
    setPrefsOpen(true);
  }
  function editPreferences() {
    setFilterFocus(undefined);
    if (view === "Agent" && activeThread) { refineSearch(); return; }
    setReviewIntent({ kind: "new" });
    setReviewRequest("");
    setReviewPreferences({ ...preferences, query: catalogQuery, thesis: brief.trim() || preferences.thesis });
    setProposal(null);
    setPrefsOpen(true);
  }
  function saveSearch(next: DiscoveryPreferences) {
    if(view==="Your thesis"){setPreferences({...next,query:""});setPrefsOpen(false);setProposal(null);setToast("Your thesis is saved");return;}
    const ids = resultIds(companies, next);
    if (reviewIntent.kind === "refine") {
      const targetId = reviewIntent.threadId;
      setThreads(current => current.map(thread => {
        if (thread.id !== targetId) return thread;
        const researchThesis = reviewRequest ? `${(thread.brief || thread.preferences.thesis).slice(0, 750)}\nLatest refinement: ${reviewRequest.slice(0, 1200)}` : next.thesis;
        const updated = updateSearchThreadPreferences(thread, { ...next, thesis: researchThesis }, ids);
        const request = reviewRequest || `Update the search filters: ${searchCriteriaText(next)}${next.thesis !== thread.preferences.thesis ? `\nResearch brief: ${next.thesis}` : ""}`;
        return recordSearch({ ...updated, brief: thread.brief }, request);
      }));
      setActiveThreadId(targetId);
      setToast("Search updated");
    } else {
      const thread = recordSearch(createSearchThread(next, ids), next.thesis.trim() || `Find companies with these filters: ${searchCriteriaText(next)}`);
      setThreads(current => [thread, ...current]);
      setActiveThreadId(thread.id);
      setPreferences({ ...next, query: "" });
      setToast("Search started");
    }
    setInitialUrl("");
    setView("Agent");
    setPrefsOpen(false);
    setProposal(null);
  }
  async function refreshSearch() {
    const targetId = activeThread?.id;
    const refreshed = await loadCatalog();
    if (!targetId || !refreshed) return;
    setThreads(current => current.map(thread => thread.id === targetId ? { ...thread, resultCompanyIds: thread.exploration ? explorationCompanies(refreshed.companies, thread.exploration).map(company => company.id) : resultIds(refreshed.companies, thread.preferences), updatedAt: new Date().toISOString() } : thread));
    setToast("Search checked against the current catalog");
  }
  function selectCompany(id: string | null) {
    if (!activeThreadId) return;
    setThreads(current => current.map(thread => thread.id === activeThreadId ? selectThreadCompany(thread, id) : thread));
  }
  const receivedMessage = useCallback((threadId: string, message: SearchMessage) => {
    setThreads(current => current.map(thread => thread.id === threadId ? appendSearchMessage(thread, message) : thread));
  }, []);
  const receivedResult = useCallback((result: LiveDiligenceResult, threadId: string) => {
    setReports(current => [result, ...current.filter(item => item.companyId !== result.companyId)]);
    setThreads(current => current.map(thread => thread.id === threadId && (!thread.selectedCompanyId || thread.selectedCompanyId === result.companyId) ? selectThreadCompany(thread, result.companyId) : thread));
    void loadCatalog();
  }, [loadCatalog]);
  const clearInitialUrl = useCallback(() => setInitialUrl(""), []);
  function importCompany(event: FormEvent) {
    event.preventDefault();
    const url = safeWebUrl(importUrl);
    if (!url) return;
    if (view !== "Agent" || !activeThread) {
      const companyBrief = `Research companies from a website: ${new URL(url).hostname}`;
      const context = { ...preferences, thesis: companyBrief, query: "", offeringOnly: false };
      const thread = createSearchThread(context, resultIds(companies, context));
      setThreads(current => [thread, ...current]);
      setActiveThreadId(thread.id);
    } else selectCompany(null);
    setInitialUrl(url);
    setImportOpen(false);
    setImportUrl("");
    setView("Agent");
  }

  const nav = [{ title: "Discover", icon: Compass }, { title: "Your thesis", icon: Settings2 }, { title: "Agent", icon: Sparkles }, { title: "Research", icon: FlaskConical }, { title: "Watchlist", icon: Bookmark }, { title: "Proposals", icon: FileText }] as const;

  return <div className="fc-workspace">
    <a className="skip-link" href="#fc-main">Skip to main content</a>
    <aside className="fc-sidebar">
      <button className="fc-brand" onClick={() => navigate("Discover")} aria-label="Seed Street home"><SeedStreetBrand/></button>
      <nav className="fc-navigation" aria-label="Primary navigation">
        {nav.map(item => <button key={item.title} className={view === item.title ? "active" : ""} aria-current={view === item.title ? "page" : undefined} onClick={() => navigate(item.title)} title={item.title}><item.icon size={21}/><span>{item.title}</span>{item.title === "Watchlist" && watchlist.length ? <span className="fc-nav-count">{watchlist.length}</span> : null}</button>)}
      </nav>
      <div className="fc-sidebar-footer">
        <button onClick={() => setHelpOpen(true)} title="How it works"><CircleHelp size={19}/><span>How it works</span></button>
        <button onClick={view === "Agent" && activeThread?.exploration ? newSearch : editPreferences} title={view === "Agent" && activeThread?.exploration ? "Start an investment search" : view === "Agent" && activeThread ? "Edit this search" : "Choose search preferences"}><Settings2 size={19}/><span>{view === "Agent" && activeThread?.exploration ? "Investment search" : view === "Agent" && activeThread ? "Search preferences" : "Preferences"}</span></button>
      </div>
    </aside>

    <div className="fc-main-shell">
      <header className="fc-topbar">
        <span className="fc-breadcrumb">{view === "Agent" ? "Search workspace" : view}</span>
        <div className="fc-top-actions">
          <label className="fc-global-search"><Search size={18}/><input aria-label="Search company catalog" placeholder="Search companies, founders or products" value={catalogQuery} onChange={event => { setCatalogQuery(event.target.value);setCatalogGroup("all"); if (view === "Agent" || view === "Research" || view === "Proposals") navigate("Discover"); }}/></label>
          <button className="fc-text-btn" onClick={() => navigate("Your thesis")}>Your thesis</button>
        </div>
      </header>

      <main id="fc-main" tabIndex={-1} className={view === "Agent" ? "fc-agent-main" : "fc-main-content"}>
        {view === "Your thesis" ? <><div className="fc-page-heading"><h1>Your thesis</h1></div><YourThesis preferences={preferences} onEdit={editPreferences} onSearch={newSearch}/></> : view === "Research" ? <><div className="fc-page-heading"><h1>Research</h1><button className="fc-btn secondary" onClick={()=>setImportOpen(true)}><Plus size={17}/>Research a company</button></div><ResearchHub reports={reports} companies={companies} savedIds={watchlist} onOpen={openCompany} onSave={toggleSave} onDiscover={()=>navigate("Discover")}/></> : view === "Agent" ? <SearchWorkspace threads={threads} activeThread={activeThread} companies={companies} reports={reports} reportsLoading={reportsLoading} savedIds={watchlist} initialUrl={initialUrl} loading={loading} catalogError={catalogError} onSelectThread={selectSearch} onNewSearch={newSearch} onAddCompany={() => setImportOpen(true)} onRefine={refineSearch} onRefresh={refreshSearch} onSelectCompany={selectCompany} onSave={toggleSave} onMessage={receivedMessage} onResult={receivedResult} onClearInitialUrl={clearInitialUrl} onExplore={startExploration}/> : <>
          <div className="fc-page-heading">
            <div><h1>{view}</h1>{view==="Discover"?<p className="ss-discover-tagline">Discover startups. Research with AI. Build conviction.</p>:null}</div>
            <button className="fc-btn secondary" onClick={() => view==="Proposals" ? (browseCollection("event-handoff"),navigate("Discover")) : setImportOpen(true)}><Plus size={18}/>{view==="Proposals"?"New proposal":"Add company"}</button>
          </div>

            {view==="Discover"?<div className="fc-event-collections" aria-label="Browse collections"><button aria-pressed={catalogGroup==="event-handoff"} onClick={()=>browseCollection("event-handoff")}>Money Talks<span>{eventCount}</span></button><button aria-pressed={catalogGroup==="founders"} onClick={()=>browseCollection("founders")}>Founder leads<span>{catalog?.founderLeads?.length||0}</span></button><button aria-pressed={catalogGroup==="all"} onClick={()=>browseCollection("all")}>All companies<span>{companies.length}</span></button></div>:null}

          {view === "Proposals" ? <ProposalLibrary companies={companies} onOpen={company=>{setBrowseProposal(true);setBrowseCompany(company);}} onDiscover={()=>navigate("Discover")}/> : <>
            {view === "Discover" && catalogGroup !== "founders" ? <>
              <form className="fc-brief-card" onSubmit={parseBrief}>
                <label className="fc-brief-title" htmlFor="investing-brief">What are you looking for?</label>
                <textarea id="investing-brief" aria-label="Your investment brief" value={brief} maxLength={1200} onChange={event => setBrief(event.target.value)} placeholder="I have $2,000 for AI startups with revenue."/>
                <div className="fc-brief-bottom"><div className="fc-brief-controls"><button type="button" className="fc-text-btn" onClick={editPreferences}><Settings2 size={15}/>Filters</button></div><button className="fc-btn primary" type="submit" disabled={parsing}>{parsing ? <LoaderCircle size={17} className="spin"/> : null}{parsing ? "Finding…" : "Find companies"}<ArrowRight size={17}/></button></div>
                {briefError ? <p className="fc-inline-error" role="alert">{briefError}</p> : null}
              </form>
              <div className="fc-explore-starters" aria-label="Explore with the agent">
                <button onClick={() => startExploration("growth")} disabled={loading || !!catalogError}><span className="fc-starter-icon"><TrendingUp size={20}/></span><span><small>Explore growth</small><strong>Map the fastest-growing startups</strong></span><ArrowUpRight size={17}/></button>
                <button onClick={() => startExploration("fundraising")} disabled={loading || !!catalogError}><span className="fc-starter-icon"><Radar size={20}/></span><span><small>Explore fundraising</small><strong>AI infra likely to raise next</strong></span><ArrowUpRight size={17}/></button>
              </div>
            </> : null}

            <label className="fc-catalog-search"><Search size={17}/><input aria-label="Search catalog facts" placeholder={catalogGroup==="founders"?"Search founder names or interests":"Companies, founders or products"} value={catalogQuery} onChange={event=>setCatalogQuery(event.target.value)}/></label>
            <div className="fc-catalog-filters" aria-label="Filter company catalog">
              {catalogGroup!=="founders"?<label><span>Stage</span><select aria-label="Catalog funding stage" disabled={catalogGroup==="founders"} value={catalogStage} onChange={event=>setCatalogStage(event.target.value)}><option value="all">All stages</option>{DISCOVERY_STAGES.map(stage=><option key={stage}>{stage}</option>)}<option value="Unknown">Undisclosed</option></select></label>:null}
              {catalogGroup!=="founders"?<label><span>Industry</span><select aria-label="Catalog industry" disabled={catalogGroup==="founders"} value={catalogIndustry} onChange={event=>setCatalogIndustry(event.target.value)}><option value="all">All industries</option>{DISCOVERY_INDUSTRIES.map(industry=><option key={industry} value={industry}>{industry==="Climate"?"Climate & energy":industry}</option>)}<option>Other</option></select></label>:null}
              <label><span>Collection</span><select aria-label="Catalog collection" value={catalogGroup} onChange={event=>setCatalogGroup(event.target.value)}><option value="all">All companies</option><option value="venture-research">Venture catalog</option><option value="event-handoff">Money Talks companies</option><option value="event-review">Founder history & review</option><option value="founders">Founder leads</option><option value="offering">Offering snapshots</option></select></label>
              {catalogQuery||catalogStage!=="all"||catalogIndustry!=="all"||catalogGroup!=="all" ? <button className="fc-text-btn" onClick={clearCatalogFilters}>Clear filters</button>:null}
            </div>
            <div className="fc-results-heading">
              <h2>{catalogGroup==="founders"?"Founder leads":"Companies"}<span className="fc-count">{catalogGroup==="founders"?founderLeads.length:sortedEntries.length}</span></h2>
              {catalogGroup!=="founders"?<label className="fc-sort"><select aria-label="Sort companies" value={sort} onChange={event => setSort(event.target.value)}><option value="fit">Hackathon first</option><option value="name">Name</option><option value="minimum">Minimum investment</option></select></label>:null}
            </div>
            {loading && !catalog ? <div className="fc-loading-state"><LoaderCircle className="spin" size={24}/><p>Loading companies…</p></div> : catalogError ? <div className="fc-empty-state"><TriangleAlert size={28}/><h2>We couldn’t load the companies</h2><p>{catalogError}</p><button className="fc-btn secondary" onClick={() => loadCatalog()}>Try again</button></div> : catalogGroup==="founders"&&founderLeads.length ? <FounderLeads people={founderLeads}/> : visibleEntries.length ? <CompanyList entries={visibleEntries} savedIds={watchlist} onSave={toggleSave} onResearch={openCompany}/> : <div className="fc-empty-state"><Search size={28}/><h2>{view === "Watchlist" ? "No saved companies yet" : catalogGroup==="founders"?"No founders found":"No companies found"}</h2><button className="fc-btn secondary" onClick={() => view === "Watchlist" ? navigate("Discover") : clearCatalogFilters()}>{view === "Watchlist" ? "Explore companies" : "Clear filters"}<ArrowRight size={17}/></button></div>}


            {catalogGroup!=="founders"&&sortedEntries.length>catalogLimit ? <div className="fc-catalog-more"><button className="fc-btn secondary" onClick={()=>setCatalogLimit(value=>value+24)}>Show more<span>{sortedEntries.length-catalogLimit} remaining</span></button></div>:null}
            {view === "Discover" ? <p className="fc-catalog-note">{catalogGroup==="founders"?"Event-linked founders · Company details to confirm":"Profiles and dated financing · Deep research on demand"}</p> : null}
          </>}
          <footer className="fc-page-footer"><ShieldCheck size={16}/><span>Research only · No trades</span></footer>
        </>}
      </main>
    </div>

    {browseCompany ? <CompanyProfile initialResearch={view==="Research"} initialProposal={browseProposal} key={`${browseCompany.id}-${browseProposal}`} company={browseCompany} report={reports.find(report => report.companyId === browseCompany.id) || null} saved={watchlist.includes(browseCompany.id)} onSave={() => toggleSave(browseCompany.id)} onResearch={() => startCompanyResearch(browseCompany)} onClose={() => setBrowseCompany(null)}/> : null}
    {prefsOpen ? <InvestmentPreferences preferences={proposal?.preferences || reviewPreferences} proposal={proposal} validate={isDiscoveryPreferences} title={view==="Your thesis"?"Your investment thesis":"Search filters"} focusField={filterFocus} submitLabel={view==="Your thesis"?"Save thesis":reviewIntent.kind === "refine" ? "Update search" : "Start search"} onClose={() => { setPrefsOpen(false); setProposal(null); }} onSave={saveSearch}/> : null}
    {importOpen ? <WorkspaceDialog title="Add company" onClose={() => setImportOpen(false)}><form onSubmit={importCompany}><label className="fc-field"><span>Company website</span><input type="url" required placeholder="https://company.com" value={importUrl} onChange={event => setImportUrl(event.target.value)}/></label><div className="fc-dialog-actions"><button className="fc-btn secondary" type="button" onClick={() => setImportOpen(false)}>Cancel</button><button className="fc-btn primary" type="submit">Open agent<ArrowRight size={17}/></button></div></form></WorkspaceDialog> : null}

    {helpOpen ? <WorkspaceDialog title="How Seed Street works" onClose={() => setHelpOpen(false)}><ol className="fc-help-steps"><li><strong>Start a search</strong><p>Describe your budget, interests, and requirements. Review the filters to create your search.</p></li><li><strong>Research within that search</strong><p>Explore its results, open company reports, and refine the same search as you learn.</p></li><li><strong>Continue at the source</strong><p>Review current offering terms and eligibility on the original platform.</p></li></ol><p className="fc-preference-footnote">Your searches stay in this browser. Seed Street does not hold money or execute trades.</p><div className="fc-dialog-actions"><button className="fc-btn primary" onClick={() => setHelpOpen(false)}>Got it</button></div></WorkspaceDialog> : null}
    {toast ? <div className="fc-toast" role="status"><Check size={17}/>{toast}</div> : null}
  </div>;
}

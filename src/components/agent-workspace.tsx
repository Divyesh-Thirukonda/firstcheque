"use client";
import { CompanyLogo } from "./company-logo";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowRight, ArrowUpRight, Check, ChevronDown, FileSearch, FileText, Globe2, Link2, LoaderCircle, MessageSquare, ShieldCheck, Sparkles, Square, Target, TriangleAlert } from "lucide-react";
import type { DiligenceRequest, DiligenceSource, DiligenceStep, DiligenceStreamEvent, LiveDiligenceResult, LiveInvestorThesis } from "@/lib/live-research-types";
import type { DiscoveryCompany } from "@/lib/discovery-types";
import { InvestmentProposal } from "./investment-proposal";
import { CompanyOverview } from "./company-overview";
import type { CompanyEntry } from "./company-list";
import type { SearchMessage } from "@/lib/search-threads";
import { TaskTimeline } from "./task-timeline";
import { WorkspaceDialog } from "./workspace-dialog";

export interface AgentCompany { id: string; name: string; website: string; description: string; offeringStatus: string; offeringUrl: string | null; platform: string | null; dossierId?: string }
const sectionNames: Record<string, string> = { company: "The business", founders: "The team", competitors: "Competition", market: "The market", financials: "Financials", disclosures: "Funding & disclosures" };
const reportTabs = ["Report", "Financials", "Sources"] as const;
const financialLabels: Record<string, string> = { annualRevenue: "Annual revenue", arr: "Recurring revenue (ARR)", valuation: "Company valuation", runwayMonths: "Cash runway" };
export const safeWebUrl = (value: string | null | undefined) => { try { const url = new URL(value || ""); return ["https:", "http:"].includes(url.protocol) ? url.href : undefined; } catch { return undefined; } };
export const displayDate = (value: string | null | undefined) => { if (!value) return "Date not disclosed"; if (/^\d{4}$/.test(value.trim())) return value.trim(); const date = new Date(value); return Number.isNaN(date.valueOf()) ? "Date not disclosed" : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date); };
function sourceHost(url: string) { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } }
function researchNote(value: string) {
  if (/TAVILY_API_KEY|Tavily keyless|configure.{0,30}Tavily/i.test(value)) return "Web discovery uses shared search access and can be rate limited. Some relevant sources may be missing.";
  if (/Tavily discovery unavailable/i.test(value)) return /429|rate limit/i.test(value) ? "Some web searches reached a temporary rate limit. Coverage may be incomplete; try again later." : "Some web searches could not be completed. Coverage may be incomplete.";
  if (/NICRRON_API_KEY|Nicrron synthesis unavailable/i.test(value)) return "AI synthesis could not be completed. You can still inspect the retrieved sources.";
  return value.replace(/tavily keyless, rate limited/gi, "shared web search, rate limited").replace(/· tavily\b/gi, "· web search");
}
export function sourceAmount(value: number | null, currency: string | null | undefined, compact = true) {
  if (value === null) return "Not verified";
  const amount = new Intl.NumberFormat("en-US", { notation: compact ? "compact" : "standard", maximumFractionDigits: compact ? 2 : 0 }).format(value);
  if (currency && /^[A-Z]{3}$/.test(currency)) {
    try { return new Intl.NumberFormat("en-US", { style: "currency", currency, notation: compact ? "compact" : "standard", maximumFractionDigits: compact ? 2 : 0 }).format(value); } catch { /* Preserve an unrecognized currency exactly as reported. */ }
  }
  return currency ? `${currency}${amount} · currency unspecified` : `${amount} · currency not disclosed`;
}
function financialValue(field: LiveDiligenceResult["financials"]["arr"], key: string) {
  if (field.value === null) return "Unknown";
  if (key === "runwayMonths") return `${field.value} months`;
  return `${field.comparison === "greater-than" ? "> " : field.comparison === "at-least" ? "≥ " : ""}${sourceAmount(field.value, field.currency)}`;
}
function Citations({ ids, sources, onSource, passage }: { ids: string[]; sources: DiligenceSource[]; onSource: (source: DiligenceSource, passage?: string | null) => void; passage?: string | null }) {
  return <span className="fc-citations">{ids.map(id => { const index = sources.findIndex(source => source.id === id); const source = sources[index]; return source ? <button key={id} onClick={() => onSource(source, passage)} aria-label={`Read source ${index + 1}: ${source.title}`}>Source {index + 1}</button> : null; })}</span>;
}

export function AgentWorkspace({ companies, preferences, reports, selectedId, initialUrl, messages, threadId, onMessage, onSelect, onResult, onClearInitialUrl, onBack, companyDetails, fit, savedIds, onSaveCompany, researchQuestion }: {
  researchQuestion?: string;
  companyDetails?: DiscoveryCompany; fit?: Omit<CompanyEntry, "company">; savedIds: string[]; onSaveCompany: (id: string) => void;
  companies: AgentCompany[]; preferences: LiveInvestorThesis; reports: LiveDiligenceResult[];
  selectedId: string | null; initialUrl: string; messages: SearchMessage[]; threadId: string;
  onMessage: (threadId: string, message: SearchMessage) => void;
  onSelect: (id: string | null) => void; onResult: (result: LiveDiligenceResult) => void;
  onClearInitialUrl: () => void; onBack: () => void;
}) {
  const [callPurpose,setCallPurpose]=useState<import("@/lib/proposal-calls").CallPurpose|undefined>();
  const [companyTab, setCompanyTab] = useState<"Overview" | "Research" | "Proposal">(companyDetails ? "Overview" : "Research");
  const [question, setQuestion] = useState(researchQuestion || "");
  const [url, setUrl] = useState(initialUrl);
  const [reportTab, setReportTab] = useState<"Report" | "Financials" | "Sources">("Report");
  const [activeSource, setActiveSource] = useState<DiligenceSource | null>(null);
  const [sourcePassage, setSourcePassage] = useState<string | null>(null);
  const [steps, setSteps] = useState<DiligenceStep[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [agentOpen, setAgentOpen] = useState(false);
  const [lastQuestion, setLastQuestion] = useState("");
  const controller = useRef<AbortController | null>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const conversationEnd = useRef<HTMLDivElement>(null);
  const company = companies.find(item => item.id === selectedId) || null;
  const report = reports.find(item => item.companyId === selectedId || item.dossierId === company?.dossierId) || null;
  useEffect(() => { if (initialUrl) { setUrl(initialUrl); setAgentOpen(true); composer.current?.focus(); } }, [initialUrl, onClearInitialUrl]);
  useEffect(() => { conversationEnd.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [messages, steps]);
  useEffect(() => () => { controller.current?.abort(); }, []);
  useEffect(() => {
    if (agentOpen && window.matchMedia("(max-width: 820px)").matches) {
      document.getElementById("research-agent-pane")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [agentOpen]);


  function openSource(source: DiligenceSource, passage?: string | null) { setActiveSource(source); setSourcePassage(passage || null); }
  function receive(event: DiligenceStreamEvent) {
    if (event.type === "progress") setSteps(current => current.some(step => step.id === event.step.id) ? current.map(step => step.id === event.step.id ? event.step : step) : [...current, event.step]);
    else if (event.type === "result") {
      onResult(event.result); onSelect(event.result.companyId); setReportTab("Report"); setCompanyTab("Research");
      const status = event.result.mode === "live-web" ? "Your cited research report is ready." : event.result.mode === "sources-only" ? "Sources were collected, but a complete AI memo was unavailable. The retained evidence and limitations are shown." : "Research could not be completed. The report explains what was unavailable.";
      onMessage(threadId, { id: `${event.result.id}-answer`, role: "assistant", text: `${event.result.company.name}: ${status}`, companyId: event.result.companyId, reportId: event.result.id, kind: "research", error: event.result.status === "unavailable" });
    } else throw new Error(event.error);
  }
  async function research(customQuestion?: string) {
    if (running) return;
    const targetUrl = url.trim() || company?.website || report?.company.website || "";
    const targetName = !url.trim() ? company?.name || report?.company.name : undefined;
    if (!targetUrl && !targetName) { setError("Paste a company website, or select a company from your workspace."); composer.current?.focus(); return; }
    if (targetUrl && !safeWebUrl(targetUrl)) { setError("Use a complete company URL beginning with https:// or http://."); return; }
    const prompt = customQuestion || question.trim() || researchQuestion || "Research this company against my investment brief. Cover founders, competitors, market, financials, and material risks. Cite the evidence and identify what is not disclosed.";
    const body: DiligenceRequest = { companyName: targetName, companyUrl: targetUrl || undefined, question: prompt, thesis: preferences, dossierId: !url.trim() ? report?.dossierId : undefined, ...(!url.trim() && company?.offeringUrl ? { offeringUrl: company.offeringUrl } : {}) };
    onMessage(threadId, { id: crypto.randomUUID(), role: "user", text: `${targetName || targetUrl}\n\n${customQuestion || question.trim() || researchQuestion || "Research the business, team, and financials."}`, kind: "research", ...(!url.trim() && selectedId ? { companyId: selectedId } : {}) });
    setLastQuestion(prompt); setQuestion(""); setError(""); setSteps([]); setRunning(true); controller.current = new AbortController();
    let resultReceived = false;
    const handleEvent = (event: DiligenceStreamEvent) => { if (event.type === "result") resultReceived = true; receive(event); };
    try {
      const response = await fetch("/api/diligence", { method: "POST", headers: { "Content-Type": "application/json", Accept: "text/event-stream" }, body: JSON.stringify(body), signal: controller.current.signal });
      if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || `Research is unavailable (${response.status}). Try again in a moment.`); }
      if (response.headers.get("content-type")?.includes("text/event-stream") && response.body) {
        const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
        while (true) { const { done, value } = await reader.read(); buffer += decoder.decode(value, { stream: !done }); const frames = buffer.split(/\r?\n\r?\n/); buffer = frames.pop() || ""; for (const frame of frames) { const data = frame.split(/\r?\n/).filter(line => line.startsWith("data:")).map(line => line.slice(5).trimStart()).join("\n"); if (data) handleEvent(JSON.parse(data) as DiligenceStreamEvent); } if (done) { if (buffer.trim().startsWith("data:")) handleEvent(JSON.parse(buffer.trim().slice(5)) as DiligenceStreamEvent); break; } }
      } else handleEvent({ type: "result", result: await response.json() as LiveDiligenceResult });
      if (!resultReceived) throw new Error("The research connection ended before a report was returned. Try this request again.");
      setUrl(""); onClearInitialUrl();
    } catch (failure) {
      if (failure instanceof Error && failure.name === "AbortError") onMessage(threadId, { id: crypto.randomUUID(), role: "assistant", kind: "research", text: "Stopped waiting for this request. Any completed server research will appear when the workspace refreshes." });
      else { const message = failure instanceof Error ? failure.message : "Research could not be completed."; setError(message); onMessage(threadId, { id: crypto.randomUUID(), role: "assistant", kind: "research", text: message, error: true }); }
    } finally { setRunning(false); controller.current = null; }
  }
  const activitySteps = steps.length ? steps : report?.steps || [];
  const researchMessages = messages.filter(message => message.kind === "research" && (!message.companyId || message.companyId === selectedId));
  const latestRequestIndex = researchMessages.findLastIndex(message => message.role === "user");
  return (
    <div className={`fc-company-detail ${agentOpen ? "" : "fc-company-chat-hidden"}`}>
      <section className="fc-agent-editor" aria-label="Company research report">
        <div className="fc-editor-tabbar">
          <button className="fc-back-results" onClick={onBack}><ArrowRight size={15}/><span>Results</span></button>
          <span className="fc-file-tab"><FileText size={14}/>{report?.company.name || company?.name || (url ? sourceHost(url) : "New research")}</span>
          <span className="fc-tab-spacer"/>
          <span className="fc-editor-label">{report?.persisted ? <><Check size={13}/>Saved</> : report ? "Unsaved report" : "Research workspace"}</span>
          <button className={`fc-agent-pane-toggle ${agentOpen ? "active" : ""}`} onClick={() => setAgentOpen(!agentOpen)} aria-expanded={agentOpen} aria-controls="research-agent-pane"><MessageSquare size={15}/><span>{agentOpen ? "Hide agent" : "Ask agent"}</span></button>
        </div>
        {companyDetails ? <nav className="fc-company-subnav" aria-label="Company views"><button aria-pressed={companyTab === "Overview"} className={companyTab === "Overview" ? "active" : ""} onClick={() => setCompanyTab("Overview")}>Overview</button><button aria-pressed={companyTab === "Proposal"} className={companyTab === "Proposal" ? "active" : ""} onClick={() => setCompanyTab("Proposal")}>Proposal</button><button aria-pressed={companyTab === "Research"} className={companyTab === "Research" ? "active" : ""} onClick={() => setCompanyTab("Research")}>Research{report ? <span>{report.sources.filter(source => source.status === "fetched").length} sources</span> : null}</button></nav> : null}
        <div className="fc-report-scroll">
          {companyDetails && companyTab === "Proposal"?<InvestmentProposal initialPurpose={callPurpose} key={companyDetails.id} company={companyDetails} onBack={()=>setCompanyTab("Overview")}/> : companyDetails && companyTab === "Overview" ? <CompanyOverview onProposal={purpose=>{setCallPurpose(purpose);setCompanyTab("Proposal");}} company={companyDetails} report={report} fit={fit} saved={savedIds.includes(companyDetails.id)} onSave={() => onSaveCompany(companyDetails.id)} onResearch={() => { setCompanyTab("Research"); if (!report) { setAgentOpen(true); void research(); } }}/> : report ? (
            <ResearchReport
              report={report}
              tab={reportTab}
              onTab={setReportTab}
              onSource={openSource}
              offeringUrl={company?.offeringUrl}
              platform={company?.platform}
              running={running}
              onRetry={() => research("Try to complete the missing source coverage for this company. Retain citations and keep unverified financial facts unknown.")}
            />
          ) : (
            <div className="fc-agent-empty">
              <span className="fc-agent-symbol"><FileSearch size={31}/></span>
              <h1>{company || url ? company?.name || sourceHost(url) : "Research a company"}</h1>
              {company ? <p>{company.description}</p> : null}
              {company || url ? (
                <>
                  <div className="fc-empty-company-note"><Globe2 size={16}/><span>{company?.website ? sourceHost(company.website) : sourceHost(url)}</span></div>
                  <button className="fc-btn primary" disabled={running} onClick={() => { setAgentOpen(true); void research(); }}><Sparkles size={16}/>{running ? "Researching…" : `Research ${company?.name || sourceHost(url)}`}<ArrowRight size={16}/></button>
                </>
              ) : (
                <>
                  {!agentOpen ? <button className="fc-btn primary" onClick={() => { setAgentOpen(true); composer.current?.focus(); }}>Add a company<ArrowRight size={16}/></button> : null}
                </>
              )}
            </div>
          )}
        </div>
      </section>

      <aside id="research-agent-pane" className="fc-agent-chat" aria-label="Research agent conversation" hidden={!agentOpen}>
        <div className="fc-pane-heading"><span><Sparkles size={16}/>Research agent</span><span className="fc-chat-engine">Public web</span></div>
        <div className="fc-chat-scroll">
          {!researchMessages.length ? report ? <div className="fc-agent-presence"><Sparkles size={16}/><span>Saved research</span></div> : <div className="fc-agent-greeting"><strong>What would you like to research?</strong></div> : null}
          {researchMessages.map((message, index) => <div key={message.id}>
            <div className={`fc-chat-message ${message.role} ${message.error ? "error" : ""}`}>{message.role === "assistant" ? <Sparkles size={14}/> : null}<p>{message.text}</p></div>
            {index === latestRequestIndex && activitySteps.length ? <TaskTimeline steps={activitySteps} running={running} failed={!!error} formatDetail={researchNote}/> : null}
          </div>)}
          {latestRequestIndex < 0 && activitySteps.length ? <TaskTimeline steps={activitySteps} running={running} failed={!!error} formatDetail={researchNote}/> : null}
          {running && !activitySteps.length ? <div className="fc-agent-connecting" role="status"><LoaderCircle size={15} className="spin"/>Starting research</div> : null}
          {!running && (report || company) ? <div className="fc-agent-followups" aria-label="Research suggestions">{["Check revenue and growth", "Compare competitors", "Investigate the next funding round"].map(prompt => <button key={prompt} onClick={() => { setQuestion(prompt); composer.current?.focus(); }}><ArrowRight size={14}/>{prompt}</button>)}</div> : null}
          <div ref={conversationEnd}/>
        </div>
        <div className="fc-agent-composer">
          <p className="fc-research-target" aria-label="Research target"><Target size={14}/><span><strong>{url ? sourceHost(url) : company?.name || "a company website"}</strong></span></p><label className="fc-agent-prompt-label" htmlFor="research-company-url">Website</label>
          <div className="fc-url-input"><Link2 size={15}/><input id="research-company-url" value={url} onChange={event => setUrl(event.target.value)} placeholder={company?.website || "https://company.com"} disabled={running}/></div>
          <label className="fc-agent-prompt-label" htmlFor="research-question">Question</label>
          <textarea id="research-question" ref={composer} placeholder={company ? `What should we know about ${company.name}?` : "For example: How does this company make money?"} value={question} onChange={event => setQuestion(event.target.value)} disabled={running} onKeyDown={event => { if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); void research(); } }}/>
          <div className="fc-composer-footer">
            {running ? <button className="fc-agent-run-button secondary" onClick={() => controller.current?.abort()}><Square size={13}/>Stop waiting</button> : <button className="fc-agent-run-button" title="Research (⌘/Ctrl + Enter)" aria-keyshortcuts="Meta+Enter Control+Enter" onClick={() => research()}>Research<ArrowRight size={16}/></button>}
          </div>
          {error ? <div role="alert" className="fc-inline-error"><TriangleAlert size={14}/><span>{error}</span><button className="fc-text-btn" onClick={() => research(lastQuestion)}>Retry</button></div> : null}
        </div>
        {company?.offeringStatus === "open" && safeWebUrl(company.offeringUrl) ? <a className="fc-offering-handoff" href={safeWebUrl(company.offeringUrl)} target="_blank" rel="noreferrer"><span><strong>View offering on {company.platform || "source platform"}</strong></span><ArrowUpRight size={17}/></a> : null}
      </aside>

      {activeSource ? <WorkspaceDialog title={activeSource.title} subtitle={`${sourceHost(activeSource.url)} · ${activeSource.officialCompanySource ? "Company source" : "Third-party source"}`} onClose={() => setActiveSource(null)} wide><div className="fc-source-metadata"><span>{activeSource.publishedAt ? `Published ${displayDate(activeSource.publishedAt)}` : "Publication date unavailable"}</span><span>Read {displayDate(activeSource.retrievedAt)}</span></div>{sourcePassage ? <section className="fc-source-focus"><h3>Passage behind this claim</h3><blockquote>{sourcePassage}</blockquote></section> : null}<details className="fc-source-extract" open={!sourcePassage || undefined}><summary>Extracted page text<ChevronDown size={17}/></summary><div className="fc-retained-source">{sourceParagraphs(activeSource.text || activeSource.error || "Source content is unavailable.").map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div></details><div className="fc-dialog-actions"><button className="fc-btn secondary" onClick={() => setActiveSource(null)}>Back to report</button>{safeWebUrl(activeSource.url) ? <a className="fc-btn primary" href={safeWebUrl(activeSource.url)} target="_blank" rel="noreferrer">Open original source<ArrowUpRight size={15}/></a> : null}</div></WorkspaceDialog> : null}
    </div>
  );
}

function readableEvidence(value: string) {
  return value
    .replace(/\bannualRevenue\b/g, "Annual revenue")
    .replace(/\brunwayMonths\b/g, "Cash runway")
    .replace(/\barr\b/g, "Recurring revenue (ARR)")
    .replace(/no qualifying attributable disclosure was verified in retained pages/gi, "no attributable disclosure was found in the pages we could read")
    .replace(/no readable source page was retained/gi, "no source page could be read")
    .replace(/no verbatim supported claim was retained; this topic remains open/gi, "the available pages did not support a cited claim; more research is needed");
}

function gapCategory(value: string) {
  if (/^(?:annualRevenue|arr|valuation|runwayMonths|financial)/i.test(value)) return "Financials";
  const category = value.match(/^(company|founders|competitors|market|disclosures):/i)?.[1]?.toLowerCase();
  return category ? sectionNames[category] : "Other open questions";
}

function sourceParagraphs(text: string) {
  const pieces = text.split(/\n\s*\n|(?<=[.!?])\s+(?=[A-Z])/);
  const paragraphs: string[] = [];
  for (const piece of pieces) {
    if (!piece.trim()) continue;
    if (paragraphs.length && paragraphs[paragraphs.length - 1].length + piece.length < 550) paragraphs[paragraphs.length - 1] += ` ${piece}`;
    else paragraphs.push(piece);
  }
  return paragraphs;
}

function ReportGaps({ gaps }: { gaps: string[] }) {
  const groups = new Map<string, Set<string>>();
  const financialNames: Record<string, string> = { annualRevenue: "Annual revenue", arr: "Recurring revenue (ARR)", valuation: "Company valuation", runwayMonths: "Cash runway" };
  const individualFinancials = gaps.some(gap => /^(annualRevenue|arr|valuation|runwayMonths):/.test(gap));
  for (const gap of gaps) {
    const category = gapCategory(gap);
    const field = gap.match(/^(annualRevenue|arr|valuation|runwayMonths):/)?.[1];
    if (individualFinancials && /^financials:/i.test(gap)) continue;
    const concise = field ? financialNames[field] : /^(company|founders|competitors|market|disclosures):/i.test(gap) ? "More supported evidence is needed to complete this topic." : readableEvidence(gap);
    if (!groups.has(category)) groups.set(category, new Set());
    groups.get(category)!.add(concise);
  }
  return <details className="fc-report-disclosure fc-report-gaps">
    <summary><span><strong>Still to verify</strong><small>{groups.size} research topics need more evidence</small></span><ChevronDown size={18}/></summary>
    <div className="fc-disclosure-content">{Array.from(groups, ([category, items]) => <div className="fc-gap-group" key={category}><h3>{category}</h3>{category === "Financials" && individualFinancials ? <p>Not yet verified: {Array.from(items).join(", ")}.</p> : <ul className="fc-plain-list">{Array.from(items, item => <li key={item}>{item}</li>)}</ul>}</div>)}</div>
  </details>;
}

function ClaimEvidence({ claim, sources, onSource }: { claim: LiveDiligenceResult["sections"][number]["claims"][number]; sources: DiligenceSource[]; onSource: (source: DiligenceSource, passage?: string | null) => void }) {
  return (
    <div className="fc-report-claim">
      <p>{claim.text} <Citations ids={claim.sourceIds} sources={sources} onSource={onSource} passage={claim.quote}/></p>
      {claim.quote && claim.quote !== claim.text ? <details className="fc-claim-evidence"><summary>Read supporting passage<ChevronDown size={13}/></summary><blockquote>{claim.quote}</blockquote></details> : !claim.quote ? <span className="fc-open-question">Supporting passage unavailable</span> : null}
    </div>
  );
}

export function ResearchReport({ report, tab, onTab, onSource, offeringUrl, platform, running, onRetry }: { report: LiveDiligenceResult; tab: typeof reportTabs[number]; onTab: (tab: typeof reportTabs[number]) => void; onSource: (source: DiligenceSource, passage?: string | null) => void; offeringUrl?: string | null; platform?: string | null; running: boolean; onRetry: () => void }) {
  const readableSources = report.sources.filter(source => source.status === "fetched").length;
  const attemptedSources = report.sources.length;
  const companySource = report.sources.find(source => source.status === "fetched" && source.officialCompanySource && safeWebUrl(source.url) && new URL(source.url).pathname === "/") || report.sources.find(source => source.status === "fetched" && source.officialCompanySource);
  const businessVerified = report.sections.some(section => section.category === "company" && section.claims.length);
  const coverageLimited = report.status !== "complete" || report.mode !== "live-web";
  const limitations = [...new Set([...report.warnings, ...report.discovery.limitations].map(researchNote))];

  const coverageLabel = report.status === "unavailable" ? "Unavailable" : report.mode === "sources-only" ? "Sources only" : coverageLimited ? "Partial" : "Report ready";
  function changeTab(event: KeyboardEvent<HTMLButtonElement>, current: typeof reportTabs[number]) {
    const index = reportTabs.indexOf(current);
    const next = event.key === "ArrowRight" ? reportTabs[(index + 1) % reportTabs.length] : event.key === "ArrowLeft" ? reportTabs[(index + reportTabs.length - 1) % reportTabs.length] : event.key === "Home" ? reportTabs[0] : event.key === "End" ? reportTabs[reportTabs.length - 1] : null;
    if (next) { event.preventDefault(); onTab(next); document.getElementById(`research-tab-${next}`)?.focus(); }
  }
  return (
    <article className="fc-reading-report">
      <header className="fc-report-head">
        <div className="fc-report-kicker"><span className={`fc-status ${report.mode === "live-web" ? "verified" : "warning"}`}>{report.mode === "live-web" ? "Company research" : report.mode === "sources-only" ? "Source collection" : "Research unavailable"}</span></div>
        <div className="fc-report-identity"><CompanyLogo id={report.companyId} name={report.company.name} logo={report.logo} large/><h1>{report.company.name}</h1></div>
        {!(report.title.toLowerCase().startsWith(report.company.name.toLowerCase()) && /research|summary/i.test(report.title)) ? <p>{report.title}</p> : null}
        <dl className="fc-report-at-glance" aria-label="At a glance">
          <div className="fc-glance-item"><dt>Sources read</dt><dd>{readableSources}<small>of {attemptedSources} attempted</small></dd></div>
          <div className="fc-glance-item"><dt>Last researched</dt><dd>{displayDate(report.generatedAt)}</dd></div>
          <div className={`fc-glance-item ${coverageLimited ? "fc-warning-text" : ""}`}><dt>Coverage</dt><dd>{coverageLabel}{report.conflicts.length ? <small>{report.conflicts.length} conflict{report.conflicts.length === 1 ? "" : "s"} to review</small> : null}</dd></div>
        </dl>
        {coverageLimited ? <div className="fc-report-coverage" role="status"><TriangleAlert size={17}/><div><strong>{report.status === "unavailable" ? "Research unavailable" : report.mode === "sources-only" ? "AI summary unavailable" : "Partial coverage"}</strong></div><button className="fc-btn secondary" disabled={running} onClick={onRetry}>Research again<ArrowRight size={14}/></button></div> : null}
        {safeWebUrl(offeringUrl) ? <a className="fc-report-offering fc-text-btn" href={safeWebUrl(offeringUrl)} target="_blank" rel="noreferrer">View offering on {platform || "source platform"}<ArrowUpRight size={16}/></a> : null}
        <nav className="fc-report-subnav" role="tablist" aria-label="Research views">{reportTabs.map(item => <button role="tab" id={`research-tab-${item}`} aria-controls="research-tabpanel" aria-selected={tab === item} tabIndex={tab === item ? 0 : -1} key={item} className={tab === item ? "active" : ""} onClick={() => onTab(item)} onKeyDown={event => changeTab(event, item)}>{item}{item === "Sources" ? <span>{readableSources}</span> : null}</button>)}</nav>
      </header>
      <div className="fc-report-body" id="research-tabpanel" role="tabpanel" aria-labelledby={`research-tab-${tab}`}>
        {tab === "Report" ? (
          <>
            {!businessVerified && companySource ? <section className="fc-research-section fc-company-intro"><h2>The business</h2><p className="fc-financial-note">From the company website</p><p>{companySource.title} <Citations ids={[companySource.id]} sources={report.sources} onSource={onSource}/></p></section> : null}
            {!/public source evidence is retained below/i.test(report.summary) ? <section className="fc-research-section fc-report-overview"><h2>Overview</h2><div className="fc-report-summary">{report.summary.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div></section> : null}

            {report.sections.filter(section => section.claims.length > 0).map(section => <section className="fc-research-section" key={section.category}><div className="fc-report-section-heading"><h2>{sectionNames[section.category] || section.title}</h2></div>{section.category==="competitors"&&section.claims.some(claim=>claim.sourceIds.some(id=>report.sources.find(source=>source.id===id)?.scope==="competitive-context"))?<p className="fc-evidence-caution">Adjacent products to compare · Product overlap is an analyst research hypothesis.</p>:null}{section.category==="market"&&section.claims.some(claim=>claim.sourceIds.some(id=>report.sources.find(source=>source.id===id)?.scope==="market-context"))?<p className="fc-evidence-caution">Industry context · These are market facts, not company traction or a verified TAM.</p>:null}{section.title === "Source-listed alternatives" ? <><span className="fc-quiet-badge">Unverified comparison</span><details className="fc-claim-evidence"><summary>Source-listed alternatives<ChevronDown size={15}/></summary>{section.claims.map((claim, index) => <ClaimEvidence key={index} claim={claim} sources={report.sources} onSource={onSource}/>)}</details></> : <div className="fc-claims-list">{section.claims.map((claim, index) => <ClaimEvidence key={`${section.category}-${index}`} claim={claim} sources={report.sources} onSource={onSource}/>)}</div>}</section>)}
            {report.conflicts.length ? <section className="fc-research-section fc-conflicts-section"><h2>Conflicting evidence</h2>{report.conflicts.map((conflict, index) => <div className="fc-note warning" key={index}><TriangleAlert size={17}/><div><strong>{readableEvidence(conflict.field)}</strong><p>{conflict.description}</p><Citations ids={conflict.sourceIds} sources={report.sources} onSource={onSource}/>{conflict.evidence?.length ? <details className="fc-claim-evidence"><summary>Compare the passages<ChevronDown size={13}/></summary>{conflict.evidence.map((evidence, evidenceIndex) => <div key={evidenceIndex}><blockquote>{evidence.quote}</blockquote><Citations ids={[evidence.sourceId]} sources={report.sources} onSource={onSource}/></div>)}</details> : null}</div></div>)}</section> : null}
            {report.missingEvidence.length ? <ReportGaps gaps={report.missingEvidence}/> : null}
            {report.diligenceQuestions.length ? <section className="fc-research-section fc-founder-questions"><h2>Ask the founder</h2><ol className="fc-questions">{report.diligenceQuestions.map(item => <li key={item}>{item}</li>)}</ol></section> : null}
          </>
        ) : tab === "Financials" ? (
          <>
            <div className="fc-section-intro"><h2>Financials</h2></div>
            <div className="fc-financial-grid">{Object.entries(report.financials).map(([key, field]) => <section className="fc-financial-tile" key={key}><h3>{financialLabels[key]}</h3><strong>{financialValue(field, key)}</strong>{field.status !== "not-found" ? <span className={`fc-status ${field.status === "conflicting" ? "warning" : "neutral"}`}>{field.status === "source-reported" ? "Reported in a source" : "Sources disagree"}</span> : null}{field.value !== null ? <p className="fc-financial-note">{field.period || "Reporting period not stated"}{field.asOf ? ` · As of ${displayDate(field.asOf)}` : ""}</p> : null}<Citations ids={field.sourceIds} sources={report.sources} onSource={onSource} passage={field.quote}/>{field.quote ? <details className="fc-claim-evidence"><summary>Read the financial disclosure<ChevronDown size={13}/></summary><blockquote>{field.quote}</blockquote></details> : null}</section>)}</div>
            <details className="fc-filter-data-rules"><summary>Revenue definitions<ChevronDown size={14}/></summary><p>ARR is annual recurring revenue, distinct from total annual revenue. Source reporting is not an audit.</p></details>
          </>
        ) : (
          <>
            <div className="fc-section-intro"><h2>Sources</h2><p>{readableSources} readable{attemptedSources > readableSources ? ` · ${attemptedSources - readableSources} unavailable` : ""}</p></div>
            {report.sources.map((source, index) => <button className="fc-source-card" key={source.id} onClick={() => onSource(source)}><div><span className="fc-source-number">{index + 1}</span><span className="fc-source-domain">{sourceHost(source.url)}</span><span className={`fc-status ${source.status === "fetched" ? "neutral" : "warning"}`}>{source.status === "fetched" ? source.scope==="competitive-context"?"Competitive context":source.scope==="market-context"?"Market context":source.officialCompanySource ? "Company source" : "Third-party source" : "Unavailable"}</span><ArrowUpRight size={16}/></div><h3>{source.title}</h3><p className="fc-source-preview">{source.status === "fetched" ? source.text.slice(0, 180) : source.error || "This page could not be retrieved."}{source.status === "fetched" && source.text.length > 180 ? "…" : ""}</p><footer className="fc-source-dates"><span>{source.publishedAt ? `Published ${displayDate(source.publishedAt)}` : "Publication date unavailable"}</span><span>Read {displayDate(source.retrievedAt)}</span></footer></button>)}
          </>
        )}
        <details className="fc-report-disclosure fc-research-method"><summary><span><strong>Research notes</strong></span><ChevronDown size={18}/></summary><div className="fc-disclosure-content">{limitations.length ? <ul className="fc-plain-list">{limitations.map(item => <li key={item}>{item}</li>)}</ul> : <p>No additional retrieval limitations were reported.</p>}<dl className="fc-research-provenance"><div><dt>Research mode</dt><dd>{report.mode === "live-web" ? "Web research with AI synthesis" : report.mode === "sources-only" ? "Sources without complete AI synthesis" : "Unavailable"}</dd></div><div><dt>Sources attempted</dt><dd>{attemptedSources}; {readableSources} readable</dd></div><div><dt>Report storage</dt><dd>{report.persisted ? "Saved to the shared workspace" : "Not saved to the server"}</dd></div><div><dt>AI synthesis</dt><dd>{report.model.provider === "none" ? "Unavailable" : `${report.model.provider} · ${report.model.id}`}</dd></div><div><dt>Trace</dt><dd>{report.trace.recorded ? "Recorded" : "Not recorded"}</dd></div></dl>{report.discovery.queries.length ? <details className="fc-claim-evidence"><summary>View search queries<ChevronDown size={13}/></summary><ul className="fc-plain-list">{report.discovery.queries.map((query, index) => <li key={index}>{query.query}</li>)}</ul></details> : null}</div></details>
      </div>
      <footer className="fc-report-footer"><ShieldCheck size={15}/><span>Research only · No trades</span></footer>
    </article>
  );
}

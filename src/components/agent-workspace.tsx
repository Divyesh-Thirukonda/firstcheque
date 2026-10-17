"use client";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowRight, ArrowUpRight, Check, CheckCircle2, ChevronDown, Circle, FileSearch, FileText, FolderOpen, Globe2, Link2, LoaderCircle, MessageSquare, PanelLeftClose, Plus, Search, ShieldCheck, Sparkles, Square, Target, TriangleAlert } from "lucide-react";
import type { DiligenceRequest, DiligenceSource, DiligenceStep, DiligenceStreamEvent, LiveDiligenceResult, LiveInvestorThesis } from "@/lib/live-research-types";
import { WorkspaceDialog } from "./workspace-dialog";

export interface AgentCompany { id: string; name: string; website: string; description: string; offeringStatus: string; offeringUrl: string | null; platform: string | null; dossierId?: string }
interface AgentMessage { id: string; role: "user" | "assistant"; text: string; error?: boolean }
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
  return sourceAmount(field.value, field.currency);
}
function Citations({ ids, sources, onSource, passage }: { ids: string[]; sources: DiligenceSource[]; onSource: (source: DiligenceSource, passage?: string | null) => void; passage?: string | null }) {
  return <span className="fc-citations">{ids.map(id => { const index = sources.findIndex(source => source.id === id); const source = sources[index]; return source ? <button key={id} onClick={() => onSource(source, passage)} aria-label={`Read source ${index + 1}: ${source.title}`}>Source {index + 1}</button> : null; })}</span>;
}

export function AgentWorkspace({ companies, preferences, reports, selectedId, initialUrl, onSelect, onResult, onClearInitialUrl, onDiscover }: { companies: AgentCompany[]; preferences: LiveInvestorThesis; reports: LiveDiligenceResult[]; selectedId: string | null; initialUrl: string; onSelect: (id: string | null) => void; onResult: (result: LiveDiligenceResult) => void; onClearInitialUrl: () => void; onDiscover: () => void }) {
  const [companySearch, setCompanySearch] = useState("");
  const [question, setQuestion] = useState("");
  const [url, setUrl] = useState(initialUrl);
  const [reportTab, setReportTab] = useState<"Report" | "Financials" | "Sources">("Report");
  const [activeSource, setActiveSource] = useState<DiligenceSource | null>(null);
  const [sourcePassage, setSourcePassage] = useState<string | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [steps, setSteps] = useState<DiligenceStep[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [runCompanyId, setRunCompanyId] = useState<string | null>(null);
  const [railOpen, setRailOpen] = useState(true);
  const [agentOpen, setAgentOpen] = useState(false);
  const [mobileRailOpen, setMobileRailOpen] = useState(false);
  const [narrowViewport, setNarrowViewport] = useState(false);
  const [lastQuestion, setLastQuestion] = useState("");
  const controller = useRef<AbortController | null>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const conversationEnd = useRef<HTMLDivElement>(null);
  const company = companies.find(item => item.id === selectedId) || null;
  const report = reports.find(item => item.companyId === selectedId || item.dossierId === company?.dossierId) || null;
  const railVisible = narrowViewport ? mobileRailOpen : railOpen;
  const list = companies.filter(item => `${item.name} ${item.website}`.toLowerCase().includes(companySearch.toLowerCase()));
  useEffect(() => { if (initialUrl) { setUrl(initialUrl); setAgentOpen(true); onClearInitialUrl(); composer.current?.focus(); } }, [initialUrl, onClearInitialUrl]);
  useEffect(() => { conversationEnd.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [messages, steps]);
  useEffect(() => () => { controller.current?.abort(); }, []);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 1120px)");
    const update = () => setNarrowViewport(media.matches);
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  function openSource(source: DiligenceSource, passage?: string | null) { setActiveSource(source); setSourcePassage(passage || null); }
  function receive(event: DiligenceStreamEvent) {
    if (event.type === "progress") setSteps(current => current.some(step => step.id === event.step.id) ? current.map(step => step.id === event.step.id ? event.step : step) : [...current, event.step]);
    else if (event.type === "result") {
      onResult(event.result); onSelect(event.result.companyId); setReportTab("Report");
      const status = event.result.mode === "live-web" ? "Your cited research report is ready." : event.result.mode === "sources-only" ? "Sources were collected, but a complete AI memo was unavailable. The retained evidence and limitations are shown." : "Research could not be completed. The report explains what was unavailable.";
      setMessages(current => [...current, { id: `${event.result.id}-answer`, role: "assistant", text: status, error: event.result.status === "unavailable" }]);
    } else throw new Error(event.error);
  }
  async function research(customQuestion?: string) {
    if (running) return;
    const targetUrl = url.trim() || company?.website || "";
    const targetName = !url.trim() ? company?.name : undefined;
    if (!targetUrl && !targetName) { setError("Paste a company website, or select a company from your workspace."); composer.current?.focus(); return; }
    if (targetUrl && !safeWebUrl(targetUrl)) { setError("Use a complete company URL beginning with https:// or http://."); return; }
    const prompt = customQuestion || question.trim() || "Research this company against my investment brief. Cover founders, competitors, market, financials, and material risks. Cite the evidence and identify what is not disclosed.";
    const body: DiligenceRequest = { companyName: targetName, companyUrl: targetUrl || undefined, question: prompt, thesis: preferences, dossierId: !url.trim() ? report?.dossierId : undefined, ...(!url.trim() && company?.offeringUrl ? { offeringUrl: company.offeringUrl } : {}) };
    setMessages(current => [...current, { id: crypto.randomUUID(), role: "user", text: `${targetName || targetUrl}\n\n${customQuestion || question.trim() || "Research the business, team, and financials."}` }]);
    setLastQuestion(prompt); setQuestion(""); setError(""); setSteps([]); setRunning(true); setRunCompanyId(selectedId); controller.current = new AbortController();
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
      setUrl("");
    } catch (failure) {
      if (failure instanceof Error && failure.name === "AbortError") setMessages(current => [...current, { id: crypto.randomUUID(), role: "assistant", text: "Stopped waiting for this request. Any completed server research will appear when the workspace refreshes." }]);
      else { const message = failure instanceof Error ? failure.message : "Research could not be completed."; setError(message); setMessages(current => [...current, { id: crypto.randomUUID(), role: "assistant", text: message, error: true }]); }
    } finally { setRunning(false); setRunCompanyId(null); controller.current = null; }
  }
  function newResearch() { if (running) return; setAgentOpen(true); onSelect(null); setUrl(""); setQuestion(""); setError(""); setReportTab("Report"); composer.current?.focus(); }
  const completed = steps.filter(step => step.status === "complete").length;
  return (
    <div className={`fc-agent-workspace ${railOpen ? "" : "fc-agent-rail-hidden"} ${mobileRailOpen ? "fc-mobile-rail-open" : ""} ${agentOpen ? "" : "fc-agent-chat-hidden"}`}>
      <aside id="research-company-rail" className="fc-agent-files">
        <div className="fc-pane-heading">
          <span><FolderOpen size={15}/> Companies</span>
          <button className="fc-icon-btn" onClick={newResearch} disabled={running} aria-label="Research a new company"><Plus size={16}/></button>
        </div>
        <div className="fc-rail-search">
          <Search size={14}/>
          <input aria-label="Find a company in workspace" placeholder="Find a company…" value={companySearch} onChange={event => setCompanySearch(event.target.value)}/>
        </div>
        <p className="fc-section-label">YOUR WORKSPACE</p>
        <div className="fc-agent-file-list">
          {list.map(item => {
            const saved = reports.some(result => result.companyId === item.id || result.dossierId === item.dossierId);
            return (
              <button key={item.id} disabled={running} className={`fc-file-row ${selectedId === item.id ? "active" : ""}`} onClick={() => { onSelect(item.id); setMobileRailOpen(false); setUrl(""); setError(""); }}>
                <span className="fc-company-avatar small">{item.name.slice(0, 1)}</span>
                <span><strong>{item.name}</strong><small>{saved ? "Report saved" : item.offeringStatus === "open" ? "Offering listed" : "Ready to research"}</small></span>
                {running && runCompanyId === item.id ? <LoaderCircle className="spin" size={14}/> : saved ? <FileText size={14}/> : null}
              </button>
            );
          })}
          {!list.length ? <p className="fc-rail-empty">No companies found. Add a website to begin.</p> : null}
        </div>
        <div className="fc-rail-bottom"><ShieldCheck size={15}/><span>Every claim has a source.<br/>Every gap stays visible.</span></div>
      </aside>

      <section className="fc-agent-editor" aria-label="Company research report">
        <div className="fc-editor-tabbar">
          <button className="fc-icon-btn" onClick={() => narrowViewport ? setMobileRailOpen(!mobileRailOpen) : setRailOpen(!railOpen)} aria-label={railVisible ? "Hide companies" : "Show companies"} aria-expanded={railVisible} aria-controls="research-company-rail"><PanelLeftClose size={16}/></button>
          <span className="fc-file-tab"><FileText size={14}/>{report?.company.name || company?.name || "New research"}</span>
          <span className="fc-tab-spacer"/>
          <span className="fc-editor-label">{report?.persisted ? <><Check size={13}/>Saved</> : report ? "Unsaved report" : "Research workspace"}</span>
          <button className={`fc-agent-pane-toggle ${agentOpen ? "active" : ""}`} onClick={() => setAgentOpen(!agentOpen)} aria-expanded={agentOpen} aria-controls="research-agent-pane"><MessageSquare size={15}/><span>{agentOpen ? "Hide agent" : "Ask agent"}</span></button>
        </div>
        <div className="fc-report-scroll">
          {report ? (
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
              <p className="fc-section-label">COMPANY RESEARCH</p>
              <h1>{company ? `Understand ${company.name}.` : "Research a company"}</h1>
              <p>{company ? company.description : "Start with a company website. Get a clear report on the business, the team, and the questions worth asking."}</p>
              {company ? (
                <>
                  <div className="fc-empty-company-note"><Globe2 size={16}/><span>{company.website ? sourceHost(company.website) : "Company website not provided"}</span></div>
                  <button className="fc-btn primary" disabled={running} onClick={() => { setAgentOpen(true); void research(); }}><Sparkles size={16}/>{running ? "Researching…" : `Research ${company.name}`}<ArrowRight size={16}/></button>
                  <p className="fc-empty-small-note">{company.offeringStatus === "open" ? "An offering is listed. Check the source platform for current terms." : "A research report does not mean an investment offering is available."}</p>
                </>
              ) : (
                <>
                  <ol className="fc-agent-how"><li><span>1</span>Add a company website</li><li><span>2</span>Tell the agent what matters</li><li><span>3</span>Read the report and its sources</li></ol>
                  {!agentOpen ? <button className="fc-btn primary" onClick={() => { setAgentOpen(true); composer.current?.focus(); }}>Add a company<ArrowRight size={16}/></button> : null}
                </>
              )}
              <button className="fc-text-btn" onClick={onDiscover}>Browse companies <ArrowRight size={15}/></button>
            </div>
          )}
        </div>
      </section>

      <aside id="research-agent-pane" className="fc-agent-chat" aria-label="Research agent conversation" hidden={!agentOpen}>
        <div className="fc-pane-heading"><span><Sparkles size={16}/>Research agent</span><span className="fc-chat-engine">Public web</span></div>
        <div className="fc-chat-scroll">
          {!messages.length ? <div className="fc-agent-greeting"><strong>{report ? "Go a little deeper." : "What should we look into?"}</strong><p>{report ? "Ask a follow-up question or research another company." : "Add a website below. Ask a specific question, or let the agent cover the essentials."}</p></div> : null}
          {messages.map(message => <div className={`fc-chat-message ${message.role} ${message.error ? "error" : ""}`} key={message.id}>{message.role === "assistant" ? <Sparkles size={14}/> : null}<p>{message.text}</p></div>)}
          {running || steps.length ? (
            <details className="fc-task-progress" open={running || undefined}>
              <summary className="fc-task-heading">
                {running ? <LoaderCircle size={15} className="spin"/> : error ? <TriangleAlert size={15}/> : <CheckCircle2 size={15}/>}
                <strong>{running ? steps.find(step => step.status === "running")?.label || "Starting research…" : error ? "Research needs attention" : "Research activity"}</strong>
                {steps.length ? <span>{completed}/{steps.length}</span> : null}<ChevronDown size={14}/>
              </summary>
              {steps.map(step => <div className={`fc-task-step ${step.status}`} key={step.id}>{step.status === "running" ? <LoaderCircle size={13} className="spin"/> : step.status === "complete" ? <Check size={13}/> : step.status === "warning" || step.status === "failed" ? <TriangleAlert size={13}/> : <Circle size={9}/>}<div><strong>{step.label}</strong><p>{researchNote(step.detail)}</p></div></div>)}
            </details>
          ) : null}
          <div ref={conversationEnd}/>
        </div>
        <div className="fc-agent-composer">
          <label className="fc-agent-prompt-label" htmlFor="research-company-url">Company website</label>
          <div className="fc-url-input"><Link2 size={15}/><input id="research-company-url" value={url} onChange={event => setUrl(event.target.value)} placeholder={company?.website || "https://company.com"} disabled={running}/></div>
          <label className="fc-agent-prompt-label" htmlFor="research-question">Your question <span>Optional</span></label>
          <textarea id="research-question" ref={composer} placeholder={company ? `What should we know about ${company.name}?` : "For example: How does this company make money?"} value={question} onChange={event => setQuestion(event.target.value)} disabled={running} onKeyDown={event => { if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); void research(); } }}/>
          <div className="fc-composer-footer">
            <span>⌘ / Ctrl + Enter</span>
            {running ? <button className="fc-agent-run-button secondary" onClick={() => controller.current?.abort()}><Square size={13}/>Stop waiting</button> : <button className="fc-agent-run-button" onClick={() => research()}>Research<ArrowRight size={16}/></button>}
          </div>
          {error ? <div role="alert" className="fc-inline-error"><TriangleAlert size={14}/><span>{error}</span><button className="fc-text-btn" onClick={() => research(lastQuestion)}>Retry</button></div> : null}
        </div>
        {company?.offeringStatus === "open" && safeWebUrl(company.offeringUrl) ? <a className="fc-offering-handoff" href={safeWebUrl(company.offeringUrl)} target="_blank" rel="noreferrer"><span><strong>View offering on {company.platform || "source platform"}</strong><small>Check current terms and eligibility.</small></span><ArrowUpRight size={17}/></a> : <p className="fc-agent-disclaimer"><ShieldCheck size={13}/>Investment availability is checked separately.</p>}
      </aside>

      {activeSource ? <WorkspaceDialog title={activeSource.title} subtitle={`${sourceHost(activeSource.url)} · ${activeSource.officialCompanySource ? "Company source" : "Third-party source"}`} onClose={() => setActiveSource(null)} wide><div className="fc-source-metadata"><span>{activeSource.publishedAt ? `Published ${displayDate(activeSource.publishedAt)}` : "Publication date unavailable"}</span><span>Read {displayDate(activeSource.retrievedAt)}</span></div>{sourcePassage ? <section className="fc-source-focus"><h3>Passage behind this claim</h3><blockquote>{sourcePassage}</blockquote></section> : null}<details className="fc-source-extract" open={!sourcePassage || undefined}><summary>Full page text<ChevronDown size={17}/></summary><p className="fc-financial-note">This is a page extraction. It may include navigation or marketing text.</p><div className="fc-retained-source">{sourceParagraphs(activeSource.text || activeSource.error || "Source content is unavailable.").map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div></details><div className="fc-dialog-actions"><button className="fc-btn secondary" onClick={() => setActiveSource(null)}>Back to report</button>{safeWebUrl(activeSource.url) ? <a className="fc-btn primary" href={safeWebUrl(activeSource.url)} target="_blank" rel="noreferrer">Open original source<ArrowUpRight size={15}/></a> : null}</div></WorkspaceDialog> : null}
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

function ResearchReport({ report, tab, onTab, onSource, offeringUrl, platform, running, onRetry }: { report: LiveDiligenceResult; tab: typeof reportTabs[number]; onTab: (tab: typeof reportTabs[number]) => void; onSource: (source: DiligenceSource, passage?: string | null) => void; offeringUrl?: string | null; platform?: string | null; running: boolean; onRetry: () => void }) {
  const readableSources = report.sources.filter(source => source.status === "fetched").length;
  const attemptedSources = report.sources.length;
  const companySource = report.sources.find(source => source.status === "fetched" && source.officialCompanySource && safeWebUrl(source.url) && new URL(source.url).pathname === "/") || report.sources.find(source => source.status === "fetched" && source.officialCompanySource);
  const businessVerified = report.sections.some(section => section.category === "company" && section.claims.length);
  const coverageLimited = report.status !== "complete" || report.mode !== "live-web";
  const limitations = [...new Set([...report.warnings, ...report.discovery.limitations].map(researchNote))];
  const sharedFit = /^(?:Shared company research\.|Compare the cited business and risk evidence)/.test(report.thesisFit.explanation);
  const specificCaveats = report.thesisFit.caveats.filter(item => !/^Research alignment is not a return forecast or eligibility assessment\./.test(item));
  const showFit = report.thesisFit.score !== null || (!sharedFit && !!report.thesisFit.explanation) || specificCaveats.length > 0;
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
        <h1>{report.company.name}</h1>
        {!(report.title.toLowerCase().startsWith(report.company.name.toLowerCase()) && /research|summary/i.test(report.title)) ? <p>{report.title}</p> : null}
        <dl className="fc-report-at-glance" aria-label="At a glance">
          <div className="fc-glance-item"><dt>Sources read</dt><dd>{readableSources}<small>of {attemptedSources} attempted</small></dd></div>
          <div className="fc-glance-item"><dt>Last researched</dt><dd>{displayDate(report.generatedAt)}</dd></div>
          <div className={`fc-glance-item ${coverageLimited ? "fc-warning-text" : ""}`}><dt>Coverage</dt><dd>{coverageLabel}{report.conflicts.length ? <small>{report.conflicts.length} conflict{report.conflicts.length === 1 ? "" : "s"} to review</small> : null}</dd></div>
        </dl>
        {coverageLimited ? <div className="fc-report-coverage" role="status"><TriangleAlert size={17}/><div><strong>{report.status === "unavailable" ? "This research couldn’t be completed." : report.mode === "sources-only" ? "Sources are ready. The AI report is incomplete." : "A useful starting point, with gaps to follow up."}</strong><p>{report.mode === "live-web" ? "Open questions and research limits are listed below." : "You can inspect the sources and see what was unavailable below."}</p></div><button className="fc-btn secondary" disabled={running} onClick={onRetry}>Research again<ArrowRight size={14}/></button></div> : null}
        {safeWebUrl(offeringUrl) ? <a className="fc-report-offering fc-text-btn" href={safeWebUrl(offeringUrl)} target="_blank" rel="noreferrer">View offering on {platform || "source platform"}<ArrowUpRight size={16}/></a> : null}
        <nav className="fc-report-subnav" role="tablist" aria-label="Research views">{reportTabs.map(item => <button role="tab" id={`research-tab-${item}`} aria-controls="research-tabpanel" aria-selected={tab === item} tabIndex={tab === item ? 0 : -1} key={item} className={tab === item ? "active" : ""} onClick={() => onTab(item)} onKeyDown={event => changeTab(event, item)}>{item}{item === "Sources" ? <span>{readableSources}</span> : null}</button>)}</nav>
      </header>
      <div className="fc-report-body" id="research-tabpanel" role="tabpanel" aria-labelledby={`research-tab-${tab}`}>
        {tab === "Report" ? (
          <>
            {!businessVerified && companySource ? <section className="fc-research-section fc-company-intro"><h2>The business</h2><p className="fc-financial-note">From the company website</p><p>{companySource.title} <Citations ids={[companySource.id]} sources={report.sources} onSource={onSource}/></p></section> : null}
            {!/public source evidence is retained below/i.test(report.summary) ? <section className="fc-research-section fc-report-overview"><h2>Overview</h2><div className="fc-report-summary">{report.summary.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div></section> : null}
            {showFit ? <details className="fc-report-disclosure fc-fit-context"><summary><span><strong><Target size={16}/>How it fits your brief</strong>{report.thesisFit.score !== null ? <small>{report.thesisFit.score}/100 preference alignment</small> : null}</span><ChevronDown size={18}/></summary><div className="fc-disclosure-content">{!sharedFit ? <p>{report.thesisFit.explanation}</p> : null}{specificCaveats.length ? <ul className="fc-plain-list">{specificCaveats.map(item => <li key={item}>{item}</li>)}</ul> : null}</div></details> : null}
            {report.sections.filter(section => section.claims.length > 0).map(section => <section className="fc-research-section" key={section.category}><div className="fc-report-section-heading"><h2>{sectionNames[section.category] || section.title}</h2></div>{section.title === "Source-listed alternatives" ? <><p>A source lists alternatives. We haven’t validated the comparison.</p><details className="fc-claim-evidence"><summary>Read the source’s list<ChevronDown size={15}/></summary>{section.claims.map((claim, index) => <ClaimEvidence key={index} claim={claim} sources={report.sources} onSource={onSource}/>)}</details></> : <div className="fc-claims-list">{section.claims.map((claim, index) => <ClaimEvidence key={`${section.category}-${index}`} claim={claim} sources={report.sources} onSource={onSource}/>)}</div>}</section>)}
            {report.conflicts.length ? <section className="fc-research-section fc-conflicts-section"><h2>Evidence that needs a closer look</h2><p>These sources may disagree. Check the dates and definitions before comparing them.</p>{report.conflicts.map((conflict, index) => <div className="fc-note warning" key={index}><TriangleAlert size={17}/><div><strong>{readableEvidence(conflict.field)}</strong><p>{conflict.description}</p><Citations ids={conflict.sourceIds} sources={report.sources} onSource={onSource}/>{conflict.evidence?.length ? <details className="fc-claim-evidence"><summary>Compare the passages<ChevronDown size={13}/></summary>{conflict.evidence.map((evidence, evidenceIndex) => <div key={evidenceIndex}><blockquote>{evidence.quote}</blockquote><Citations ids={[evidence.sourceId]} sources={report.sources} onSource={onSource}/></div>)}</details> : null}</div></div>)}</section> : null}
            {report.missingEvidence.length ? <ReportGaps gaps={report.missingEvidence}/> : null}
            {report.diligenceQuestions.length ? <section className="fc-research-section fc-founder-questions"><h2>Ask the founder</h2><p>A few questions to take into your next conversation.</p><ol className="fc-questions">{report.diligenceQuestions.map(item => <li key={item}>{item}</li>)}</ol></section> : null}
          </>
        ) : tab === "Financials" ? (
          <>
            <div className="fc-section-intro"><h2>The numbers we could find</h2><p>Only figures supported by readable public sources appear here. Missing numbers stay unknown.</p></div>
            <div className="fc-financial-grid">{Object.entries(report.financials).map(([key, field]) => <section className="fc-financial-tile" key={key}><h3>{financialLabels[key]}</h3><strong>{financialValue(field, key)}</strong>{field.status !== "not-found" ? <span className={`fc-status ${field.status === "conflicting" ? "warning" : "neutral"}`}>{field.status === "source-reported" ? "Reported in a source" : "Sources disagree"}</span> : null}{field.value !== null ? <p className="fc-financial-note">{field.period || "Reporting period not stated"}{field.asOf ? ` · As of ${displayDate(field.asOf)}` : ""}</p> : null}<Citations ids={field.sourceIds} sources={report.sources} onSource={onSource} passage={field.quote}/>{field.quote ? <details className="fc-claim-evidence"><summary>Read the financial disclosure<ChevronDown size={13}/></summary><blockquote>{field.quote}</blockquote></details> : null}</section>)}</div>
            <p className="fc-financial-explainer">ARR means annual recurring revenue. It differs from total annual revenue. Source reporting is not an audit.</p>
          </>
        ) : (
          <>
            <div className="fc-section-intro"><h2>Read the sources</h2><p>{readableSources} source{readableSources === 1 ? " was" : "s were"} readable.{attemptedSources > readableSources ? ` ${attemptedSources - readableSources} couldn’t be retrieved.` : ""} Select a source to inspect the retained text.</p></div>
            {report.sources.map((source, index) => <button className="fc-source-card" key={source.id} onClick={() => onSource(source)}><div><span className="fc-source-number">{index + 1}</span><span className="fc-source-domain">{sourceHost(source.url)}</span><span className={`fc-status ${source.status === "fetched" ? "neutral" : "warning"}`}>{source.status === "fetched" ? source.officialCompanySource ? "Company source" : "Third-party source" : "Unavailable"}</span><ArrowUpRight size={16}/></div><h3>{source.title}</h3><p className="fc-source-preview">{source.status === "fetched" ? source.text.slice(0, 180) : source.error || "This page could not be retrieved."}{source.status === "fetched" && source.text.length > 180 ? "… Read retained text" : ""}</p><footer className="fc-source-dates"><span>{source.publishedAt ? `Published ${displayDate(source.publishedAt)}` : "Publication date unavailable"}</span><span>Read {displayDate(source.retrievedAt)}</span></footer></button>)}
          </>
        )}
        <details className="fc-report-disclosure fc-research-method"><summary><span><strong>Research notes & limitations</strong><small>How this report was made</small></span><ChevronDown size={18}/></summary><div className="fc-disclosure-content">{limitations.length ? <ul className="fc-plain-list">{limitations.map(item => <li key={item}>{item}</li>)}</ul> : <p>No additional retrieval limitations were reported.</p>}<dl className="fc-research-provenance"><div><dt>Research mode</dt><dd>{report.mode === "live-web" ? "Web research with AI synthesis" : report.mode === "sources-only" ? "Sources without complete AI synthesis" : "Unavailable"}</dd></div><div><dt>Sources attempted</dt><dd>{attemptedSources}; {readableSources} readable</dd></div><div><dt>Report storage</dt><dd>{report.persisted ? "Saved to the shared workspace" : "Not saved to the server"}</dd></div><div><dt>AI synthesis</dt><dd>{report.model.provider === "none" ? "Unavailable" : `${report.model.provider} · ${report.model.id}`}</dd></div><div><dt>Trace</dt><dd>{report.trace.recorded ? "Recorded" : "Not recorded"}</dd></div></dl>{report.discovery.queries.length ? <details className="fc-claim-evidence"><summary>View search queries<ChevronDown size={13}/></summary><ul className="fc-plain-list">{report.discovery.queries.map((query, index) => <li key={index}>{query.query}</li>)}</ul></details> : null}</div></details>
      </div>
      <footer className="fc-report-footer"><ShieldCheck size={15}/><span>Use this report to guide further diligence. Offering availability, eligibility, and investment suitability require separate review.</span></footer>
    </article>
  );
}

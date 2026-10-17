"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Check, ChevronDown, X } from "lucide-react";
import { DEFAULT_DISCOVERY_PREFERENCES, DISCOVERY_SECTORS, DISCOVERY_STAGES as STAGES } from "@/lib/discovery";
import type { DiscoveryPreferences } from "@/lib/discovery-types";
import { WorkspaceDialog } from "./workspace-dialog";

export interface BriefProposal {
  preferences: DiscoveryPreferences;
  interpretation: string[];
  warnings: string[];
}

export const riskLabel = (risk: DiscoveryPreferences["riskAppetite"]) => ({ conservative: "Low", balanced: "Moderate", adventurous: "High" }[risk]);
export const revenueLabel = (rule: DiscoveryPreferences["revenueRequirement"]) => ({ any: "Any revenue stage", "reported-revenue": "Annual revenue required", "reported-arr": "ARR required" }[rule]);

export function InvestmentPreferences({ preferences, proposal, validate, onClose, onSave, submitLabel, title, focusField }: {
  focusField?: "budget" | "company-limit" | "risk" | "revenue";
  submitLabel?: string;
  title?: string;
  preferences: DiscoveryPreferences;
  proposal: BriefProposal | null;
  validate: (value: unknown) => boolean;
  onClose: () => void;
  onSave: (value: DiscoveryPreferences) => void;
}) {
  const [draft, setDraft] = useState<DiscoveryPreferences>({ ...preferences, sectors: [...preferences.sectors], industries: [...preferences.industries], stages: [...preferences.stages] });
  const [error, setError] = useState("");
  useEffect(() => { if (focusField) document.getElementById(`filter-${focusField}`)?.focus(); }, [focusField]);
  const limit = Math.min(draft.budget * draft.maxAllocationPct / 100, draft.maxMinimumCheck ?? Infinity);
  const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!validate(draft)) { setError("Check the amounts before saving your preferences."); return; }
    onSave(draft);
  }

  return <WorkspaceDialog title={title || (proposal ? "Review your preferences" : "Investment preferences")} onClose={onClose} wide>
    <form onSubmit={submit}>
      {title === "Your investment thesis" ? <label className="fc-field"><span>What future do you want to invest in?</span><textarea value={draft.thesis} maxLength={1200} onChange={event=>setDraft({...draft,thesis:event.target.value})} placeholder="The industries, founders and ideas you believe in…"/></label> : null}
      {proposal?.warnings.map(warning => <p className="fc-inline-error" key={warning}>{warning}</p>)}
      <section className="fc-preference-section">
        <h3>Budget</h3>
        <div className="fc-form-grid fc-preference-basics">
          <label className="fc-field"><span>Total ($)</span><input id="filter-budget" type="number" min="100" max="10000000" step="1" required value={draft.budget} onChange={event => setDraft({ ...draft, budget: Number(event.target.value) })}/></label>
          <label className="fc-field"><span>Per company ($)</span><input id="filter-company-limit" type="number" min="1" max={draft.budget} step="1" required value={Number((draft.budget * draft.maxAllocationPct / 100).toFixed(2))} onChange={event => setDraft({ ...draft, maxAllocationPct: draft.budget > 0 ? Number(event.target.value) / draft.budget * 100 : 0 })}/>{draft.maxMinimumCheck !== null ? <small>Effective cap: {money(limit)}</small> : null}</label>
        </div>
      </section>

      <section className="fc-preference-section">
        <h3>Sectors</h3>
        <div className="fc-choice-group" aria-label="Preferred sectors"><button type="button" aria-pressed={!draft.sectors.length && !draft.industries.length} className={!draft.sectors.length && !draft.industries.length ? "active" : ""} onClick={() => setDraft({ ...draft, sectors: [], industries: [] })}>All sectors</button>
          {DISCOVERY_SECTORS.map(sector => <button type="button" key={sector} aria-pressed={draft.sectors.includes(sector)} className={draft.sectors.includes(sector) ? "active" : ""} onClick={() => setDraft(current => ({ ...current, industries: [], sectors: current.sectors.includes(sector) ? current.sectors.filter(item => item !== sector) : [...current.sectors, sector] }))}>{draft.sectors.includes(sector) ? <Check size={14}/> : null}{sector}</button>)}
        </div>
      </section>

      <section className="fc-preference-section">
        <h3>Requirements</h3>
        <div className="fc-form-grid">
          <label className="fc-field"><span>Revenue</span><select id="filter-revenue" value={draft.revenueRequirement} onChange={event => setDraft({ ...draft, revenueRequirement: event.target.value as DiscoveryPreferences["revenueRequirement"] })}><option value="any">Any revenue stage</option><option value="reported-revenue">Annual revenue · sourced</option><option value="reported-arr">Recurring revenue (ARR) · sourced</option></select></label>
          <label className="fc-field"><span>Risk level</span><select id="filter-risk" value={draft.riskAppetite} onChange={event => setDraft({ ...draft, riskAppetite: event.target.value as DiscoveryPreferences["riskAppetite"] })}><option value="conservative">Low · excludes early-stage</option><option value="balanced">Moderate · assessed risk only</option><option value="adventurous">High · includes unassessed</option></select></label>
        </div>
      </section>

      <details className="fc-more-filters">
        <summary>More filters<ChevronDown size={17}/></summary>
        <div>
          {title !== "Your investment thesis" ? <label className="fc-field"><span>Brief</span><textarea value={draft.thesis} maxLength={1200} onChange={event => setDraft({ ...draft, thesis: event.target.value })} placeholder="Anything else that matters to you?"/></label> : null}
          <div className="fc-field"><span>Funding stage</span><div className="fc-choice-group"><button type="button" aria-pressed={!draft.stages.length} className={!draft.stages.length ? "active" : ""} onClick={() => setDraft({ ...draft, stages: [] })}>All stages</button>{STAGES.map(stage => <button type="button" key={stage} aria-pressed={draft.stages.includes(stage)} className={draft.stages.includes(stage) ? "active" : ""} onClick={() => setDraft({ ...draft, stages: draft.stages.includes(stage) ? draft.stages.filter(item => item !== stage) : [...draft.stages, stage] })}>{stage}</button>)}</div></div>
          <div className="fc-form-grid">
            <label className="fc-field"><span>Minimum annual revenue ($ USD)</span><input type="number" min="0" value={draft.minAnnualRevenue ?? ""} placeholder="No minimum" onChange={event => setDraft({ ...draft, minAnnualRevenue: event.target.value ? Number(event.target.value) : null })}/></label>
            <label className="fc-field"><span>Maximum starting investment ($)</span><input type="number" min="0" value={draft.maxMinimumCheck ?? ""} placeholder="Use your company limit" onChange={event => setDraft({ ...draft, maxMinimumCheck: event.target.value ? Number(event.target.value) : null })}/></label>
            <label className="fc-field"><span>Time horizon (years)</span><input id="filter-horizon" type="number" min="1" max="30" value={draft.horizonYears} required onChange={event => setDraft({ ...draft, horizonYears: Number(event.target.value) })}/></label>
            <label className="fc-field"><span>Companies to include</span><select value={draft.offeringOnly ? "open" : "all"} onChange={event => setDraft({ ...draft, offeringOnly: event.target.value === "open" })}><option value="open">Open offerings with known minimums</option><option value="all">All research companies</option></select></label>
          </div>
          {draft.excludedSectors?.length ? <div className="fc-field"><span>Excluded sectors</span><div className="fc-choice-group">{draft.excludedSectors.map(sector => <button type="button" key={sector} onClick={() => setDraft({ ...draft, excludedSectors: draft.excludedSectors?.filter(item => item !== sector) })}>{sector}<X size={14}/></button>)}</div></div> : null}
          <label className="fc-checkbox"><input type="checkbox" checked={draft.includeUnverified} onChange={event => setDraft({ ...draft, includeUnverified: event.target.checked })}/><span>Include older or unverified offering status</span></label>
        </div>
      </details>
      <details className="fc-filter-data-rules"><summary>Data requirements<ChevronDown size={14}/></summary><p>Revenue filters require a positive sourced figure. Annual revenue and ARR are distinct. Missing evidence does not qualify.</p></details>
      {error ? <p className="fc-inline-error" role="alert">{error}</p> : null}
      <div className="fc-dialog-actions">
        <button type="button" className="fc-text-btn" onClick={() => setDraft({ ...DEFAULT_DISCOVERY_PREFERENCES })}>Reset</button>
        <button type="button" className="fc-btn secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="fc-btn primary">{submitLabel || (proposal ? "Use these preferences" : "Save preferences")}<ArrowRight size={16}/></button>
      </div>
    </form>
  </WorkspaceDialog>;
}

"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Check, ChevronDown, X } from "lucide-react";
import { DEFAULT_DISCOVERY_PREFERENCES, DISCOVERY_SECTORS } from "@/lib/discovery";
import { STAGES } from "@/lib/data";
import type { DiscoveryPreferences } from "@/lib/discovery-types";
import { WorkspaceDialog } from "./workspace-dialog";

export interface BriefProposal {
  preferences: DiscoveryPreferences;
  interpretation: string[];
  warnings: string[];
}

export const riskLabel = (risk: DiscoveryPreferences["riskAppetite"]) => ({ conservative: "Low", balanced: "Moderate", adventurous: "High" }[risk]);
export const revenueLabel = (rule: DiscoveryPreferences["revenueRequirement"]) => ({ any: "Any revenue stage", "reported-revenue": "Annual revenue required", "reported-arr": "ARR required" }[rule]);

export function InvestmentPreferences({ preferences, proposal, validate, onClose, onSave }: {
  preferences: DiscoveryPreferences;
  proposal: BriefProposal | null;
  validate: (value: unknown) => boolean;
  onClose: () => void;
  onSave: (value: DiscoveryPreferences) => void;
}) {
  const [draft, setDraft] = useState<DiscoveryPreferences>({ ...preferences, sectors: [...preferences.sectors], industries: [...preferences.industries], stages: [...preferences.stages] });
  const [error, setError] = useState("");
  const limit = Math.min(draft.budget * draft.maxAllocationPct / 100, draft.maxMinimumCheck ?? Infinity);
  const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!validate(draft)) { setError("Check the amounts before saving your preferences."); return; }
    onSave(draft);
  }

  return <WorkspaceDialog title={proposal ? "Review your preferences" : "Investment preferences"} subtitle={proposal ? "Check these filters before continuing." : "Choose what a company needs to match."} onClose={onClose} wide>
    <form onSubmit={submit}>
      {proposal?.warnings.map(warning => <p className="fc-inline-error" key={warning}>{warning}</p>)}
      <section className="fc-preference-section">
        <h3>Your budget</h3>
        <div className="fc-form-grid fc-preference-basics">
          <label className="fc-field"><span>Total budget ($)</span><input type="number" min="100" max="10000000" step="1" required value={draft.budget} onChange={event => setDraft({ ...draft, budget: Number(event.target.value) })}/></label>
          <label className="fc-field"><span>Per company limit ($)</span><input type="number" min="1" max={draft.budget} step="1" required value={Number((draft.budget * draft.maxAllocationPct / 100).toFixed(2))} onChange={event => setDraft({ ...draft, maxAllocationPct: draft.budget > 0 ? Number(event.target.value) / draft.budget * 100 : 0 })}/><small>{draft.maxMinimumCheck !== null ? `Entry checks must also be at most ${money(limit)}.` : "Offerings with a minimum investment above this limit won’t qualify."}</small></label>
        </div>
      </section>

      <section className="fc-preference-section">
        <h3>Your interests</h3>
        <p>Choose sectors, or leave empty to include all.</p>
        <div className="fc-choice-group" aria-label="Preferred sectors">
          {DISCOVERY_SECTORS.map(sector => <button type="button" key={sector} aria-pressed={draft.sectors.includes(sector)} className={draft.sectors.includes(sector) ? "active" : ""} onClick={() => setDraft(current => ({ ...current, industries: [], sectors: current.sectors.includes(sector) ? current.sectors.filter(item => item !== sector) : [...current.sectors, sector] }))}>{draft.sectors.includes(sector) ? <Check size={14}/> : null}{sector}</button>)}
        </div>
      </section>

      <section className="fc-preference-section">
        <h3>What must be true?</h3>
        <div className="fc-form-grid">
          <label className="fc-field"><span>Revenue</span><select value={draft.revenueRequirement} onChange={event => setDraft({ ...draft, revenueRequirement: event.target.value as DiscoveryPreferences["revenueRequirement"] })}><option value="any">No requirement</option><option value="reported-revenue">Positive annual revenue</option><option value="reported-arr">Positive recurring revenue (ARR)</option></select><small>{draft.revenueRequirement === "reported-revenue" ? "Annual revenue needs a source. ARR alone won’t meet this rule." : draft.revenueRequirement === "reported-arr" ? "ARR needs a source. Total revenue alone won’t meet this rule." : "Companies can be at any revenue stage."}</small></label>
          <label className="fc-field"><span>Risk level</span><select value={draft.riskAppetite} onChange={event => setDraft({ ...draft, riskAppetite: event.target.value as DiscoveryPreferences["riskAppetite"] })}><option value="conservative">Low</option><option value="balanced">Moderate</option><option value="adventurous">High</option></select><small>{draft.riskAppetite === "conservative" ? "Early-stage private companies won’t qualify." : draft.riskAppetite === "balanced" ? "Excludes very high or undocumented risk." : "Includes very high and undocumented risk."}</small></label>
        </div>
      </section>

      <details className="fc-more-filters">
        <summary>More filters<ChevronDown size={17}/></summary>
        <div>
          <label className="fc-field"><span>Your written brief</span><textarea value={draft.thesis} maxLength={1200} onChange={event => setDraft({ ...draft, thesis: event.target.value })} placeholder="Anything else that matters to you?"/></label>
          <div className="fc-field"><span>Funding stage</span><div className="fc-choice-group">{STAGES.map(stage => <button type="button" key={stage} aria-pressed={draft.stages.includes(stage)} className={draft.stages.includes(stage) ? "active" : ""} onClick={() => setDraft({ ...draft, stages: draft.stages.includes(stage) ? draft.stages.filter(item => item !== stage) : [...draft.stages, stage] })}>{stage}</button>)}</div><small>Leave unselected to include all stages, including unknown stages.</small></div>
          <div className="fc-form-grid">
            <label className="fc-field"><span>Minimum annual revenue ($ USD)</span><input type="number" min="0" value={draft.minAnnualRevenue ?? ""} placeholder="No minimum" onChange={event => setDraft({ ...draft, minAnnualRevenue: event.target.value ? Number(event.target.value) : null })}/></label>
            <label className="fc-field"><span>Maximum starting investment ($)</span><input type="number" min="0" value={draft.maxMinimumCheck ?? ""} placeholder="Use your company limit" onChange={event => setDraft({ ...draft, maxMinimumCheck: event.target.value ? Number(event.target.value) : null })}/></label>
            <label className="fc-field"><span>Time horizon (years)</span><input type="number" min="1" max="30" value={draft.horizonYears} required onChange={event => setDraft({ ...draft, horizonYears: Number(event.target.value) })}/></label>
            <label className="fc-field"><span>Companies to include</span><select value={draft.offeringOnly ? "open" : "all"} onChange={event => setDraft({ ...draft, offeringOnly: event.target.value === "open" })}><option value="open">Open offerings with known minimums</option><option value="all">All research companies</option></select></label>
          </div>
          {draft.excludedSectors?.length ? <div className="fc-field"><span>Excluded sectors</span><div className="fc-choice-group">{draft.excludedSectors.map(sector => <button type="button" key={sector} onClick={() => setDraft({ ...draft, excludedSectors: draft.excludedSectors?.filter(item => item !== sector) })}>{sector}<X size={14}/></button>)}</div></div> : null}
          <label className="fc-checkbox"><input type="checkbox" checked={draft.includeUnverified} onChange={event => setDraft({ ...draft, includeUnverified: event.target.checked })}/><span>Include older or unverified offering status</span></label>
        </div>
      </details>
      <p className="fc-preference-footnote">Missing evidence won’t satisfy a requirement. These filters help you research; they don’t assess investment suitability.</p>
      {error ? <p className="fc-inline-error" role="alert">{error}</p> : null}
      <div className="fc-dialog-actions">
        <button type="button" className="fc-text-btn" onClick={() => setDraft({ ...DEFAULT_DISCOVERY_PREFERENCES })}>Reset</button>
        <button type="button" className="fc-btn secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="fc-btn primary">{proposal ? "Use these preferences" : "Save preferences"}<ArrowRight size={16}/></button>
      </div>
    </form>
  </WorkspaceDialog>;
}

"use client";

import { ArrowRight, ArrowUpRight, Bookmark, ChevronDown } from "lucide-react";
import type { DiscoveryCompany } from "@/lib/discovery-types";
import { displayDate, safeWebUrl, sourceAmount } from "./agent-workspace";

export const formatUSD = (value: number | null) => value === null ? "Unknown" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

export function readableFilterReason(reason: string) {
  return reason.replace("Positive annual revenue is not verified in the retrieved sources", "Annual revenue isn’t verified").replace("Positive ARR is not verified in the retrieved sources", "Recurring revenue (ARR) isn’t verified").replace("Minimum check is not disclosed, so budget fit cannot be confirmed", "The minimum investment is unknown").replace("Outside your selected sectors", "Different sector from your preferences").replace("Funding stage is not disclosed", "Funding stage is unknown").replace("No currently open public offering is reported", "No open public offering is reported").replace("Minimum check exceeds", "Minimum investment exceeds").replace(" per-company limit", " company limit");
}

export function CompanyList({ entries, savedIds, onSave, onResearch }: {
  entries: Array<{ company: DiscoveryCompany; reasons: string[]; warnings?: string[]; score?: number }>;
  savedIds: string[];
  onSave: (id: string) => void;
  onResearch: (company: DiscoveryCompany) => void;
}) {
  return <div className="fc-company-list">
    {entries.map(({ company, reasons, warnings, score }, index) => {
      const saved = savedIds.includes(company.id);
      const offeringUrl = safeWebUrl(company.offeringUrl);
      return <article className="fc-company-card" key={company.id}>
        <div className="fc-card-heading">
          <div className="fc-company-identity">
            <span className={`fc-company-avatar color-${index % 6}`}>{company.name.slice(0, 1)}</span>
            <div><h3><button className="fc-company-name" onClick={() => onResearch(company)}>{company.name}</button></h3><p className="fc-company-meta">{company.sectors.slice(0, 2).join(" · ") || company.industry}{company.stage !== "Unknown" ? ` · ${company.stage}` : ""}</p></div>
          </div>
          <button className={`fc-icon-btn ${saved ? "saved" : ""}`} aria-label={`${saved ? "Remove" : "Save"} ${company.name} ${saved ? "from" : "to"} watchlist`} aria-pressed={saved} onClick={() => onSave(company.id)}><Bookmark size={20} fill={saved ? "currentColor" : "none"}/></button>
        </div>
        <p className="fc-company-description">{company.description}</p>
        <dl className="fc-card-metrics">
          <div><dt>Minimum investment</dt><dd>{formatUSD(company.minInvestment)}</dd></div>
          <div><dt>Annual revenue</dt><dd>{company.annualRevenue === null ? "Not verified" : sourceAmount(company.annualRevenue, company.financialCurrency)}</dd></div>
          {company.arr !== null ? <div><dt>Recurring revenue (ARR)</dt><dd>{sourceAmount(company.arr, company.arrCurrency)}</dd></div> : null}
        </dl>
        {(reasons.length || warnings?.length) ? <details className="fc-card-fit"><summary>{typeof score === "number" ? "Why it matches your preferences" : "Check against your preferences"}<ChevronDown size={15}/></summary><ul>{reasons.map(reason => <li key={reason}>{readableFilterReason(reason)}</li>)}{warnings?.map(warning => <li key={warning}>{warning}</li>)}</ul>{typeof score === "number" ? <p>Filter score: {score}/100. This measures your preferences, not expected returns.</p> : null}</details> : null}
        <div className="fc-card-footer">
          <div className="fc-card-status"><span>{company.offeringStatus === "open" ? "Source reports open" : company.offeringStatus === "closed" ? "Offering closed" : company.offeringStatus === "unverified" ? "Status unverified" : "Research only"}</span><small>Checked {displayDate(company.lastCheckedAt)}</small></div>
          <div>{offeringUrl ? <a className="fc-text-btn" href={offeringUrl} target="_blank" rel="noreferrer">{company.platform || "Offering"}<ArrowUpRight size={15}/></a> : null}<button className="fc-btn secondary" onClick={() => onResearch(company)}>{company.dossierId ? "View research" : "Research company"}<ArrowRight size={16}/></button></div>
        </div>
      </article>;
    })}
  </div>;
}

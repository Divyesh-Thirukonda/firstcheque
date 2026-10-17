"use client";

import type { ReactNode } from "react";
import { ArrowUpRight, Bookmark } from "lucide-react";
import type { DiscoveryCompany } from "@/lib/discovery-types";
import { CompanyLogo } from "./company-logo";
import { companyTagline } from "@/lib/company-presentation";

export const formatUSD = (value: number | null) => value === null ? "Unknown" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: Number.isInteger(value) ? 0 : 2 }).format(value);

export function readableFilterReason(reason: string) {
  return reason.replace("Positive annual revenue is not verified in the retrieved sources", "Annual revenue isn’t verified").replace("Positive ARR is not verified in the retrieved sources", "Recurring revenue (ARR) isn’t verified").replace("Minimum check is not disclosed, so budget fit cannot be confirmed", "The minimum investment is unknown").replace("Outside your selected sectors", "Different sector from your preferences").replace("Funding stage is not disclosed", "Funding stage is unknown").replace("No currently open public offering is reported", "No open public offering is reported").replace("Minimum check exceeds", "Minimum investment exceeds").replace(" per-company limit", " company limit");
}

export interface CompanyEntry { company: DiscoveryCompany; reasons: string[]; warnings?: string[]; score?: number }

export function CompanyTile({ id, name, description, sector, footer, saved = false, onSave, onOpen, logo, secondaryLabel }: {
  id: string; name: string; description: string; sector: string; footer: string;
  saved?: boolean; onSave?: () => void; onOpen: () => void; logo?: ReactNode; secondaryLabel?: string;
}) {
  return <article className="fc-company-tile">
    <button className="fc-tile-open" onClick={onOpen} aria-label={`Explore ${name}`}>
      {logo || <CompanyLogo id={id} name={name}/>}
      <h3>{name}</h3><p className="fc-tile-description">{description}</p>
      <span className="fc-tile-sector">{sector}</span>
      <span className="fc-tile-footer"><span>{footer}</span><ArrowUpRight size={18}/></span>
      {secondaryLabel ? <span className="fc-tile-secondary">{secondaryLabel}</span> : null}
    </button>
    {onSave ? <button className={`fc-tile-save ${saved ? "saved" : ""}`} aria-label={`${saved ? "Remove" : "Save"} ${name} ${saved ? "from" : "to"} watchlist`} aria-pressed={saved} onClick={onSave}><Bookmark size={19} fill={saved ? "currentColor" : "none"}/></button> : null}
  </article>;
}

export function CompanyList({ entries, savedIds, onSave, onResearch }: {
  entries: CompanyEntry[];
  savedIds: string[];
  onSave: (id: string) => void;
  onResearch: (company: DiscoveryCompany) => void;
}) {
  return <div className="fc-company-grid">
    {entries.map(({ company }) => {
      const minimum = company.offeringStatus === "closed" ? "Offering closed" : company.kind !== "offering" ? "Research only" : company.minInvestment !== null ? `From ${formatUSD(company.minInvestment)}` : "Minimum unknown";
      return <CompanyTile key={company.id} id={company.id} name={company.name} description={companyTagline(company)} sector={company.sectors[0] || company.industry} logo={<CompanyLogo id={company.id} name={company.name} logo={company.logo}/>} footer={company.kind === "company" && company.stage !== "Unknown" ? company.stage : minimum} secondaryLabel={company.catalogOrigin === "event-handoff" ? "Money Talks founder" : undefined} saved={savedIds.includes(company.id)} onSave={() => onSave(company.id)} onOpen={() => onResearch(company)}/>;
    })}
  </div>;
}

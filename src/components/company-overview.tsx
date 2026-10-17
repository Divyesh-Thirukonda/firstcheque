"use client";

import { ArrowRight, ArrowUpRight, Bookmark, Check, ChevronDown, FileText, Globe2, TriangleAlert } from "lucide-react";
import type { DiscoveryCompany } from "@/lib/discovery-types";
import type { LiveDiligenceResult } from "@/lib/live-research-types";
import { companyDescription } from "@/lib/company-presentation";
import { CompanyLogo } from "./company-logo";
import { formatUSD, readableFilterReason, type CompanyEntry } from "./company-list";

const webUrl = (value: string | null) => { try { const url = new URL(value || ""); return /^https?:$/.test(url.protocol) ? url.href : undefined; } catch { return undefined; } };
const date = (value: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(value));
const amount = (value: number | null, currency?: string | null) => value === null ? "Not verified" : currency && /^[A-Z]{3}$/.test(currency) ? new Intl.NumberFormat("en-US", { style: "currency", currency, notation: "compact", maximumFractionDigits: 2 }).format(value) : `${new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(value)} · currency unspecified`;

export function CompanyOverview({ company, report, fit, saved, onSave, onResearch, researchLabel }: {
  researchLabel?: string;
  company: DiscoveryCompany;
  report: LiveDiligenceResult | null;
  fit?: Omit<CompanyEntry, "company">;
  saved: boolean;
  onSave: () => void;
  onResearch: () => void;
}) {
  const offering = webUrl(company.offeringUrl);
  const website = webUrl(company.website);
  const status = { open: "Source reports open", closed: "Offering closed", unverified: "Status unverified", "not-listed": "No offering listed" }[company.offeringStatus];
  return <article className="fc-company-overview">
    <header className="fc-company-overview-head"><CompanyLogo id={company.id} name={company.name} large/><div className="fc-company-overview-heading"><p>{company.sectors.slice(0, 2).join(" · ") || company.industry}</p><h1>{company.name}</h1></div><button className={`fc-tile-save fc-overview-save ${saved ? "saved" : ""}`} aria-label={`${saved ? "Remove" : "Save"} ${company.name} ${saved ? "from" : "to"} watchlist`} aria-pressed={saved} onClick={onSave}><Bookmark size={21} fill={saved ? "currentColor" : "none"}/></button></header>
    <section className="fc-business-description"><h2>What they do</h2><p>{companyDescription(company)}</p>{website ? <a className="fc-company-site" href={website} target="_blank" rel="noreferrer"><Globe2 size={15}/>{new URL(website).hostname.replace(/^www\./, "")}<ArrowUpRight size={14}/></a> : null}</section>
    <section className="fc-company-research-cta"><div><FileText size={20}/><span><strong>Research</strong>{report ? <small>{report.sources.filter(source => source.status === "fetched").length} sources <span className={`fc-coverage-pill ${report.status === "complete" ? "" : "partial"}`}>{report.status === "complete" ? "Complete" : report.status === "unavailable" ? "Unavailable" : "Partial"}</span></small> : null}</span></div><button className="fc-btn primary" onClick={onResearch}>{researchLabel || (report ? "Read research" : "Research company")}<ArrowRight size={16}/></button></section>
    <section className="fc-company-facts"><h2>At a glance</h2><dl><div><dt>Minimum investment</dt><dd>{company.minInvestment === null ? "Not disclosed" : formatUSD(company.minInvestment)}</dd></div><div><dt>Annual revenue</dt><dd>{amount(company.annualRevenue, company.financialCurrency)}</dd></div><div><dt>Funding stage</dt><dd>{company.stage === "Unknown" ? "Not disclosed" : company.stage}</dd></div><div><dt>Offering status</dt><dd>{status}</dd></div>{company.arr !== null ? <div><dt>Recurring revenue (ARR)</dt><dd>{amount(company.arr, company.arrCurrency)}</dd></div> : null}</dl>{company.financialSourceUrl && webUrl(company.financialSourceUrl) ? <a className="fc-company-site" href={webUrl(company.financialSourceUrl)} target="_blank" rel="noreferrer">Financial source{company.financialsAsOf ? ` · ${company.financialsAsOf}` : ""}<ArrowUpRight size={14}/></a> : null}</section>
    {fit && (fit.reasons.length || fit.warnings?.length) ? <section className="fc-overview-fit"><h2>{fit.warnings?.length && !fit.reasons.length ? "Outside this search’s filters" : "Search fit"}</h2><ul>{fit.reasons.map(reason => <li key={reason}><Check size={16}/><span>{readableFilterReason(reason)}</span></li>)}{fit.warnings?.map(reason => <li className="warning" key={reason}><TriangleAlert size={16}/><span>{readableFilterReason(reason)}</span></li>)}</ul>{typeof fit.score === "number" ? <p className="fc-fit-score" title="Preference alignment, not expected returns">Filter fit <strong>{fit.score}/100</strong></p> : null}</section> : null}
    <section className="fc-overview-offering"><div><h2>Offering details</h2><p>{company.platform || "No offering listed"} <span aria-hidden="true">·</span> {Number.isFinite(Date.parse(company.lastCheckedAt)) ? date(company.lastCheckedAt) : "Date unavailable"}</p></div>{offering ? <a className="fc-btn secondary" href={offering} target="_blank" rel="noreferrer">View original offering<ArrowUpRight size={16}/></a> : null}<details><summary>Source notes<ChevronDown size={15}/></summary><p>{company.statusEvidence || "Current fundraising terms and eligibility require review at the original source."}</p><p>{company.minimumEvidence || "The minimum check was not disclosed in the retained source."}</p></details></section>

  </article>;
}

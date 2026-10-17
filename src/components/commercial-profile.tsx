"use client";
import { ArrowUpRight, ChevronDown, UserRound } from "lucide-react";
import type { DiscoveryCompany, FounderLead } from "@/lib/discovery-types";
import {
  assumesPreRevenue,
  COMMERCIAL_LABELS,
  eventStatus,
  founderQuestions,
  founderLeadQuestions,
} from "@/lib/event-discovery";
const url = (value: string) => {
  try {
    const parsed = new URL(value);
    return /^https?:$/.test(parsed.protocol) ? parsed.href : undefined;
  } catch {
    return undefined;
  }
};
const date = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
export function EventContext({ company }: { company: DiscoveryCompany }) {
  if (company.catalogOrigin !== "event-handoff") return null;
  return (
    <div className="fc-event-context">
      <span>{eventStatus(company)}</span>
      {company.publishStatus === "historical_founder_relationship" ? (
        <p>Past founder relationship · Current company activity unconfirmed</p>
      ) : company.publishStatus === "company_details_need_review" ? (
        <p>Company identity or product details need a founder check.</p>
      ) : null}
    </div>
  );
}
export function CommercialProfile({ company }: { company: DiscoveryCompany }) {
  const signals = company.commercialSignals || [];
  return (
    <section className="fc-profile-section fc-commercial-profile">
      <h2>Customers & pricing</h2>
      {assumesPreRevenue(company) ? (
        <p
          className="fc-revenue-assumption"
          title="Planning assumption requested for this catalog; no revenue amount was verified."
        >
          Assumed pre-revenue <span>Not verified</span>
        </p>
      ) : null}
      {signals.length ? (
        <dl>
          {signals.map((signal, i) => (
            <div key={`${signal.kind}-${i}`}>
              <dt>{signal.label || COMMERCIAL_LABELS[signal.kind]}</dt>
              <dd>
                <strong>
                  {signal.value
                    .replace(/per month/g, " / month")
                    .replace(/^(?:Starter|Pro|Ultra|Max)(?=\$)/, "")
                    .replace(/30\+estate/, "30+ estate")}
                </strong>
                <a
                  href={url(signal.sourceUrl)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Source · Checked {date(signal.checkedAt)}
                  <ArrowUpRight size={12} />
                </a>
                <details>
                  <summary>Evidence</summary>
                  <p>{signal.quote}</p>
                </details>
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      <div className="fc-commercial-gaps">
        {(["pilots", "customers", "pricing"] as const)
          .filter((kind) => !signals.some((signal) => signal.kind === kind))
          .map((kind) => (
            <div key={kind}>
              <small>{COMMERCIAL_LABELS[kind]}</small>
              <span>Unknown</span>
            </div>
          ))}
      </div>
      {signals.length ? (
        <small className="fc-commercial-attribution">
          Public source claims · Counts and plans can change
        </small>
      ) : null}
    </section>
  );
}
export function FounderQuestions({ company }: { company: DiscoveryCompany }) {
  if (company.catalogOrigin !== "event-handoff") return null;
  const name = company.founders?.[0]?.name;
  return (
    <details className="fc-founder-questions">
      <summary>
        Ask {name || "the founder"}
        <ChevronDown size={15} />
      </summary>
      <ul>
        {founderQuestions(company).map((question) => (
          <li key={question}>{question}</li>
        ))}
      </ul>
    </details>
  );
}
export function FounderLeads({ people }: { people: FounderLead[] }) {
  return (
    <div className="fc-founder-leads">
      {people.map((person) => (
        <article key={person.id}>
          <UserRound size={23} />
          <h3>{person.name}</h3>
          <p>{person.role}</p>
          <span className="fc-quiet-badge">Company to confirm</span>
          <a href={url(person.profileUrl)} target="_blank" rel="noreferrer">
            Event profile
            <ArrowUpRight size={14} />
          </a>
          <details>
            <summary>
              What to ask
              <ChevronDown size={14} />
            </summary>
            <ul>
              {founderLeadQuestions(person).map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          </details>
        </article>
      ))}
    </div>
  );
}

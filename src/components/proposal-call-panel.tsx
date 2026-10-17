"use client";
import { useEffect, useRef, useState } from "react";
import { ProposalVoiceDemo } from "./proposal-voice-demo";
import {
  Phone,
  Search,
  ArrowUpRight,
  LoaderCircle,
  Check,
  FileText,
} from "lucide-react";
import type { DiscoveryCompany } from "@/lib/discovery-types";
import type { CompanyContacts } from "@/lib/company-contacts";
import type { CallPurpose } from "@/lib/proposal-calls";
import {
  dollars,
  type ProposalDraft,
  type ExtractedTerm,
} from "@/lib/proposals";
export function ProposalCallPanel({
  company,
  draft,
  purpose,
  onPurpose,
  onUpdate,
}: {
  company: DiscoveryCompany;
  draft: ProposalDraft;
  purpose: CallPurpose;
  onPurpose: (value: CallPurpose) => void;
  onUpdate: (patch: Partial<ProposalDraft>) => void;
}) {
  const [contacts, setContacts] = useState<CompanyContacts | undefined>(
      company.contacts,
    ),
    [phone, setPhone] = useState(company.contacts?.phones[0]?.number || ""),
    [consent, setConsent] = useState(false),
    [configured, setConfigured] = useState(false),
    [configLoaded, setConfigLoaded] = useState(false),
    [busy, setBusy] = useState<"contacts" | "call" | "terms" | null>(null),
    [error, setError] = useState("");
  const latest = useRef({ draft, onUpdate });
  latest.current = { draft, onUpdate };
  const contact = contacts?.phones.find((item) => item.number === phone),
    active =
      !!draft.call && ["initiated", "processing"].includes(draft.call.status);
  async function refreshContacts() {
    setBusy("contacts");
    setError("");
    try {
      const r = await fetch("/api/companies/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: company.id }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setContacts(data.contacts);
      setPhone(data.contacts.phones[0]?.number || "");
      setConsent(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Contact lookup unavailable.");
    } finally {
      setBusy(null);
    }
  }
  useEffect(() => {
    let cancelled = false;
    fetch("/api/proposals/call")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setConfigured(data.configured === true);
          setConfigLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setConfigLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (!company.contacts && company.website) void refreshContacts();
  }, [company.id]);
  useEffect(() => {
    const session = draft.call;
    if (!session || !["initiated", "processing"].includes(session.status))
      return;
    let cancelled = false,
      timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const response = await fetch("/api/proposals/call", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: session.token }),
        });
        const data = await response.json();
        if (cancelled) return;
        if (!response.ok) throw new Error(data.error);
        if (data.status === "done") {
          latest.current.onUpdate({ notes: data.notes || "", sample: false });
          if (!data.transcriptReady) {
            latest.current.onUpdate({ call: { ...session, status: "done" } });
            setError(
              "Call ended without usable founder answers. No terms were inferred.",
            );
            return;
          }
          setBusy("terms");
          const analysis = await fetch("/api/proposals/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ notes: data.notes, sample: false }),
          });
          const result = await analysis.json();
          if (cancelled) return;
          if (!analysis.ok) {
            latest.current.onUpdate({ call: { ...session, status: "done" } });
            setBusy(null);
            setError(
              result.error ||
                "Transcript saved. Use manual notes to retry extraction.",
            );
            return;
          }
          const edits = latest.current.draft.terms.filter((t) => t.edited);
          latest.current.onUpdate({
            call: { ...session, status: "done" },
            terms: [
              ...edits,
              ...(result.terms as ExtractedTerm[]).filter(
                (t) => !edits.some((edit) => edit.key === t.key),
              ),
            ],
            step: 3,
          });
          setBusy(null);
          return;
        }
        if (data.status === "failed") {
          latest.current.onUpdate({ call: { ...session, status: "failed" } });
          setError(
            "The call did not complete. No contract terms were inferred.",
          );
          return;
        }
        if (Date.now() - Date.parse(session.startedAt) > 30 * 60 * 1000) {
          setError(
            "This call is taking longer than expected. Check ElevenLabs before starting another.",
          );
          return;
        }
        timer = setTimeout(poll, 15000);
      } catch (e) {
        if (!cancelled) {
          setBusy(null);
          setError(e instanceof Error ? e.message : "Call status unavailable.");
          timer = setTimeout(poll, 30000);
        }
      }
    };
    timer = setTimeout(poll, 3000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [draft.call?.conversationId, draft.call?.status]);
  async function start() {
    if (!contact || !consent || !configured || active) return;
    setBusy("call");
    setError("");
    try {
      const r = await fetch("/api/proposals/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose,
          draft,
          phone: contact.number,
          consentConfirmed: consent,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      onUpdate({ call: data.call });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Call could not be started.");
    } finally {
      setBusy(null);
    }
  }
  return (
    <section className="sp-call-panel" aria-label="Company call">
      <div className="sp-call-head">
        <div>
          <p className="sp-eyebrow">CONTACT THE COMPANY</p>
          <h2>One call. Fill the gaps.</h2>
        </div>
        <span className="sp-draft-badge">ElevenLabs · AI voice</span>
      </div>
      <div className="sp-call-choices">
        <button
          className={purpose === "missing-info" ? "selected" : ""}
          aria-pressed={purpose === "missing-info"}
          disabled={active}
          onClick={() => onPurpose("missing-info")}
        >
          <Search size={20} />
          <strong>Find missing info</strong>
          <small>Revenue, customers, pricing and open questions</small>
        </button>
        <button
          className={purpose === "offer" ? "selected" : ""}
          aria-pressed={purpose === "offer"}
          disabled={active}
          onClick={() => onPurpose("offer")}
        >
          <FileText size={20} />
          <strong>Make an offer</strong>
          <small>Discuss your proposed terms for an unsigned draft</small>
        </button>
      </div>
      {purpose === "offer" ? (
        <div className="sp-call-offer">
          <span>
            Proposed investment <strong>{dollars(draft.amount)}</strong>
          </span>
          <button className="fc-text-btn" onClick={() => onUpdate({ step: 0 })}>
            Edit offer
          </button>
        </div>
      ) : null}
      {!configured && configLoaded ? (
        <ProposalVoiceDemo
          key={purpose}
          draft={draft}
          purpose={purpose}
          onUpdate={onUpdate}
        />
      ) : null}
      <details className="sp-details" open={configured || undefined}>
        <summary>
          Company phone contact
          <ArrowUpRight size={13} />
        </summary>
        <div className="sp-call-contact">
          <div>
            <strong>
              {busy === "contacts"
                ? "Finding a published phone…"
                : contact
                  ? contact.display
                  : "No published phone found"}
            </strong>
            {contact ? (
              <a href={contact.sourceUrl} target="_blank" rel="noreferrer">
                Company website · Checked {contact.checkedAt.slice(0, 10)}
                <ArrowUpRight size={12} />
              </a>
            ) : (
              <small>
                {company.website
                  ? "Official website and linked contact pages"
                  : "Add the company website through deep research first."}
              </small>
            )}
          </div>
          <button
            className="fc-text-btn"
            disabled={busy !== null || active || !company.website}
            onClick={refreshContacts}
          >
            {busy === "contacts" ? (
              <LoaderCircle size={16} className="spin" />
            ) : (
              "Refresh contact"
            )}
          </button>
        </div>
        {contacts && contacts.phones.length > 1 ? (
          <label className="sp-field">
            <span>Company phone</span>
            <select
              aria-label="Company phone"
              value={phone}
              disabled={active}
              onChange={(e) => {
                setPhone(e.target.value);
                setConsent(false);
              }}
            >
              {contacts.phones.map((item) => (
                <option key={item.number} value={item.number}>
                  {item.display}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {configLoaded && !configured ? (
          <div className="sp-call-setup">
            <strong>Phone calls need a connected account</strong>
            <p>
              This demo runs in the browser. A paid phone provider and
              configured ElevenLabs agent are required for outbound calls.
            </p>
            <a
              href="https://elevenlabs.io/app/agents/phone-numbers"
              target="_blank"
              rel="noreferrer"
            >
              Open ElevenLabs setup
              <ArrowUpRight size={13} />
            </a>
          </div>
        ) : null}
        {contact ? (
          <label className="sp-call-consent">
            <input
              type="checkbox"
              checked={consent}
              disabled={active}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>The recipient agreed to this AI call and transcription.</span>
          </label>
        ) : null}
        {configured ? (
          <div className="sp-bottom-actions">
            <button
              className="fc-btn primary"
              disabled={
                !configured ||
                !contact ||
                !consent ||
                busy !== null ||
                active ||
                draft.sample
              }
              onClick={start}
            >
              {busy === "call" || active ? (
                <LoaderCircle size={16} className="spin" />
              ) : (
                <Phone size={16} />
              )}{" "}
              {active
                ? "Call in progress"
                : busy === "call"
                  ? "Starting call…"
                  : `Call ${company.name}`}
            </button>
            {draft.call?.status === "done" ? (
              <span className="sp-call-complete">
                <Check size={16} />
                Call complete
              </span>
            ) : null}
          </div>
        ) : null}
      </details>
      {draft.sample && configured ? (
        <p className="sp-muted">
          Fictional rehearsal selected. Clear the sample notes before a real
          call.
        </p>
      ) : null}
      {active ? (
        <p className="sp-muted" role="status">
          When the call ends, the transcript will fill your draft automatically.
        </p>
      ) : busy === "terms" ? (
        <p role="status">Preparing your contract draft…</p>
      ) : null}
      {error ? (
        <p className="sp-call-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

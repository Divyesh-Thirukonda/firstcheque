"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Clipboard,
  Download,
  FileText,
  Headphones,
  Layers3,
  LoaderCircle,
  MessageSquare,
  Phone,
  Play,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { DiscoveryCompany } from "@/lib/discovery-types";
import {
  dollars,
  hydrateProposals,
  isSyntheticNotes,
  newProposal,
  openingScript,
  PROPOSAL_STORAGE_KEY,
  proposalDocument,
  proposalMessage,
  SAMPLE_CONVERSATION,
  TERM_LABELS,
  type ExtractedTerm,
  type ProposalDraft,
  type TermKey,
} from "@/lib/proposals";
import { CompanyLogo } from "./company-logo";

const steps = [
  { name: "Proposal", icon: FileText },
  { name: "Conversation", icon: Headphones },
  { name: "Terms", icon: Layers3 },
  { name: "Review", icon: ShieldCheck },
];
const questions = [
  {
    title: "Round & eligibility",
    detail:
      "Are you raising now? Which offering route, instrument and minimum check apply? Can this investor participate?",
    icon: MessageSquare,
  },
  {
    title: "Ownership & dilution",
    detail:
      "What is the fully diluted cap table? Any outstanding SAFEs, notes or option pool changes? For priced equity, which share class and ownership basis?",
    icon: Layers3,
  },
  {
    title: "Economics & rights",
    detail:
      "What valuation or SAFE cap, discount, conversion triggers, liquidation preferences, information rights and pro rata rights are proposed?",
    icon: FileText,
  },
  {
    title: "Documents & next step",
    detail:
      "Who can authorize the investment? Can we review the cap table, disclosures and existing counsel-approved documents?",
    icon: ShieldCheck,
  },
];
function persistDraft(draft: ProposalDraft) {
  const previous = hydrateProposals(localStorage.getItem(PROPOSAL_STORAGE_KEY));
  localStorage.setItem(
    PROPOSAL_STORAGE_KEY,
    JSON.stringify(
      [draft, ...previous.filter((item) => item.id !== draft.id)].slice(0, 30),
    ),
  );
  window.dispatchEvent(new Event("seed-street-proposals"));
}
function safeOffering(company: DiscoveryCompany) {
  try {
    const url = new URL(company.offeringUrl || "");
    return /^https?:$/.test(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function InvestmentProposal({
  company,
  onBack,
}: {
  company: DiscoveryCompany;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState<ProposalDraft>(() => newProposal(company));
  const [amountText, setAmountText] = useState("1000");
  useEffect(() => setAmountText(String(draft.amount)), [draft.amount]);
  const [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false),
    [busy, setBusy] = useState<"voice" | "terms" | null>(null),
    [audioUrl, setAudioUrl] = useState(""),
    [copied, setCopied] = useState(false);
  const workspaceRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!ready) return;
    workspaceRef.current
      ?.closest(".fc-dialog, .fc-report-scroll")
      ?.scrollTo({ top: 0, behavior: "auto" });
    headingRef.current?.focus({ preventScroll: true });
  }, [draft.step, ready]);
  const audioRef = useRef<HTMLAudioElement>(null),
    currentAudio = useRef("");
  useEffect(() => {
    if (currentAudio.current) {
      URL.revokeObjectURL(currentAudio.current);
      currentAudio.current = "";
    }
    setAudioUrl("");
  }, [draft.script]);
  useEffect(() => {
    try {
      const prior = hydrateProposals(
        localStorage.getItem(PROPOSAL_STORAGE_KEY),
      ).find((row) => row.companyId === company.id);
      if (prior) setDraft(prior);
    } catch {
      setError(
        "Browser storage is unavailable. You can still edit and download this draft.",
      );
    }
    setReady(true);
  }, [company.id]);
  useEffect(() => {
    if (!ready) return;
    try {
      persistDraft(draft);
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }, [draft, ready]);
  useEffect(
    () => () => {
      if (currentAudio.current) URL.revokeObjectURL(currentAudio.current);
    },
    [],
  );
  function update(patch: Partial<ProposalDraft>) {
    setDraft((previous) => ({
      ...previous,
      ...patch,
      updatedAt: new Date().toISOString(),
    }));
    setError("");
  }
  function changeAmount(value: string) {
    setAmountText(value);
    const amount = Math.round(Number(value) * 100) / 100;
    if (!Number.isFinite(amount) || amount < 1 || amount > 100000000) return;
    update({
      amount,
      ...(draft.message === proposalMessage(draft.amount)
        ? { message: proposalMessage(amount) }
        : {}),
      ...(draft.script === openingScript(company.name, draft.amount)
        ? { script: openingScript(company.name, amount) }
        : {}),
    });
  }
  async function voicePreview() {
    setBusy("voice");
    setError("");
    try {
      const response = await fetch("/api/proposals/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: draft.script }),
      });
      if (!response.ok)
        throw new Error(
          (await response.json()).error || "Voice preview unavailable.",
        );
      const blob = await response.blob();
      if (currentAudio.current) URL.revokeObjectURL(currentAudio.current);
      currentAudio.current = URL.createObjectURL(blob);
      setAudioUrl(currentAudio.current);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Voice preview unavailable.");
    } finally {
      setBusy(null);
    }
  }
  async function analyze() {
    setBusy("terms");
    setError("");
    try {
      const response = await fetch("/api/proposals/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: draft.notes, sample: draft.sample }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Term extraction unavailable.");
      update({
        terms: result.terms as ExtractedTerm[],
        sample: result.sample === true,
        step: 2,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Term extraction unavailable.");
    } finally {
      setBusy(null);
    }
  }
  function changeTerm(key: TermKey, value: string) {
    update({
      terms: [
        ...draft.terms.filter((t) => t.key !== key),
        {
          key,
          value,
          quote: draft.terms.find((t) => t.key === key)?.quote || "",
          edited: true,
        },
      ],
    });
  }
  function download() {
    const blob = new Blob([proposalDocument(draft)], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `seed-street-${company.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-discussion-draft.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(proposalDocument(draft));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy. Download the draft instead.");
    }
  }
  const offering = safeOffering(company),
    missing = (
      ["entity", "instrument", "valuation", "capTable", "route"] as TermKey[]
    ).filter(
      (key) => !draft.terms.some((t) => t.key === key && t.value.trim()),
    );
  const paper = (
    <section className="sp-paper" aria-label="Proposal preview">
      <div className="sp-paper-top">
        <span>SEED STREET</span>
        <span>{draft.sample ? "REHEARSAL" : "PRIVATE DRAFT"}</span>
      </div>
      <p className="sp-eyebrow">EXPRESSION OF INTEREST</p>
      <h2>
        A first cheque.
        <br />A conversation.
      </h2>
      <p className="sp-paper-company">For {company.name}</p>
      <div className="sp-paper-amount">
        <span>Proposed investment</span>
        <strong>
          {dollars(draft.amount)}
          <small>USD</small>
        </strong>
      </div>
      <dl>
        <div>
          <dt>Investor</dt>
          <dd>{draft.investorName || "Your name"}</dd>
        </div>
        <div>
          <dt>Instrument</dt>
          <dd>
            {draft.instrument === "Ask the founder"
              ? "Open to discussion"
              : draft.instrument}
          </dd>
        </div>
        <div>
          <dt>Ownership</dt>
          <dd>Terms to discuss</dd>
        </div>
      </dl>
      <p className="sp-paper-note">{draft.message}</p>
      <div className="sp-paper-bottom">
        <span className="sp-paper-dot" />
        Nonbinding · Not sent
      </div>
    </section>
  );
  return (
    <section
      ref={workspaceRef}
      className="sp-workspace"
      aria-label={`Investment proposal for ${company.name}`}
    >
      <div className="sp-topline">
        <button className="fc-text-btn" onClick={onBack}>
          <ArrowLeft size={15} />
          Company
        </button>
        <span>
          {saved ? (
            <>
              <Check size={13} />
              Saved in this browser
            </>
          ) : (
            "Private draft"
          )}
        </span>
      </div>
      <header className="sp-heading">
        <CompanyLogo id={company.id} name={company.name} logo={company.logo} />
        <div>
          <p>{company.name}</p>
          <h1 ref={headingRef} tabIndex={-1}>
            Draft your proposal.
          </h1>
        </div>
        <span className="sp-draft-badge">
          {draft.sample ? "Synthetic rehearsal" : "Investor workspace"}
        </span>
      </header>
      <nav className="sp-steps" aria-label="Proposal steps">
        {steps.map((step, index) => (
          <button
            key={step.name}
            disabled={busy !== null}
            aria-current={draft.step === index ? "step" : undefined}
            className={draft.step === index ? "active" : ""}
            onClick={() => update({ step: index })}
          >
            <span>{index < draft.step ? <Check size={13} /> : index + 1}</span>
            {step.name}
          </button>
        ))}
      </nav>
      {error ? (
        <p className="sp-error" role="alert">
          {error}
        </p>
      ) : null}
      {draft.step === 0 ? (
        <div className="sp-columns">
          <div className="sp-editor">
            <p className="sp-eyebrow">START WITH YOUR TERMS</p>
            <h2>What would you like to invest?</h2>
            <label className="sp-amount-field">
              <span>Investment amount · USD</span>
              <div>
                <span>$</span>
                <input
                  aria-label="Proposed investment amount"
                  type="number"
                  min="1"
                  max="100000000"
                  value={amountText}
                  onBlur={() => {
                    if (
                      !amountText ||
                      Number(amountText) < 1 ||
                      Number(amountText) > 100000000
                    )
                      setAmountText(String(draft.amount));
                  }}
                  onChange={(e) => changeAmount(e.target.value)}
                />
              </div>
            </label>
            <div className="sp-presets">
              {[500, 1000, 2500, 5000].map((amount) => (
                <button
                  key={amount}
                  aria-pressed={draft.amount === amount}
                  onClick={() => changeAmount(String(amount))}
                >
                  {dollars(amount).replace(".00", "")}
                </button>
              ))}
            </div>
            <label className="sp-field">
              <span>Your name</span>
              <input
                value={draft.investorName}
                maxLength={120}
                onChange={(e) => update({ investorName: e.target.value })}
                placeholder="Investor name"
              />
            </label>
            <label className="sp-field">
              <span>Instrument preference</span>
              <select
                value={draft.instrument}
                onChange={(e) =>
                  update({
                    instrument: e.target.value as ProposalDraft["instrument"],
                  })
                }
              >
                {[
                  "Ask the founder",
                  "Post-money SAFE",
                  "Priced equity",
                  "Convertible note",
                ].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className="sp-field">
              <span>Your note to the founder</span>
              <textarea
                value={draft.message}
                maxLength={1600}
                onChange={(e) => update({ message: e.target.value })}
                rows={4}
              />
            </label>
            <p className="sp-muted">
              <ShieldCheck size={15} />A draft of your interest. The company has
              not agreed to terms.
            </p>
            <button
              className="fc-btn primary sp-next"
              onClick={() => update({ step: 1 })}
            >
              Prepare conversation
              <ArrowRight size={17} />
            </button>
          </div>
          <aside>
            {paper}
            <div className="sp-route-note">
              <ArrowUpRight size={17} />
              <div>
                <strong>
                  {offering
                    ? "An offering source is available"
                    : "No eligible offering confirmed"}
                </strong>
                <p>
                  {offering
                    ? "Review current terms and investor eligibility with the original intermediary."
                    : "Ask the founder about their round. A company listing is not an investment offering."}
                </p>
                {offering ? (
                  <a href={offering} target="_blank" rel="noreferrer">
                    Review offering source
                    <ArrowUpRight size={13} />
                  </a>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      ) : null}
      {draft.step === 1 ? (
        <div className="sp-columns">
          <div className="sp-editor">
            <p className="sp-eyebrow">FOUNDER CONVERSATION</p>
            <h2>
              A warm introduction.
              <br />
              The right questions.
            </h2>
            <div className="sp-voice-card">
              <div
                className={`sp-voice-orb ${busy === "voice" ? "working" : ""}`}
              >
                <Headphones size={27} />
              </div>
              <div>
                <strong>Seed Street voice</strong>
                <span>ElevenLabs · AI assistant</span>
              </div>
              <span className="sp-preview-label">Preview only</span>
            </div>
            <label className="sp-field">
              <span>
                Call opening <small>Editable</small>
              </span>
              <textarea
                value={draft.script}
                maxLength={1800}
                rows={8}
                disabled={busy === "voice"}
                onChange={(e) => {
                  update({ script: e.target.value });
                  setAudioUrl("");
                  if (currentAudio.current) {
                    URL.revokeObjectURL(currentAudio.current);
                    currentAudio.current = "";
                  }
                }}
              />
            </label>
            <button
              className="fc-btn secondary"
              onClick={voicePreview}
              disabled={busy !== null || draft.script.trim().length < 10}
            >
              {busy === "voice" ? (
                <LoaderCircle className="spin" size={16} />
              ) : (
                <Play size={16} />
              )}{" "}
              {busy === "voice"
                ? "Creating voice…"
                : audioUrl
                  ? "Regenerate voice"
                  : "Generate voice preview"}
            </button>
            {audioUrl ? (
              <audio
                ref={audioRef}
                className="sp-audio"
                aria-label="ElevenLabs call opening preview"
                controls
                src={audioUrl}
              />
            ) : null}
            <p className="sp-muted">
              <Phone size={14} />
              No call placed. Live outreach needs founder consent and an
              approved investment route.
            </p>
            <details className="sp-details">
              <summary>
                What the agent will ask
                <ChevronDown size={15} />
              </summary>
              {questions.map((q) => (
                <div className="sp-question" key={q.title}>
                  <q.icon size={17} />
                  <div>
                    <strong>{q.title}</strong>
                    <p>{q.detail}</p>
                  </div>
                </div>
              ))}
            </details>
          </div>
          <aside className="sp-notes">
            <div className="sp-notes-head">
              <MessageSquare size={20} />
              <h2>Conversation notes</h2>
            </div>
            <p>Add a transcript or notes after speaking with the founder.</p>
            <div className="sp-notes-actions">
              <button
                className="fc-text-btn"
                disabled={busy !== null}
                onClick={() =>
                  update({
                    notes: SAMPLE_CONVERSATION,
                    sample: true,
                    terms: [],
                  })
                }
              >
                <Sparkles size={14} />
                Try a fictional example
              </button>
              {draft.notes ? (
                <button
                  className="fc-text-btn"
                  disabled={busy !== null}
                  onClick={() =>
                    update({ notes: "", sample: false, terms: [] })
                  }
                >
                  Clear
                </button>
              ) : null}
            </div>
            {draft.sample ? (
              <span className="sp-sample-label">
                Synthetic rehearsal · Not founder statements
              </span>
            ) : null}
            <label className="sp-field">
              <span>Transcript or notes</span>
              <textarea
                value={draft.notes}
                maxLength={14000}
                disabled={busy !== null}
                onChange={(e) =>
                  update({
                    notes: e.target.value,
                    sample: draft.sample || isSyntheticNotes(e.target.value),
                    terms: [],
                  })
                }
                placeholder="Founder: We're raising on a SAFE…"
                rows={14}
              />
            </label>
            <button
              className="fc-btn primary sp-next"
              disabled={busy !== null || draft.notes.trim().length < 30}
              onClick={analyze}
            >
              {busy === "terms" ? (
                <LoaderCircle className="spin" size={17} />
              ) : (
                <Sparkles size={17} />
              )}{" "}
              {busy === "terms"
                ? "Reading the conversation…"
                : "Extract proposed terms"}
              <ArrowRight size={17} />
            </button>
            <small className="sp-data-note">
              Notes go to Nicrron for extraction. PRISM receives operation
              metadata; note text and deal amounts are redacted.
            </small>
            <button
              className="fc-text-btn sp-manual"
              disabled={busy !== null}
              onClick={() => update({ step: 2 })}
            >
              Enter terms manually
              <ArrowRight size={14} />
            </button>
          </aside>
        </div>
      ) : null}
      {draft.step === 2 ? (
        <div className="sp-terms">
          <div className="sp-section-head">
            <div>
              <p className="sp-eyebrow">PROPOSED, NOT AGREED</p>
              <h2>Make the terms clear.</h2>
              <p>Review each passage. Fill the gaps or edit the draft.</p>
            </div>
            <span className="sp-draft-badge">
              {draft.sample
                ? "Fictional terms"
                : "Unverified conversation notes"}
            </span>
          </div>
          <div className="sp-terms-grid">
            {(Object.keys(TERM_LABELS) as TermKey[]).map((key) => {
              const term = draft.terms.find((t) => t.key === key);
              return (
                <div className="sp-term-card" key={key}>
                  <label className="sp-field">
                    <span>
                      {TERM_LABELS[key]}
                      <small>
                        {term?.edited
                          ? "Your edit"
                          : term?.quote
                            ? "From notes"
                            : "Open question"}
                      </small>
                    </span>
                    <textarea
                      rows={3}
                      value={term?.value || ""}
                      maxLength={700}
                      placeholder="To be confirmed"
                      onChange={(e) => changeTerm(key, e.target.value)}
                    />
                  </label>
                  {term?.quote ? (
                    <details>
                      <summary>
                        Passage from notes
                        <ChevronDown size={12} />
                      </summary>
                      <blockquote>{term.quote}</blockquote>
                    </details>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="sp-safe-note">
            <Layers3 size={20} />
            <p>
              <strong>A SAFE is not shares today.</strong> A check size alone
              does not determine ownership. Confirm the valuation basis,
              conversion terms, cap table and future dilution.
            </p>
          </div>
          <div className="sp-bottom-actions">
            <button
              className="fc-btn secondary"
              onClick={() => update({ step: 1 })}
            >
              <ArrowLeft size={16} />
              Conversation
            </button>
            <button
              className="fc-btn primary"
              onClick={() => update({ step: 3 })}
            >
              Prepare discussion draft
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      ) : null}
      {draft.step === 3 ? (
        <div className="sp-columns sp-review-columns">
          <div>
            <div className="sp-section-head">
              <div>
                <p className="sp-eyebrow">READY FOR YOUR REVIEW</p>
                <h2>A draft. Then a proper closing.</h2>
              </div>
            </div>
            <div className="sp-review-card">
              <FileText size={26} />
              <div>
                <strong>Investment discussion draft</strong>
                <p>
                  {company.name} · {dollars(draft.amount)} · USD
                </p>
                <span>
                  {draft.sample
                    ? "Synthetic rehearsal"
                    : "Nonbinding · Unsigned"}
                </span>
              </div>
            </div>
            <div className="sp-closing-steps">
              <div>
                <span className="done">
                  <Check size={14} />
                </span>
                <section>
                  <strong>Review your draft</strong>
                  <p>Confirm the proposed amount and each conversation term.</p>
                </section>
              </div>
              <div>
                <span>2</span>
                <section>
                  <strong>Resolve the open questions</strong>
                  <p>
                    {missing.length
                      ? `${missing.length} key ${missing.length === 1 ? "field still needs" : "fields still need"} confirmation: ${missing.map((key) => TERM_LABELS[key].toLowerCase()).join(", ")}.`
                      : "Check the original notes and confirm all terms directly with the issuer."}
                  </p>
                </section>
              </div>
              <div>
                <span>3</span>
                <section>
                  <strong>Legal review & eligible offering</strong>
                  <p>
                    Confirm the issuer, exemption, investor eligibility,
                    disclosures and approvals with securities counsel or the
                    registered intermediary.
                  </p>
                </section>
              </div>
              <div>
                <span>4</span>
                <section>
                  <strong>Sign definitive documents</strong>
                  <p>
                    The approved closing process handles both signatures and
                    payment. A verbal yes does not complete the investment.
                  </p>
                </section>
              </div>
            </div>
            <div className="sp-bottom-actions">
              <button className="fc-btn primary" onClick={download}>
                <Download size={16} />
                Download discussion draft
              </button>
              <button className="fc-btn secondary" onClick={copy}>
                {copied ? <Check size={16} /> : <Clipboard size={16} />}{" "}
                {copied ? "Copied" : "Copy draft"}
              </button>
            </div>
            {offering ? (
              <a
                className="fc-btn secondary sp-offering-link"
                href={offering}
                target="_blank"
                rel="noreferrer"
              >
                Continue at offering source
                <ArrowUpRight size={16} />
              </a>
            ) : null}
            <details className="sp-details sp-legal">
              <summary>
                U.S. investment routes
                <ChevronDown size={15} />
              </summary>
              <p>
                For everyday investors, eligible Regulation Crowdfunding
                offerings run through a registered intermediary. A direct
                private round requires an applicable exemption and
                issuer-specific eligibility checks. Seed Street’s role in
                solicitation or negotiation also needs legal review.
              </p>
              <a
                href="https://www.sec.gov/resources-small-businesses/small-business-compliance-guides/regulation-crowdfunding-guidance-issuers"
                target="_blank"
                rel="noreferrer"
              >
                SEC · Regulation Crowdfunding
                <ArrowUpRight size={12} />
              </a>
              <a
                href="https://www.sec.gov/about/divisions-offices/division-trading-markets/division-trading-markets-compliance-guides/guide-broker-dealer-registration"
                target="_blank"
                rel="noreferrer"
              >
                SEC · Broker registration
                <ArrowUpRight size={12} />
              </a>
            </details>
          </div>
          <aside className="sp-contract-preview">
            <div className="sp-contract-title">
              <span>DISCUSSION DRAFT</span>
              <span>{draft.sample ? "SYNTHETIC" : "NOT FOR SIGNATURE"}</span>
            </div>
            <pre>{proposalDocument(draft)}</pre>
            <div className="sp-signatures">
              <div>
                <span>Investor</span>
                <strong>Pending legal review</strong>
              </div>
              <div>
                <span>Issuer representative</span>
                <strong>Pending legal review</strong>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
      <footer className="sp-footer">
        <span>
          <ShieldCheck size={13} />
          Stored in this browser · No money moved
        </span>
      </footer>
    </section>
  );
}

export function ProposalLibrary({
  companies,
  onOpen,
  onDiscover,
}: {
  companies: DiscoveryCompany[];
  onOpen: (company: DiscoveryCompany) => void;
  onDiscover: () => void;
}) {
  const [drafts, setDrafts] = useState<ProposalDraft[]>([]);
  useEffect(() => {
    const refresh = () => {
      try {
        setDrafts(hydrateProposals(localStorage.getItem(PROPOSAL_STORAGE_KEY)));
      } catch {
        setDrafts([]);
      }
    };
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("seed-street-proposals", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("seed-street-proposals", refresh);
    };
  }, []);
  return (
    <div className="sp-library">
      <p className="sp-library-intro">
        Your investment conversations, from first interest to a draft for
        review.
      </p>
      {drafts.length ? (
        <div className="sp-library-grid">
          {drafts.map((draft) => {
            const company = companies.find((c) => c.id === draft.companyId);
            return (
              <article key={draft.id}>
                <header>
                  {company ? (
                    <CompanyLogo
                      id={company.id}
                      name={company.name}
                      logo={company.logo}
                    />
                  ) : (
                    <FileText size={24} />
                  )}
                  <span>
                    {draft.sample ? "Synthetic rehearsal" : "Private draft"}
                  </span>
                </header>
                <h2>{draft.companyName}</h2>
                <strong className="sp-library-amount">
                  {dollars(draft.amount)}
                </strong>
                <p>
                  {steps[draft.step].name} ·{" "}
                  {new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "numeric",
                  }).format(new Date(draft.updatedAt))}
                </p>
                {company ? (
                  <button
                    className="fc-btn secondary"
                    onClick={() => onOpen(company)}
                  >
                    Continue draft
                    <ArrowRight size={15} />
                  </button>
                ) : (
                  <small>
                    Company is not currently available in the catalog.
                  </small>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="fc-empty-state">
          <FileText size={32} />
          <h2>Your first cheque starts with a conversation.</h2>
          <p>Open a company and choose Draft proposal.</p>
          <button className="fc-btn primary" onClick={onDiscover}>
            Explore companies
            <ArrowRight size={16} />
          </button>
        </div>
      )}
      <p className="sp-muted">
        <ShieldCheck size={15} />
        Drafts stay in this browser. Creating one does not send an offer.
      </p>
    </div>
  );
}

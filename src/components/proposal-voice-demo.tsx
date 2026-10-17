"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Headphones,
  LoaderCircle,
  Play,
  FileText,
} from "lucide-react";
import { proposalDemo } from "@/lib/proposal-demo";
import type { CallPurpose } from "@/lib/proposal-calls";
import type { ProposalDraft, ExtractedTerm } from "@/lib/proposals";
export function ProposalVoiceDemo({
  draft,
  purpose,
  onUpdate,
}: {
  draft: ProposalDraft;
  purpose: CallPurpose;
  onUpdate: (patch: Partial<ProposalDraft>) => void;
}) {
  const [stage, setStage] = useState<"idle" | "loading" | "playing" | "ready">(
      "idle",
    ),
    [audioUrl, setAudioUrl] = useState(""),
    [terms, setTerms] = useState<ExtractedTerm[] | null>(null),
    [notes, setNotes] = useState(""),
    [error, setError] = useState("");
  const audio = useRef<HTMLAudioElement>(null),
    currentUrl = useRef(""),
    finished = useRef(false);
  useEffect(
    () => () => {
      if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
    },
    [],
  );
  useEffect(() => {
    if (audioUrl) audio.current?.play().catch(() => setStage("ready"));
  }, [audioUrl]);
  function finish() {
    if (!terms || finished.current) return;
    finished.current = true;
    audio.current?.pause();
    onUpdate({ notes, terms, sample: true, call: undefined, step: 3 });
  }
  async function start() {
    setStage("loading");
    setError("");
    finished.current = false;
    const demo = proposalDemo(draft, purpose);
    setNotes(demo.notes);
    const results = await Promise.allSettled([
      fetch("/api/proposals/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: demo.speech, sample: true }),
      }).then(async (r) => {
        if (!r.ok)
          throw Error(
            "Voice preview is unavailable. You can still prepare the draft.",
          );
        return r.blob();
      }),
      fetch("/api/proposals/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: demo.notes, sample: true }),
      }).then(async (r) => {
        const data = await r.json();
        if (!r.ok)
          throw Error(
            data.error || "Could not prepare the draft. Please retry.",
          );
        return data.terms as ExtractedTerm[];
      }),
    ]);
    const analysis = results[1];
    if (analysis.status === "fulfilled") setTerms(analysis.value);
    else {
      setError(
        analysis.reason instanceof Error
          ? analysis.reason.message
          : "Could not prepare the draft.",
      );
      setStage("idle");
      return;
    }
    const voice = results[0];
    if (voice.status === "fulfilled") {
      if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
      currentUrl.current = URL.createObjectURL(voice.value);
      setAudioUrl(currentUrl.current);
      setStage("playing");
    } else {
      setError("Voice preview unavailable. Your draft is ready below.");
      setStage("ready");
    }
  }
  return (
    <section className="sp-voice-demo" aria-label="Guided voice demo">
      <div className="sp-demo-title">
        <Headphones size={22} />
        <div>
          <strong>A 30-second walkthrough</strong>
          <small>
            Fictional founder answers · Real ElevenLabs voice and AI extraction
          </small>
        </div>
        <span className="sp-draft-badge">DEMO</span>
      </div>
      {stage === "idle" ? (
        <button className="fc-btn primary" onClick={start}>
          <Play size={16} />
          Start voice demo
        </button>
      ) : null}
      {stage !== "idle" ? (
        <div className="sp-demo-tasks" role="status">
          <div>
            {stage === "loading" ? (
              <LoaderCircle className="spin" size={15} />
            ) : (
              <Check size={15} />
            )}
            Generate ElevenLabs voice
          </div>
          <div>
            {terms ? (
              <Check size={15} />
            ) : (
              <LoaderCircle className="spin" size={15} />
            )}
            Extract terms with Nicrron
          </div>
          <div>
            <FileText size={15} />
            Prepare unsigned contract
          </div>
        </div>
      ) : null}
      {audioUrl ? (
        <audio
          ref={audio}
          controls
          src={audioUrl}
          onEnded={finish}
          aria-label="Fictional founder conversation demo"
        />
      ) : null}
      {terms ? (
        <>
          <div className="sp-demo-facts">
            <div>
              <small>Fictional ARR</small>
              <strong>$180K</strong>
            </div>
            <div>
              <small>Paying customers</small>
              <strong>6</strong>
            </div>
            <div>
              <small>Active pilots</small>
              <strong>3</strong>
            </div>
            <div>
              <small>Proposed round</small>
              <strong>SAFE</strong>
            </div>
          </div>
          <button className="fc-btn secondary" onClick={finish}>
            {stage === "playing" ? "Skip to contract" : "Review contract"}
            <ArrowRight size={16} />
          </button>
        </>
      ) : null}
      {error ? (
        <p className="sp-call-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

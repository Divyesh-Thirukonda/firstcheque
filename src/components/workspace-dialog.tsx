"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export function WorkspaceDialog({ title, subtitle, onClose, children, wide = false }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      const overlays = document.querySelectorAll(".fc-overlay");
      if (overlays[overlays.length - 1] !== ref.current?.parentElement) return;
      if (event.key === "Escape") close.current();
      if (event.key !== "Tab") return;
      const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select,textarea,[tabindex="0"]') || []).filter(item => item.offsetParent !== null);
      if (!items.length) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === items[0] || document.activeElement === ref.current)) { event.preventDefault(); items[items.length - 1].focus(); }
      if (!event.shiftKey && document.activeElement === items[items.length - 1]) { event.preventDefault(); items[0].focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", keydown); previous?.focus(); };
  }, []);
  return <div className="fc-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><div className={`fc-dialog ${wide ? "fc-dialog-wide" : ""}`} role="dialog" aria-modal="true" aria-label={title} ref={ref} tabIndex={-1}><div className="fc-dialog-heading"><div><h2>{title}</h2>{subtitle ? <p>{subtitle}</p> : null}</div><button className="fc-icon-btn" onClick={onClose} aria-label={`Close ${title}`}><X size={19}/></button></div>{children}</div></div>;
}

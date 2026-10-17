"use client";

import { useState } from "react";
import { COMPANY_LOGOS } from "@/lib/company-logos";

export function CompanyLogo({ id, name, large = false }: { id: string; name: string; large?: boolean }) {
  const src = COMPANY_LOGOS[id];
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const initials = name.replace(/\b(?:LLC|Inc|The)\b/gi, "").trim().split(/\s+/).slice(0, 2).map(word => word[0]).join("").toUpperCase() || name[0];
  return <span className={`fc-company-logo ${large ? "large" : ""}`} aria-hidden="true">
    {src && src !== failedSource ? <img src={src} alt="" width={large ? 72 : 48} height={large ? 72 : 48} loading="lazy" decoding="async" onError={() => setFailedSource(src)}/> : <span>{initials}</span>}
  </span>;
}

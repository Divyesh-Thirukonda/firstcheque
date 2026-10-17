"use client";

import { Building2 } from "lucide-react";
import type { CompanyLogoInfo } from "@/lib/company-profile-types";
import { useState } from "react";
import { COMPANY_LOGOS } from "@/lib/company-logos";

export function CompanyLogo({ id, name, large = false, logo }: { id: string; name: string; large?: boolean; logo?:CompanyLogoInfo }) {
  const src = logo?.status === "fetched" && logo.url ? logo.url : COMPANY_LOGOS[id];
  const [failedSource, setFailedSource] = useState<string | null>(null);
  return <span className={`fc-company-logo ${large ? "large" : ""}`} aria-hidden="true" style={{background:logo?.background}} title={logo?.status==="fetched"?`${name} · company website icon`:"Company logo unavailable"}>
    {src && src !== failedSource ? <img src={src} alt="" width={large ? 72 : 48} height={large ? 72 : 48} loading="lazy" decoding="async" onError={() => setFailedSource(src)}/> : <Building2 size={large ? 28 : 20}/>}
  </span>;
}

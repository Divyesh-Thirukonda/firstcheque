import { OFFERING_SEEDS } from "./offering-seeds";

/** Preserve the source-checked business description when a partial memo has only process boilerplate. */
export function companyDescription(company: { id: string; description: string }) {
  const generic = /public source evidence is retained|review source dates|research retained in this session/i.test(company.description);
  return (generic ? OFFERING_SEEDS.find(seed => seed.id === company.id)?.description : company.description)?.trim() || "Open this company to explore its business and available research.";
}

const TAGLINES: Record<string, string> = {
  "wefunder-bito": "AI tooling for software engineering teams.",
  "wefunder-riecomp": "Data compression for enterprise and AI workloads.",
  "wefunder-namecoach": "Name pronunciation software for organizations.",
  "wefunder-riserobotics": "Electric motion control for heavy machinery.",
  "wefunder-lppfusion": "Developing hydrogen-boron fusion energy.",
  "wefunder-emissionfreegenerators": "Portable, hydrogen-powered generators.",
  "republic-miso-robotics": "Kitchen robots and software for restaurants.",
  "republic-tradefunded": "Trader evaluation and trading technology.",
  "republic-xprize": "A film project from OPTIMISTIC PRODUCTIONS.",
  "wefunder-canopii": "Robotic greenhouses for local farming.",
};

/** Shortened from the source-checked catalog descriptions; no new business claims. */
export function companyTagline(company: { id: string; description: string }) {
  return TAGLINES[company.id] || companyDescription(company);
}

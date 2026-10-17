import { lookup as lookupDns } from "node:dns/promises";
import { isIP, type LookupFunction } from "node:net";
import { request as requestHttps } from "node:https";
import { request as requestHttp } from "node:http";
import { brotliDecompressSync, gunzipSync, inflateSync } from "node:zlib";
import { load } from "cheerio";

export class PublicFetchError extends Error {
  constructor(message: string) { super(message); this.name = "PublicFetchError"; }
}
type Address = { address: string; family: number };
export type PublicResolver = (hostname: string) => Promise<Address[]>;
const MAX_BYTES = 600_000;

export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    const octets = address.split(".").map(Number);
    const value = octets.reduce((sum, part) => ((sum << 8) | part) >>> 0, 0);
    const denied: [number[], number][] = [
      [[0, 0, 0, 0], 8], [[10, 0, 0, 0], 8], [[100, 64, 0, 0], 10], [[127, 0, 0, 0], 8],
      [[169, 254, 0, 0], 16], [[172, 16, 0, 0], 12], [[192, 0, 0, 0], 24], [[192, 0, 2, 0], 24],
      [[192, 88, 99, 0], 24], [[192, 168, 0, 0], 16], [[198, 18, 0, 0], 15], [[198, 51, 100, 0], 24],
      [[203, 0, 113, 0], 24], [[224, 0, 0, 0], 4], [[240, 0, 0, 0], 4],
    ];
    return !denied.some(([prefix, bits]) => {
      const base = prefix.reduce((sum, part) => ((sum << 8) | part) >>> 0, 0);
      const mask = (0xffffffff << (32 - bits)) >>> 0;
      return (value & mask) >>> 0 === (base & mask) >>> 0;
    });
  }
  if (family === 6) {
    const lower = address.toLowerCase();
    const first = parseInt(lower.split(":")[0] || "0", 16);
    // Public global-unicast only. This excludes loopback, ULA, link-local,
    // IPv4-mapped addresses and multicast; reject transition/doc ranges too.
    if (first < 0x2000 || first > 0x3fff) return false;
    const second = parseInt(lower.split(":")[1] || "0", 16);
    if (first === 0x2001 && (second <= 0x1ff || second === 0xdb8)) return false;
    if (/^2002:|^3fff:/i.test(lower)) return false;
    return true;
  }
  return false;
}

export function normalizePublicUrl(input: string, base?: string): URL {
  if (input.length > 2048 || /[\u0000-\u001f\u007f]/.test(input)) throw new PublicFetchError("Invalid public URL.");
  let url: URL;
  try { url = new URL(input, base); } catch { throw new PublicFetchError("Enter a complete company URL including https://."); }
  if (!["https:", "http:"].includes(url.protocol)) throw new PublicFetchError("Only public HTTP(S) pages can be researched.");
  if (url.username || url.password) throw new PublicFetchError("URLs containing credentials are not allowed.");
  if (url.port && !["80", "443"].includes(url.port)) throw new PublicFetchError("Custom network ports are not allowed.");
  const hostname = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
  if (!hostname || hostname === "localhost" || /(?:^|\.)(?:localhost|local|internal|lan|test|invalid|onion)$/.test(hostname) || (!isIP(hostname) && !hostname.includes("."))) throw new PublicFetchError("A public internet hostname is required.");
  if (isIP(hostname) && !isPublicAddress(hostname)) throw new PublicFetchError("Private and reserved network addresses are blocked.");
  if (!isIP(hostname)) url.hostname = hostname; // Canonicalize trailing-dot hosts before policy matching.
  url.hash = "";
  return url;
}

const defaultResolver: PublicResolver = (hostname) => lookupDns(hostname, { all: true, verbatim: true });
export async function resolvePublicTarget(input: string, options: { base?: string; resolver?: PublicResolver; timeoutMs?: number } = {}): Promise<{ url: URL; address: Address }> {
  const url = normalizePublicUrl(input, options.base);
  if (options.timeoutMs !== undefined && options.timeoutMs <= 0) throw new PublicFetchError("Source deadline reached before DNS lookup.");
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const addresses = isIP(hostname) ? [{ address: hostname, family: isIP(hostname) }] : await Promise.race([
      (options.resolver || defaultResolver)(hostname),
      new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new PublicFetchError("DNS lookup timed out.")), Math.min(4000, options.timeoutMs || 4000)); }),
    ]);
    if (!addresses.length || addresses.some((record) => !isPublicAddress(record.address))) throw new PublicFetchError("The hostname resolves to a private or reserved address.");
    return { url, address: addresses.find((record) => record.family === 4) || addresses[0] };
  } finally { if (timeout) clearTimeout(timeout); }
}

/** Never performs a second DNS lookup: the socket is pinned to the validated IP. */
export function pinnedLookup(address: Address): LookupFunction {
  return (_hostname, _options, callback) => callback(null, address.address, address.family);
}

async function requestPinned(url: URL, address: Address, timeoutMs: number, maxBytes = MAX_BYTES, accept = "text/html,text/plain,application/xhtml+xml,application/xml;q=0.8"): Promise<{ status: number; headers: Record<string, string | string[] | undefined>; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const requestOptions = {
      method: "GET", lookup: pinnedLookup(address), autoSelectFamily: false,
      headers: { "User-Agent": "FirstChequeResearch/1.0 (public evidence research)", Accept: accept, "Accept-Encoding": "identity" },
    };
    const request = (url.protocol === "https:" ? requestHttps : requestHttp)(url, requestOptions, (response) => {
      if (Number(response.headers["content-length"] || 0) > maxBytes) { response.destroy(); reject(new PublicFetchError("Source exceeds the research size limit.")); return; }
      const chunks: Buffer[] = []; let total = 0;
      response.on("data", (chunk: Buffer) => {
        total += chunk.length;
        if (total > maxBytes) { response.destroy(new PublicFetchError("Source exceeds the research size limit.")); return; }
        chunks.push(chunk);
      });
      response.on("error", reject);
      response.on("end", () => resolve({ status: response.statusCode || 0, headers: response.headers, body: Buffer.concat(chunks) }));
    });
    request.setTimeout(timeoutMs, () => request.destroy(new PublicFetchError("Source request timed out.")));
    const overall = setTimeout(() => request.destroy(new PublicFetchError("Source request deadline reached.")), timeoutMs);
    request.once("close", () => clearTimeout(overall));
    request.on("error", reject); request.end();
  });
}

export function readablePage(html: string, contentType: string): { title: string; text: string; publishedAt: string | null; links: string[] } {
  const decode = (text: string) => text.replace(/&#(x[\da-f]+|\d+);/gi, (_all, value: string) => {
    const code = value[0].toLowerCase() === "x" ? parseInt(value.slice(1), 16) : parseInt(value, 10);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : " ";
  }).replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_all, key: string) => ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " })[key] || " ");
  const title = decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "Public source").replace(/\s+/g, " ").trim().slice(0, 200);
  let date = html.match(/datePublished["']?\s*:\s*["']([^"']+)["']/i)?.[1] || null;
  for (const meta of html.matchAll(/<meta\b[^>]*>/gi)) {
    if (/(?:article:published_time|datePublished|pubdate)/i.test(meta[0])) date = meta[0].match(/content\s*=\s*["']([^"']+)["']/i)?.[1] || date;
  }
  const parsedDate = date ? Date.parse(date) : NaN;
  let readable = html;
  let links: string[] = [];
  if (contentType.includes("html")) {
    const $ = load(html);
    links = [...new Set($("a[href]").toArray().map((element) => $(element).attr("href") || "").filter((href) => href.length <= 2048))].slice(0, 200);
    $("script,style,noscript,iframe,svg,nav,footer,form").remove();
    $("p,div,li,h1,h2,h3,h4,section,article,br,tr").append(" ");
    const main = $("main").first().text(), article = $("article").first().text();
    readable = main.trim().length >= 120 ? main : article.trim().length >= 120 ? article : $("body").text();
  }
  const text = decode(readable)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return { title, text: text.slice(0, 16000), publishedAt: Number.isFinite(parsedDate) ? new Date(parsedDate).toISOString() : null, links };
}

async function fetchPageAfterRobots(input: string, options: { timeoutMs?: number; resolver?: PublicResolver } = {}): Promise<{ url: string; title: string; text: string; publishedAt: string | null; links: string[] }> {
  const deadline = Date.now() + (options.timeoutMs || 10000);
  let next = input;
  for (let hop = 0; hop <= 3; hop++) {
    const target = await resolvePublicTarget(next, { resolver: options.resolver, timeoutMs: deadline - Date.now() });
    const remaining = deadline - Date.now();
    if (remaining < 1) throw new PublicFetchError("Source deadline reached.");
    const response = await requestPinned(target.url, target.address, remaining);
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.location;
      if (!location || Array.isArray(location) || hop === 3) throw new PublicFetchError("Source redirect limit reached.");
      next = normalizePublicUrl(location, target.url.href).href;
      await assertRobotsAllowed(next, options.resolver, deadline);
      continue; // The next hop is independently resolved, checked and socket-pinned.
    }
    if (response.status < 200 || response.status >= 300) throw new PublicFetchError(`Source returned HTTP ${response.status}.`);
    const contentType = String(response.headers["content-type"] || "").toLowerCase();
    if (!/^(?:text\/(?:html|plain|xml)|application\/(?:xhtml\+xml|xml|rss\+xml|json))\b/.test(contentType)) throw new PublicFetchError("Unsupported source format; HTML or text is required.");
    const encoding = String(response.headers["content-encoding"] || "identity");
    let body = response.body;
    try {
      if (encoding === "gzip") body = gunzipSync(body, { maxOutputLength: MAX_BYTES });
      else if (encoding === "br") body = brotliDecompressSync(body, { maxOutputLength: MAX_BYTES });
      else if (encoding === "deflate") body = inflateSync(body, { maxOutputLength: MAX_BYTES });
      else if (encoding !== "identity") throw new Error("Unsupported compression");
    } catch { throw new PublicFetchError("Source compression or size is unsupported."); }
    const page = readablePage(body.toString("utf8"), contentType);
    if (page.text.length < 120) throw new PublicFetchError("Source contained insufficient readable text.");
    return { url: target.url.href, ...page };
  }
  throw new PublicFetchError("Source redirect limit reached.");
}

const robotsCache = new Map<string, { text: string; expires: number }>();
const prohibitedPlatforms = ["republic.com", "republic.co", "wefunder.com"];

export function robotsAllows(text: string, path: string, userAgent = "FirstChequeResearch"): boolean {
  const groups: { agents: string[]; rules: { allow: boolean; value: string }[] }[] = [];
  let current: typeof groups[number] = { agents: [], rules: [] };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const split = line.indexOf(":"); if (split < 0) continue;
    const field = line.slice(0, split).trim().toLowerCase(), value = line.slice(split + 1).trim();
    if (field === "user-agent") {
      if (current.rules.length) { groups.push(current); current = { agents: [], rules: [] }; }
      current.agents.push(value.toLowerCase());
    } else if ((field === "allow" || field === "disallow") && current.agents.length && value) current.rules.push({ allow: field === "allow", value });
  }
  groups.push(current);
  const specific = groups.filter((group) => group.agents.some((agent) => agent !== "*" && userAgent.toLowerCase().includes(agent)));
  const applicable = specific.length ? specific : groups.filter((group) => group.agents.includes("*"));
  const decodedPath = (() => { try { return decodeURIComponent(path); } catch { return path; } })();
  const matching = applicable.flatMap((group) => group.rules).filter((rule) => {
    const anchored = rule.value.endsWith("$");
    const value = (anchored ? rule.value.slice(0, -1) : rule.value).split("*").map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*");
    const pattern = new RegExp(`^${value}${anchored ? "$" : ""}`);
    return pattern.test(path) || pattern.test(decodedPath);
  }).sort((a, b) => b.value.replaceAll("*", "").length - a.value.replaceAll("*", "").length || Number(b.allow) - Number(a.allow));
  return matching[0]?.allow ?? true;
}

async function assertRobotsAllowed(input: string, resolver?: PublicResolver, deadline = Date.now() + 10000): Promise<void> {
  const url = normalizePublicUrl(input), host = url.hostname.toLowerCase();
  if (prohibitedPlatforms.some((domain) => host === domain || host.endsWith(`.${domain}`))) throw new PublicFetchError("This offering platform restricts automated page collection; direct fetching is disabled.");
  let cached = robotsCache.get(url.origin);
  if (!cached || cached.expires < Date.now()) {
    let next = `${url.origin}/robots.txt`;
    let text: string | null = null;
    for (let hop = 0; hop < 3; hop++) {
      const target = await resolvePublicTarget(next, { resolver, timeoutMs: deadline - Date.now() });
      const remaining = Math.min(3500, deadline - Date.now());
      if (remaining <= 0) throw new PublicFetchError("Source deadline reached while checking robots policy.");
      const response = await requestPinned(target.url, target.address, remaining);
      if ([301, 302, 303, 307, 308].includes(response.status) && typeof response.headers.location === "string") { next = normalizePublicUrl(response.headers.location, target.url.href).href; continue; }
      if ([404, 410].includes(response.status)) { text = ""; break; }
      if (response.status < 200 || response.status >= 300) throw new PublicFetchError(`Robots policy could not be verified (HTTP ${response.status}); page not fetched.`);
      let body = response.body;
      const encoding = String(response.headers["content-encoding"] || "identity");
      try {
        if (encoding === "gzip") body = gunzipSync(body, { maxOutputLength: 64000 });
        else if (encoding === "br") body = brotliDecompressSync(body, { maxOutputLength: 64000 });
        else if (encoding === "deflate") body = inflateSync(body, { maxOutputLength: 64000 });
        else if (encoding !== "identity") throw new Error("Unsupported encoding");
      } catch { throw new PublicFetchError("Robots policy could not be safely read; page not fetched."); }
      if (body.length > 64000) throw new PublicFetchError("Robots policy exceeds the safety limit; page not fetched.");
      text = body.toString("utf8"); break;
    }
    if (text === null) throw new PublicFetchError("Robots policy redirect limit reached; page not fetched.");
    cached = { text, expires: Date.now() + 300000 }; robotsCache.set(url.origin, cached);
    if (robotsCache.size > 300) for (const [key, entry] of robotsCache) if (entry.expires < Date.now()) robotsCache.delete(key);
  }
  if (!robotsAllows(cached.text, `${url.pathname}${url.search}`)) throw new PublicFetchError("This page disallows automated access in robots.txt; it was not fetched.");
}

export async function fetchPublicPage(input: string, options: { timeoutMs?: number; resolver?: PublicResolver } = {}): Promise<{ url: string; title: string; text: string; publishedAt: string | null; links: string[] }> {
  const started = Date.now();
  await assertRobotsAllowed(input, options.resolver, started + (options.timeoutMs || 12000));
  const remaining = (options.timeoutMs || 12000) - (Date.now() - started);
  if (remaining < 1) throw new PublicFetchError("Source deadline reached after robots check.");
  return fetchPageAfterRobots(input, { ...options, timeoutMs: remaining });
}

/** Bounded public bytes for website identity assets. Same robots, DNS and redirect policy as research. */
export async function fetchPublicResource(input: string, options: {timeoutMs?:number;maxBytes?:number;accept?:string} = {}) {
  const deadline=Date.now()+(options.timeoutMs||12000), maxBytes=Math.min(options.maxBytes||600000,2500000);
  let next=normalizePublicUrl(input).href;
  for(let hop=0;hop<=3;hop++){
    await assertRobotsAllowed(next,undefined,deadline);
    const target=await resolvePublicTarget(next,{timeoutMs:deadline-Date.now()});
    const response=await requestPinned(target.url,target.address,Math.max(1,deadline-Date.now()),maxBytes,options.accept||"*/*");
    if([301,302,303,307,308].includes(response.status)){
      if(typeof response.headers.location!=="string"||hop===3)throw new PublicFetchError("Asset redirect limit reached.");
      next=normalizePublicUrl(response.headers.location,target.url.href).href;continue;
    }
    if(response.status<200||response.status>=300)throw new PublicFetchError(`Source returned HTTP ${response.status}.`);
    let body=response.body;const encoding=String(response.headers["content-encoding"]||"identity");
    try{
      if(encoding==="gzip")body=gunzipSync(body,{maxOutputLength:maxBytes});
      else if(encoding==="br")body=brotliDecompressSync(body,{maxOutputLength:maxBytes});
      else if(encoding==="deflate")body=inflateSync(body,{maxOutputLength:maxBytes});
      else if(encoding!=="identity")throw new Error("Unsupported encoding");
    }catch{throw new PublicFetchError("Asset compression or size is unsupported.");}
    return {url:target.url.href,body,contentType:String(response.headers["content-type"]||"").toLowerCase()};
  }
  throw new PublicFetchError("Asset redirect limit reached.");
}

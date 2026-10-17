import { createHash } from "node:crypto";
import { load } from "cheerio";
import sharp from "sharp";
import { fetchPublicResource, normalizePublicUrl } from "./safe-fetch";
import type { CompanyLogoInfo } from "./company-profile-types";

export function websiteIconCandidates(
  html: string,
  website: string,
  companyName?: string,
): { url: string; method: "website-icon" | "website-logo" }[] {
  const $ = load(html),
    candidates: {
      url: string;
      method: "website-icon" | "website-logo";
      priority: number;
    }[] = [];
  const add = (
    value: string | undefined,
    method: "website-icon" | "website-logo",
    priority: number,
  ) => {
    try {
      if (value?.startsWith("data:image/") && value.length < 800000) {
        candidates.push({ url: value, method, priority });
        return;
      }
      if (
        value &&
        !/parastorage\.com\/client\/pfavico|wixstatic\.com\/.*wix-favicon|lovable\.dev\/favicon/i.test(
          value,
        )
      )
        candidates.push({
          url: normalizePublicUrl(value, website).href,
          method,
          priority,
        });
    } catch {}
  };
  $("link[href]").each((_, el) => {
    const rel = ($(el).attr("rel") || "").toLowerCase();
    if (/(?:^|\s)(?:icon|apple-touch-icon|shortcut)(?:\s|$)/.test(rel))
      add(
        $(el).attr("href"),
        "website-icon",
        rel.includes("apple-touch") ? 1 : 2,
      );
  });
  // Explicitly named company logos only; never an arbitrary OpenGraph preview or founder portrait.
  $('header img,nav img,a[href="/"] img').each((_, el) => {
    const value = $(el).attr("alt") || "";
    if (/\blogo\b/i.test(value)) add($(el).attr("src"), "website-logo", 3);
  });
  const brand = (
    companyName ||
    $('meta[property="og:site_name"]').attr("content") ||
    ""
  )
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  if (brand.length >= 4)
    $("img[alt]").each((_, el) => {
      const alt = ($(el).attr("alt") || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      if (alt === brand || alt === brand + "logo")
        add($(el).attr("src"), "website-logo", 3);
    });
  $('a[class*="logo"] svg,header [class*="logo"] svg').each((_, el) =>
    add(
      `data:image/svg+xml;base64,${Buffer.from($.html(el)).toString("base64")}`,
      "website-logo",
      3,
    ),
  );
  add("/favicon.ico", "website-icon", 4);
  return candidates
    .sort((a, b) => a.priority - b.priority)
    .filter(
      (row, index, all) =>
        all.findIndex((other) => other.url === row.url) === index,
    )
    .slice(0, 7)
    .map(({ priority: _priority, ...row }) => row);
}

export async function normalizedLogo(
  bytes: Buffer,
  contentType: string,
): Promise<{ png: Buffer; background: string }> {
  if (
    !/image\/(?:png|jpeg|webp|gif|svg\+xml|x-icon|vnd.microsoft.icon|avif)|application\/octet-stream/.test(
      contentType,
    )
  )
    throw new Error("Not a supported logo image.");
  if (
    contentType.includes("svg") ||
    bytes.subarray(0, 300).toString().includes("<svg")
  ) {
    const xml = bytes.toString("utf8");
    if (
      /<!DOCTYPE|<!ENTITY|<\s*(?:script|foreignObject|iframe|image)\b|\bon\w+\s*=|(?:href|src)\s*=\s*["'](?!#)|url\(\s*["']?(?!#)[^)]*\)|@import/i.test(
        xml,
      )
    )
      throw new Error("SVG contains active or external content.");
  }
  // Decode ICO's PNG entry where available; otherwise select its first bitmap through sharp.
  let input = bytes;
  if (bytes.length > 22 && bytes.readUInt32LE(0) === 65536) {
    const count = Math.min(bytes.readUInt16LE(4), 32),
      entries = [];
    for (let i = 0; i < count; i++) {
      const offset = 6 + i * 16;
      if (offset + 16 > bytes.length) break;
      const size = bytes.readUInt32LE(offset + 8),
        start = bytes.readUInt32LE(offset + 12);
      if (
        start + size <= bytes.length &&
        bytes
          .subarray(start, start + 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      )
        entries.push({ size, data: bytes.subarray(start, start + size) });
    }
    if (entries.length) input = entries.sort((a, b) => b.size - a.size)[0].data;
    else {
      const entries = [];
      for (let i = 0; i < count; i++) {
        const offset = 6 + i * 16;
        if (offset + 16 > bytes.length) break;
        const start = bytes.readUInt32LE(offset + 12),
          size = bytes.readUInt32LE(offset + 8);
        if (start + size > bytes.length || start + 40 > bytes.length) continue;
        const width = bytes.readInt32LE(start + 4),
          height = Math.abs(bytes.readInt32LE(start + 8)) / 2,
          bits = bytes.readUInt16LE(start + 14),
          compression = bytes.readUInt32LE(start + 16);
        if (
          width > 0 &&
          width <= 256 &&
          height > 0 &&
          height <= 256 &&
          [24, 32].includes(bits) &&
          compression === 0
        )
          entries.push({ start, width, height, bits });
      }
      const entry = entries.sort((a, b) => b.width - a.width)[0];
      if (!entry) throw new Error("Unsupported ICO bitmap.");
      const { start, width, height, bits } = entry,
        stride = Math.ceil((width * bits) / 32) * 4,
        base = start + bytes.readUInt32LE(start),
        maskBase = base + stride * height,
        maskStride = Math.ceil(width / 32) * 4;
      if (base + stride * height > bytes.length)
        throw new Error("ICO pixel data is truncated.");
      const rgba = Buffer.alloc(width * height * 4);
      let anyAlpha = false;
      for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) {
          const from = base + (height - 1 - y) * stride + (x * bits) / 8,
            to = (y * width + x) * 4;
          rgba[to] = bytes[from + 2];
          rgba[to + 1] = bytes[from + 1];
          rgba[to + 2] = bytes[from];
          rgba[to + 3] = bits === 32 ? bytes[from + 3] : 255;
          anyAlpha ||= rgba[to + 3] > 0;
        }
      if (!anyAlpha || bits === 24)
        for (let y = 0; y < height; y++)
          for (let x = 0; x < width; x++) {
            const mask = maskBase + (height - 1 - y) * maskStride + (x >> 3);
            rgba[(y * width + x) * 4 + 3] =
              mask < bytes.length && bytes[mask] & (128 >> (x % 8)) ? 0 : 255;
          }
      input = await sharp(rgba, { raw: { width, height, channels: 4 } })
        .png()
        .toBuffer();
    }
  }
  const pipeline = sharp(input, { limitInputPixels: 16000000, animated: false })
    .rotate()
    .resize(96, 96, { fit: "inside", withoutEnlargement: false });
  const { data, info } = await pipeline
    .clone()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let weight = 0,
    light = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const a = data[i + 3] / 255;
    weight += a;
    light +=
      (data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722) * a;
  }
  if (weight < 5) throw new Error("Website icon is transparent or empty.");
  const png = await pipeline.png({ compressionLevel: 9 }).toBuffer();
  if (png.length > 28000)
    throw new Error("Normalized icon exceeds the size limit.");
  if (
    [
      "1e8f80f65df6d9c956f27ea82d3dacdbc7994816fa369d8f5d26539b26c0188a",
      "26e3718f44837660d9b33484438f261da601a546a42e581c229ad3c2833f9b99",
    ].includes(createHash("sha256").update(png).digest("hex"))
  )
    throw new Error("Generic site-builder favicon excluded.");
  return { png, background: light / weight > 180 ? "#171717" : "#f5f5f5" };
}

export async function collectCompanyLogo(
  website: string,
  {
    timeoutMs = 22000,
    previous,
    companyName,
  }: {
    timeoutMs?: number;
    previous?: CompanyLogoInfo;
    companyName?: string;
  } = {},
): Promise<CompanyLogoInfo> {
  const checkedAt = new Date().toISOString(),
    started = Date.now();
  const errors: string[] = [];
  try {
    const root = normalizePublicUrl(website).href;
    let candidates: {
      url: string;
      method: "website-icon" | "website-logo" | "favicon-cache";
    }[] = [];
    try {
      const page = await fetchPublicResource(root, {
        timeoutMs: Math.min(11000, timeoutMs),
        maxBytes: 2200000,
        accept: "text/html",
      });
      if (!page.contentType.includes("html"))
        throw new Error("Website is not HTML.");
      candidates = websiteIconCandidates(
        page.body.toString("utf8"),
        page.url,
        companyName,
      );
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      candidates = [
        { url: new URL("/favicon.ico", root).href, method: "website-icon" },
      ];
    }
    if (
      previous?.sourceUrl &&
      new URL(previous.website).hostname.replace(/^www\./, "") ===
        new URL(root).hostname.replace(/^www\./, "")
    )
      candidates.push({
        url: previous.sourceUrl,
        method: previous.method || "website-icon",
      });
    candidates.push({
      url: `https://icons.duckduckgo.com/ip3/${new URL(root).hostname.replace(/^www\./, "")}.ico`,
      method: "favicon-cache",
    });
    for (const candidate of candidates) {
      const remaining =
        timeoutMs -
        (candidate.method === "favicon-cache" ? 0 : 5000) -
        (Date.now() - started);
      if (remaining < 500) continue;
      try {
        const inline = candidate.url.match(
          /^data:(image\/(?:png|jpeg|webp|svg\+xml));base64,([a-zA-Z0-9+/=]+)$/,
        );
        const image = inline
          ? {
              body: Buffer.from(inline[2], "base64"),
              contentType: inline[1],
              url: new URL("#company-logo", root).href,
            }
          : await fetchPublicResource(candidate.url, {
              timeoutMs: Math.min(6000, remaining),
              maxBytes: 600000,
              accept: "image/*",
            });
        const { png, background } = await normalizedLogo(
          image.body,
          image.contentType,
        );
        return {
          status: "fetched",
          url: `data:image/png;base64,${png.toString("base64")}`,
          sourceUrl: image.url,
          website: root,
          checkedAt,
          sha256: createHash("sha256").update(png).digest("hex"),
          background,
          method: candidate.method,
        };
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }
    return {
      status: "unavailable",
      url: null,
      sourceUrl: null,
      website: root,
      checkedAt,
      error:
        [...new Set(errors)].join(" ").slice(0, 500) ||
        "No readable company icon was published by the website.",
    };
  } catch (error) {
    return {
      status: "unavailable",
      url: null,
      sourceUrl: null,
      website,
      checkedAt,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

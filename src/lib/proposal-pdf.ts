import { PDFDocument, rgb, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { ProposalDraft } from "./proposals";
import { buildProposalContract } from "./proposal-contract";

/** Render locally in the investor's browser. No draft is uploaded to generate this PDF. */
export async function generateProposalPdf(
  draft: ProposalDraft,
  fontBytes: Uint8Array,
) {
  const contract = buildProposalContract(draft),
    pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(fontBytes, { subset: true });
  const clean = (value: string) =>
    value
      .normalize("NFC")
      .replace(/[\u2010-\u2015\u2212]/g, "-")
      .replace(/\t/g, "  ")
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
  const all = clean(JSON.stringify(contract)),
    supported = new Set(font.getCharacterSet());
  if (
    [...all].some(
      (char) => !/[\r\n]/.test(char) && !supported.has(char.codePointAt(0)!),
    )
  )
    throw new Error(
      "The PDF font cannot render a character in this draft. Copy the draft to preserve its original text.",
    );
  const W = 595.28,
    H = 841.89,
    M = 48,
    content = W - M * 2,
    bottom = 64,
    ink = rgb(0.1, 0.13, 0.1),
    muted = rgb(0.4, 0.45, 0.4),
    green = rgb(0, 0.45, 0.09),
    line = rgb(0.83, 0.86, 0.82);
  let page!: PDFPage,
    y = 0;
  const pages: PDFPage[] = [];
  const fit = (text: string, max: number, size: number) => {
    let value = clean(text);
    while (value && font.widthOfTextAtSize(value, size) > max)
      value = value.slice(0, -1);
    return value;
  };
  const createPage = () => {
    page = pdf.addPage([W, H]);
    pages.push(page);
    page.drawText("SEED STREET", {
      x: M,
      y: H - 37,
      size: 9,
      font,
      color: green,
    });
    page.drawText(fit(contract.company, 280, 8), {
      x: M + 140,
      y: H - 37,
      size: 8,
      font,
      color: muted,
    });
    page.drawLine({
      start: { x: M, y: H - 48 },
      end: { x: W - M, y: H - 48 },
      thickness: 0.6,
      color: line,
    });
    y = H - 73;
  };
  const space = (height: number) => {
    if (y - height < bottom) createPage();
  };
  const wrap = (text: string, size: number, width: number) => {
    const lines: string[] = [];
    for (const paragraph of clean(text).split(/\r?\n/)) {
      let current = "";
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        if (font.widthOfTextAtSize(word, size) > width) {
          if (current) {
            lines.push(current);
            current = "";
          }
          let part = "";
          for (const char of word) {
            if (font.widthOfTextAtSize(part + char, size) > width) {
              lines.push(part);
              part = "";
            }
            part += char;
          }
          current = part;
        } else if (
          current &&
          font.widthOfTextAtSize(`${current} ${word}`, size) > width
        ) {
          lines.push(current);
          current = word;
        } else current = current ? `${current} ${word}` : word;
      }
      lines.push(current);
    }
    return lines;
  };
  const text = (value: string, size = 10.3, color = ink, indent = 0) => {
    for (const row of wrap(value, size, content - indent)) {
      space(size * 1.48);
      page.drawText(row, { x: M + indent, y, size, font, color });
      y -= size * 1.48;
    }
  };
  const heading = (value: string) => {
    space(62);
    y -= 10;
    page.drawText(value, { x: M, y, size: 12, font, color: green });
    y -= 23;
  };
  createPage();
  text(contract.title, 23);
  y -= 8;
  page.drawRectangle({
    x: M,
    y: y - 24,
    width: content,
    height: 30,
    color: rgb(0.92, 0.97, 0.91),
  });
  page.drawText(contract.status, {
    x: M + 10,
    y: y - 13,
    size: 10,
    font,
    color: green,
  });
  y -= 43;
  text(`${contract.company}  |  Prepared ${contract.date}`, 10, muted);
  y -= 10;
  if (contract.sample) {
    text("SYNTHETIC REHEARSAL - FICTIONAL TERMS", 10, green);
    text(
      "This example does not state actual terms offered by this company or its founders.",
      9,
      muted,
    );
    y -= 8;
  }
  for (const section of contract.sections) {
    heading(section.title);
    for (const paragraph of section.paragraphs || []) {
      text(paragraph);
      y -= 9;
    }
    for (const field of section.fields || []) {
      space(40);
      text(field.label.toUpperCase(), 8, muted);
      text(field.value, 10.3);
      if (field.origin) text(field.origin, 7.5, muted);
      y -= 10;
    }
  }
  space(215);
  heading("8. Signatures - blank and pending");
  text(contract.signatureNotice, 9, muted);
  y -= 28;
  const half = (content - 28) / 2;
  for (const [index, label] of [
    "INVESTOR",
    "ISSUER AUTHORIZED REPRESENTATIVE",
  ].entries()) {
    const x = M + index * (half + 28);
    page.drawText(label, { x, y, size: 8, font, color: muted });
    for (const [offset, caption] of [
      [27, "Signature"],
      [64, "Printed name / title"],
      [101, "Date"],
    ] as const) {
      page.drawLine({
        start: { x, y: y - offset },
        end: { x: x + half, y: y - offset },
        thickness: 0.7,
        color: line,
      });
      page.drawText(caption, {
        x,
        y: y - offset - 12,
        size: 7.5,
        font,
        color: muted,
      });
    }
  }
  pages.forEach((item, index) => {
    item.drawLine({
      start: { x: M, y: 45 },
      end: { x: W - M, y: 45 },
      thickness: 0.5,
      color: line,
    });
    item.drawText("Draft - Pending Signatures | Not executed", {
      x: M,
      y: 30,
      size: 7.5,
      font,
      color: muted,
    });
    const count = `${index + 1} / ${pages.length}`;
    item.drawText(count, {
      x: W - M - font.widthOfTextAtSize(count, 8),
      y: 30,
      size: 8,
      font,
      color: muted,
    });
  });
  pdf.setTitle(
    `${contract.title} - ${contract.company} - Draft Pending Signatures`,
  );
  pdf.setAuthor("Seed Street");
  pdf.setSubject("Unsigned proposed investment agreement for review");
  pdf.setCreator("Seed Street");
  pdf.setProducer("Seed Street / pdf-lib");
  return pdf.save();
}

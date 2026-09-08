/**
 * POC RUNNER (FORME) — renders the prepared fixture through Forme and measures.
 * Run: bun docs/Reports/pdf/poc/render-forme.tsx
 *
 * Steps: fixture (production math) → vendored pdfcn Forme JSX + native
 * Forme JSX → renderDocument() from @formepdf/core → PDFs + measurements.
 */
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Font } from "@formepdf/react";
import { renderDocument } from "@formepdf/core";
import { PDFDocument } from "pdf-lib";
import { buildPocFixture } from "./fixture.ts";
import {
  FormePdfcnInvoiceDocument,
  FormeNativeTableDocument,
  setLogoDataUri,
} from "./forme-invoice-document.tsx";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(here, "..", "..", "..", "..");
mkdirSync(join(here, "assets"), { recursive: true });

function registerFonts(): void {
  // ponytail: Forme's byte path parses TTF only (woff/woff2 bytes fail with
  // "unknown magic"; path strings silently fall back to NotoSans). The POC
  // uses the variable Inter TTF (ofl/inter, google/fonts) for all weights.
  // Source file: poc/assets/inter-var.ttf (downloaded 2026-09-08).
  const raw = readFileSync(join(here, "assets", "inter-var.ttf"));
  const bytes = () => new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength);
  for (const weight of [400, 500, 600, 700]) {
    Font.register({ family: "Inter", src: bytes(), fontWeight: weight });
  }
}

async function extractText(bytes: Uint8Array): Promise<{ method: string; text: string; pages: string[] }> {
  const mod: any = await import("pdf-parse");
  const parser = new mod.PDFParse({ data: Buffer.from(bytes) });
  const result = await parser.getText();
  const pages = Array.isArray(result?.pages) ? result.pages.map((p: any) => String(p?.text ?? "")) : [];
  return { method: "pdf-parse/PDFParse", text: String(result?.text ?? ""), pages };
}

async function main() {
  registerFonts();
  const logoBytes = readFileSync(join(here, "assets", "poc-logo.png"));
  setLogoDataUri(`data:image/png;base64,${logoBytes.toString("base64")}`);

  const base = buildPocFixture(false);
  const long = buildPocFixture(true);

  const jobs: Array<{ key: string; file: string; doc: any }> = [
    { key: "base", file: "forme-invoice-a4.pdf", doc: <FormePdfcnInvoiceDocument model={base.model} /> },
    { key: "long", file: "forme-invoice-long.pdf", doc: <FormePdfcnInvoiceDocument model={long.model} /> },
    { key: "native", file: "forme-invoice-native.pdf", doc: <FormeNativeTableDocument model={long.model} /> },
    { key: "landscape", file: "forme-invoice-landscape.pdf", doc: <FormePdfcnInvoiceDocument model={base.model} landscape /> },
  ];

  const results: Record<string, any> = {};
  for (const job of jobs) {
    const bytes = await renderDocument(job.doc);
    const outPath = join(here, job.file);
    writeFileSync(outPath, bytes);

    const pdf = await PDFDocument.load(bytes);
    const pages = pdf.getPageCount();
    const { width, height } = pdf.getPage(0).getSize();
    const { method, text, pages: pageTexts } = await extractText(bytes);

    const fixture = job.key === "landscape" ? base : job.key === "base" ? base : long;
    // ponytail: pdf-parse inserts line breaks where cells wrap mid-number
    // ("₦2,872,265\n.63"), so match against whitespace-flattened text.
    const flat = text.replace(/\s+/g, "");
    const missing = fixture.moneyStrings.filter((s) => !flat.includes(s.replace(/\s+/g, "")));
    const numberOk = flat.includes(fixture.model.number.replace(/\s+/g, ""));

    results[job.key] = {
      file: job.file,
      bytes: bytes.length,
      pages,
      firstPagePt: { width: Number(width.toFixed(2)), height: Number(height.toFixed(2)) },
      textMethod: method,
      invoiceNumberFound: numberOk,
      moneyStringsChecked: fixture.moneyStrings.length,
      moneyStringsMissing: missing,
      valuesMatch: numberOk && missing.length === 0,
      headerOnPages: pageTexts.map((t) => t.includes("Unit Price")),
      snHeaderOnPages: pageTexts.map((t) => t.includes("S/N")),
      pageNumbersOk: pageTexts.every((t) => /Page \d+ of \d+/.test(t)),
      groupLabelPages: pageTexts.map((t) => t.includes("GROUP: General Goods")),
    };
    console.log(`[forme-poc] ${job.file}: ${pages} page(s), ${width.toFixed(2)}x${height.toFixed(2)}pt, valuesMatch=${results[job.key].valuesMatch}`);
    if (missing.length) console.log(`[forme-poc] missing strings: ${JSON.stringify(missing.slice(0, 10))}`);
  }

  writeFileSync(join(here, "forme-measurements.json"), JSON.stringify(results, null, 2));
  console.log("[forme-poc] forme-measurements.json written");
}

await main();

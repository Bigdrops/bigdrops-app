/**
 * POC RUNNER (INDUSTRY) — BIGDROPS-owned Industry template through Forme.
 * Run: bun docs/reports/pdf/poc/render-industry.tsx
 */
import { writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Font } from "@formepdf/react";
import { renderDocument } from "@formepdf/core";
import { PDFDocument } from "pdf-lib";
import { buildIndustryFixture } from "./fixture-industry.ts";
import {
  IndustryInvoiceDocument,
  DEFAULT_DESIGN,
  ACCENT_COMPACT_DESIGN,
  setIndustryLogoDataUri,
} from "./industry-document.tsx";

const here = dirname(fileURLToPath(import.meta.url));

function registerFonts(): void {
  const raw = readFileSync(join(here, "assets", "inter-var.ttf"));
  const bytes = () => new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength);
  for (const weight of [400, 500, 600, 700]) {
    Font.register({ family: "Inter", src: bytes(), fontWeight: weight });
  }
}

async function main() {
  registerFonts();
  const logoBytes = readFileSync(join(here, "assets", "poc-logo.png"));
  setIndustryLogoDataUri(`data:image/png;base64,${logoBytes.toString("base64")}`);

  const base = buildIndustryFixture(false);
  const long = buildIndustryFixture(true);

  const jobs: Array<{ key: string; file: string; doc: any }> = [
    { key: "base", file: "industry-a4.pdf", doc: <IndustryInvoiceDocument model={base.model} design={DEFAULT_DESIGN} /> },
    { key: "compact", file: "industry-compact.pdf", doc: <IndustryInvoiceDocument model={base.model} design={ACCENT_COMPACT_DESIGN} /> },
    { key: "long", file: "industry-long.pdf", doc: <IndustryInvoiceDocument model={long.model} design={DEFAULT_DESIGN} /> },
  ];

  const results: Record<string, any> = {};
  for (const job of jobs) {
    const bytes = await renderDocument(job.doc);
    const outPath = join(here, job.file);
    writeFileSync(outPath, bytes);

    const pdf = await PDFDocument.load(bytes);
    const pages = pdf.getPageCount();
    const { width, height } = pdf.getPage(0).getSize();

    const mod: any = await import("pdf-parse");
    const parsed = await new mod.PDFParse({ data: Buffer.from(bytes) }).getText();
    const text: string = String(parsed?.text ?? "");
    const pageTexts: string[] = Array.isArray(parsed?.pages) ? parsed.pages.map((p: any) => String(p?.text ?? "")) : [];
    const flat = text.replace(/\s+/g, "");

    const fixture = job.key === "long" ? long : base;
    const missing = fixture.moneyStrings.filter((s) => !flat.includes(s.replace(/\s+/g, "")));
    const numberOk = flat.includes(fixture.model.number);

    results[job.key] = {
      file: job.file,
      bytes: bytes.length,
      pages,
      firstPagePt: { width: Number(width.toFixed(2)), height: Number(height.toFixed(2)) },
      invoiceNumberFound: numberOk,
      moneyStringsChecked: fixture.moneyStrings.length,
      moneyStringsMissing: missing,
      valuesMatch: numberOk && missing.length === 0,
      headerOnPages: pageTexts.map((t) => t.replace(/\s+/g, "").includes("UnitPrice")),
      groupLabelsOnPages: pageTexts.map((t) => t.includes("General Goods") || t.includes("Services & Logistics") || t.includes("Services&Logistics")),
      totalsOnPages: pageTexts.map((t) => t.includes("Total Payable")),
      wordsOnPages: pageTexts.map((t) => t.includes("Kobo Only") || t.includes("attached schedule")),
      balanceOnPages: pageTexts.map((t) => t.includes("Balance Due")),
      bankOnPages: pageTexts.map((t) => t.includes("First Bank of Nigeria")),
      signatureOnPages: pageTexts.map((t) => t.includes("Adeyemi")),
      pageNumbersOk: pageTexts.every((t) => /Page \d+ of \d+/.test(t)),
    };
    console.log(`[industry-poc] ${job.file}: ${pages} page(s), ${width.toFixed(2)}x${height.toFixed(2)}pt, valuesMatch=${results[job.key].valuesMatch}`);
    if (missing.length) console.log(`[industry-poc] missing: ${JSON.stringify(missing.slice(0, 8))}`);
  }

  writeFileSync(join(here, "industry-measurements.json"), JSON.stringify(results, null, 2));
  console.log("[industry-poc] industry-measurements.json written");
}

await main();

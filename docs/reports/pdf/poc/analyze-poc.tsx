/**
 * POC ANALYZER — per-page text structure of the generated PDFs.
 * Run: bun docs/Reports/pdf/poc/analyze-poc.tsx
 * Read-only over the POC artifacts. Writes analysis.json for the report.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PDFParse } from "pdf-parse";
import { buildPocFixture } from "./fixture.ts";

const here = dirname(fileURLToPath(import.meta.url));

async function pageTexts(file: string): Promise<string[]> {
  const data = readFileSync(join(here, file));
  const parser: any = new (PDFParse as any)({ data });
  // Probe the v2 API surface first.
  const probes: Record<string, unknown> = {};
  for (const key of ["getText", "getTotal", "getPages", "getInfo", "getMetadata"]) {
    probes[key] = typeof parser[key];
  }
  console.log(`[analyze] ${file} API:`, JSON.stringify(probes));
  const full = await parser.getText();
  console.log(`[analyze] ${file} getText keys:`, JSON.stringify(Object.keys(full ?? {})));
  if (Array.isArray((full as any)?.pages)) {
    return (full as any).pages.map((p: any) => String(p?.text ?? ""));
  }
  if (typeof (full as any)?.text === "string") {
    // Fallback: split on form-feed page separators if present.
    return String((full as any).text).split("\f");
  }
  return [];
}

function summarize(name: string, pages: string[], needles: string[]) {
  const entry: Record<string, any> = { file: name, pages: pages.length };
  for (const needle of needles) {
    entry[needle] = pages.map((t) => t.includes(needle));
  }
  return entry;
}

async function main() {
  const base = buildPocFixture(false);
  const long = buildPocFixture(true);
  const descriptions = long.model.rows.map((r) => r.description);

  const out: Record<string, any> = {};

  const basePages = await pageTexts("takumi-invoice-a4.pdf");
  out.base = summarize("takumi-invoice-a4.pdf", basePages, [
    "INV-2026-0042",
    "Unit Price",
    "Total Payable",
    base.model.totals[4].display,
    "Page 1 of",
    "Page 2 of",
    "Authorised Signature",
  ]);

  const longPages = await pageTexts("takumi-invoice-long.pdf");
  out.long = summarize("takumi-invoice-long.pdf", longPages, [
    "INV-2026-0042",
    "Unit Price",
    "Total Payable",
    long.model.totals[4].display,
  ]);
  // Row integrity: each of the 64 descriptions appears on exactly one page.
  const descPages = descriptions.map((d) => longPages.filter((t) => t.includes(d)).length);
  out.long.rowIntegrity = {
    rows: descriptions.length,
    onExactlyOnePage: descPages.filter((n) => n === 1).length,
    onZeroPages: descPages.filter((n) => n === 0).length,
    onMultiplePages: descPages.filter((n) => n > 1).length,
  };
  out.long.pageNumbers = longPages.map((t) => /Page \d+ of \d+/.test(t));

  const nativePages = await pageTexts("takumi-thead-repeat.pdf");
  out.native = summarize("takumi-thead-repeat.pdf", nativePages, [
    "Description",
    "Unit Price",
    "Total Payable",
  ]);

  const baselinePages = await pageTexts("reactpdf-invoice-baseline.pdf");
  out.baseline = { file: "reactpdf-invoice-baseline.pdf", pages: baselinePages.length };

  writeFileSync(join(here, "analysis.json"), JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ base: out.base, longRowIntegrity: out.long.rowIntegrity, native: out.native, baseline: out.baseline }, null, 1));
}

await main();

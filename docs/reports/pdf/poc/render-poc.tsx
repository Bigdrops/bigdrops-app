/**
 * POC RUNNER — renders the prepared fixture through Takumi and measures output.
 * Run: bun docs/Reports/pdf/poc/render-poc.ts
 *
 * Steps: fixture (production math) → vendored pdfcn/Takumi JSX →
 * takumi-pdf render() → PDF files + measurements.json.
 */
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
// ponytail: default "takumi-pdf" entry is broken on Windows Bun
// (bundlers/bun.mjs builds an invalid URL for the .wasm file), so the POC
// uses the documented manual-init entry and loads the bytes itself.
import init, { render } from "takumi-pdf/no-init";
import { PageNumber, TotalPages } from "takumi-pdf/primitives";
import { PDFDocument } from "pdf-lib";
import { buildPocFixture } from "./fixture";
import {
  PocInvoiceDocument,
  PocNativeTableDocument,
  LOGO_SRC,
} from "./invoice-document";
import { writePocLogo } from "./make-logo";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(here, "..", "..", "..", "..");
const assetsDir = join(here, "assets");
mkdirSync(assetsDir, { recursive: true });

async function loadFontEntries() {
  const inter = (file: string, weight: number) => ({
    name: "Inter",
    weight,
    file: join("node_modules", "@fontsource", "inter", "files", file),
  });
  // Production mirrors this: DejaVu Sans is BIGDROPS's glyph-coverage font
  // (PDF_GLYPH_FONT_FAMILY in src/lib/pdfSharedFonts.ts) because the Inter
  // latin subsets lack U+20A6 and similar glyphs.
  const dejavu = (file: string, weight: number) => ({
    name: "DejaVu Sans",
    weight,
    file: join("node_modules", "@fontsource", "dejavu-sans", "files", file),
  });
  const files = [
    inter("inter-latin-400-normal.woff", 400),
    inter("inter-latin-500-normal.woff", 500),
    inter("inter-latin-600-normal.woff", 600),
    inter("inter-latin-700-normal.woff", 700),
    inter("inter-latin-ext-400-normal.woff", 400),
    inter("inter-latin-ext-700-normal.woff", 700),
    dejavu("dejavu-sans-latin-400-normal.woff", 400),
    dejavu("dejavu-sans-latin-700-normal.woff", 700),
  ];
  return files.map(({ name, weight, file }) => {
    const raw = readFileSync(join(projectRoot, file));
    return { name, weight, data: new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength) };
  });
}

async function extractText(bytes: Uint8Array): Promise<{ method: string; text: string }> {
  try {
    const mod: any = await import("pdf-parse");
    if (mod.PDFParse) {
      const parser = new mod.PDFParse({ data: Buffer.from(bytes) });
      const result = await parser.getText();
      const text = String(result?.text ?? result?.total ?? "");
      if (text.trim()) return { method: "pdf-parse/PDFParse", text };
    } else if (typeof mod.default === "function") {
      const result = await mod.default(Buffer.from(bytes));
      const text = String(result?.text ?? "");
      if (text.trim()) return { method: "pdf-parse/default", text };
    }
  } catch (error) {
    console.log(`[poc] pdf-parse unavailable (${String(error).slice(0, 120)}); using raw scan`);
  }
  return { method: "raw-latin1-scan", text: Buffer.from(bytes).toString("latin1") };
}

async function main() {
  const wasmBytes = await Bun.file(
    join(projectRoot, "node_modules", "takumi-pdf", "pkg", "takumi_pdf_wasm_bg.wasm"),
  ).arrayBuffer();
  await init({ module_or_path: wasmBytes });

  const logoPath = writePocLogo(join(assetsDir, "poc-logo.png"));
  const logoBytes = new Uint8Array(readFileSync(logoPath));
  const fonts = await loadFontEntries();

  const base = buildPocFixture(false);
  const long = buildPocFixture(true);

  const footer = (
    <div style={{ display: "flex", width: "100%", justifyContent: "space-between", fontSize: 10, color: "#71717a", fontFamily: "Inter" }}>
      <span>{base.model.companyName}</span>
      <span>
        Page <PageNumber /> of <TotalPages />
      </span>
    </div>
  );

  const options = {
    size: "a4" as const,
    margin: { top: 75, right: 64, bottom: 75, left: 64 },
    fonts,
    fontFamilies: ["Inter", "DejaVu Sans", "sans-serif"],
    images: [{ src: LOGO_SRC, data: logoBytes }],
    footer,
  };

  const results: Record<string, any> = {};

  const jobs: Array<{ key: string; file: string; doc: any }> = [
    { key: "base", file: "takumi-invoice-a4.pdf", doc: <PocInvoiceDocument model={base.model} /> },
    { key: "long", file: "takumi-invoice-long.pdf", doc: <PocInvoiceDocument model={long.model} /> },
    { key: "native", file: "takumi-thead-repeat.pdf", doc: <PocNativeTableDocument model={long.model} /> },
  ];

  for (const job of jobs) {
    const bytes = await render(job.doc, options);
    const outPath = join(here, job.file);
    writeFileSync(outPath, bytes);

    const pdf = await PDFDocument.load(bytes);
    const pages = pdf.getPageCount();
    const { width, height } = pdf.getPage(0).getSize();
    const { method, text } = await extractText(bytes);

    const fixture = job.key === "base" ? base : long;
    const missing = fixture.moneyStrings.filter((s) => !text.includes(s));
    const numberOk = text.includes(fixture.model.number);

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
    };
    console.log(`[poc] ${job.file}: ${pages} page(s), ${width.toFixed(2)}x${height.toFixed(2)}pt, valuesMatch=${results[job.key].valuesMatch}`);
    if (missing.length) console.log(`[poc] missing strings: ${JSON.stringify(missing.slice(0, 10))}`);
  }

  results.computed = {
    base: base.computed,
    long: long.computed,
    baseMoney: base.moneyStrings,
  };
  writeFileSync(join(here, "measurements.json"), JSON.stringify(results, null, 2));
  console.log("[poc] measurements.json written");
}

await main();

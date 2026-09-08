/**
 * POC BASELINE — same prepared fixture through the production-adjacent
 * React-PDF path (Document/Page/Text/View/Image primitives, Helvetica).
 * Run: bun docs/Reports/pdf/poc/reactpdf-baseline.tsx
 *
 * Scope: renderer comparison only. Uses the identical prepared money
 * strings from fixture.ts. Helvetica is a built-in React-PDF font, so no
 * font files are needed. Logo embeds via data URI (production uses a URL;
 * the Takumi side receives raw bytes — both are asset-loading paths).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { buildPocFixture } from "./fixture";
import { writePocLogo } from "./make-logo";

const here = dirname(fileURLToPath(import.meta.url));

const styles = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 56, paddingHorizontal: 48, fontFamily: "Helvetica", fontSize: 10, color: "#18181b" },
  headerRow: { flexDirection: "row", justifyContent: "space-between" },
  companyName: { fontSize: 15, fontWeight: "bold" },
  muted: { fontSize: 8, color: "#71717a" },
  title: { fontSize: 26, fontWeight: "bold", textAlign: "right" },
  number: { fontSize: 11, fontWeight: "bold", textAlign: "right" },
  rule: { borderBottomWidth: 1, borderBottomColor: "#e4e4e7", marginTop: 10, marginBottom: 10 },
  tableHeader: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#18181b", paddingBottom: 4 },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e4e4e7", paddingVertical: 5 },
  cellDesc: { flex: 1 },
  cellQty: { width: 44, textAlign: "right" },
  cellUnit: { width: 56 },
  cellPrice: { width: 92, textAlign: "right" },
  cellAmount: { width: 100, textAlign: "right" },
  headerCell: { fontWeight: "bold", fontSize: 9 },
  totalsWrap: { alignItems: "flex-end", marginTop: 8 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", width: 250 },
  footer: { position: "absolute", bottom: 24, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: "#71717a" },
});

async function main() {
  const { model } = buildPocFixture(false);
  const logoPath = join(here, "assets", "poc-logo.png");
  try {
    readFileSync(logoPath);
  } catch {
    writePocLogo(logoPath);
  }
  const logoDataUri = `data:image/png;base64,${readFileSync(logoPath).toString("base64")}`;

  const doc = (
    <Document title={model.number}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Image src={logoDataUri} style={{ width: 90 }} />
            <View>
              <Text style={styles.companyName}>{model.issuerName}</Text>
              {model.issuerLines.map((line) => (
                <Text key={line} style={styles.muted}>{line}</Text>
              ))}
              <Text style={styles.muted}>{model.issuerPhone}</Text>
              <Text style={styles.muted}>{model.issuerEmail}</Text>
              <Text style={styles.muted}>{model.issuerTaxId}</Text>
            </View>
          </View>
          <View>
            <Text style={styles.title}>{model.title}</Text>
            <Text style={styles.number}>{model.number}</Text>
            <Text style={[styles.muted, { textAlign: "right" }]}>Issue: {model.issueDate}</Text>
            <Text style={[styles.muted, { textAlign: "right" }]}>Due: {model.dueDate}</Text>
          </View>
        </View>

        <View style={styles.rule} />

        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.muted, { fontWeight: "bold" }]}>BILL TO</Text>
            <Text style={{ fontSize: 11, fontWeight: "bold" }}>{model.recipientName}</Text>
            {model.recipientLines.map((line) => (
              <Text key={line} style={styles.muted}>{line}</Text>
            ))}
          </View>
          <Text style={styles.muted}>Currency: {model.currency}</Text>
        </View>

        <View style={[styles.tableHeader, { marginTop: 12 }]}>
          <Text style={[styles.cellDesc, styles.headerCell]}>Description</Text>
          <Text style={[styles.cellQty, styles.headerCell]}>Qty</Text>
          <Text style={[styles.cellUnit, styles.headerCell]}>Unit</Text>
          <Text style={[styles.cellPrice, styles.headerCell]}>Unit Price</Text>
          <Text style={[styles.cellAmount, styles.headerCell]}>Amount</Text>
        </View>
        {model.rows.map((row) => (
          <View key={row.key} style={styles.tableRow} wrap={false}>
            <Text style={styles.cellDesc}>{row.description}</Text>
            <Text style={styles.cellQty}>{row.qty}</Text>
            <Text style={styles.cellUnit}>{row.unit}</Text>
            <Text style={styles.cellPrice}>{row.unitPrice}</Text>
            <Text style={styles.cellAmount}>{row.amount}</Text>
          </View>
        ))}

        <View style={styles.totalsWrap}>
          {model.totals.map((row) => (
            <View key={row.label} style={styles.totalRow}>
              <Text style={row.emphasis ? { fontWeight: "bold" } : {}}>{row.label}</Text>
              <Text style={row.emphasis ? { fontWeight: "bold" } : {}}>{row.display}</Text>
            </View>
          ))}
        </View>

        <Text style={{ fontSize: 9, fontWeight: "bold", marginTop: 12 }}>{model.notesTitle}</Text>
        <Text style={styles.muted}>{model.notes}</Text>
        <Text style={{ fontSize: 9, fontWeight: "bold", marginTop: 6 }}>{model.termsTitle}</Text>
        <Text style={styles.muted}>{model.terms}</Text>

        <View style={styles.footer} fixed>
          <Text>{model.companyName}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );

  const buffer = await renderToBuffer(doc as any);
  const outPath = join(here, "reactpdf-invoice-baseline.pdf");
  writeFileSync(outPath, buffer);
  console.log(`[poc] baseline written: ${outPath} (${buffer.length} bytes)`);
}

await main();

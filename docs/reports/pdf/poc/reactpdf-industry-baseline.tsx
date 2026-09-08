/**
 * POC BASELINE (INDUSTRY) — same industry fixture through @react-pdf/renderer
 * with production IndustryTemplate style numbers (page 14/64/24, base 10.5,
 * title 27, tight table padding). Helvetica built-in.
 * Run: bun docs/Reports/pdf/poc/reactpdf-industry-baseline.tsx
 *
 * Purpose: like-for-like density comparison only. Glyph note: Helvetica
 * WinAnsi cannot encode ₦ (renders as ¦) — production solves this with
 * Noto/DejaVu coverage fonts; geometry comparison is unaffected.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { buildIndustryFixture } from "./fixture-industry.ts";

const here = dirname(fileURLToPath(import.meta.url));

const styles = StyleSheet.create({
  page: { paddingTop: 14, paddingBottom: 64, paddingHorizontal: 24, fontFamily: "Helvetica", fontSize: 10.5, color: "#333333" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  title: { fontSize: 27, color: "#1f2937", marginBottom: 2, fontWeight: "bold" },
  metaRow: { flexDirection: "row", marginBottom: 4 },
  metaLabel: { width: 96, color: "#666666", fontSize: 10, fontWeight: "bold" },
  metaValue: { flex: 1, color: "#333333", fontSize: 10 },
  logo: { width: 86, height: 86 },
  partyRow: { flexDirection: "row", marginBottom: 6 },
  partyBox: { flex: 1, backgroundColor: "#e8e8e8", borderWidth: 1, borderColor: "#d4d4d4", paddingVertical: 16, paddingHorizontal: 16, marginRight: 14 },
  partyBoxLast: { marginRight: 0 },
  tableHeaderRow: { flexDirection: "row", backgroundColor: "#7d8a88" },
  tableHeaderCell: { paddingVertical: 5, paddingHorizontal: 6, color: "#ffffff", fontSize: 9.5, fontWeight: "bold" },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  tableCell: { paddingVertical: 4, paddingHorizontal: 6, fontSize: 10 },
  groupHeaderRow: { paddingVertical: 7, paddingHorizontal: 6, borderTopWidth: 1, borderTopColor: "#e5e7eb", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  groupHeaderText: { fontSize: 10.75, fontWeight: "bold", color: "#1f2937" },
  descMain: { fontSize: 10.2, color: "#1f2937", fontWeight: "bold" },
  descSub: { marginTop: 3, fontSize: 8.8, color: "#6b7280" },
  closingRow: { flexDirection: "row", marginTop: 8 },
  bankBox: { flex: 1, borderWidth: 1, borderColor: "#d4d4d4", padding: 8, marginRight: 12 },
  totalsBox: { width: 250, borderWidth: 1, borderColor: "#d4d4d4", padding: 6 },
  footerZone: { position: "absolute", bottom: 24, left: 24, right: 24 },
});

async function main() {
  const { model } = buildIndustryFixture(false);
  const logoUri = `data:image/png;base64,${readFileSync(join(here, "assets", "poc-logo.png")).toString("base64")}`;
  const col = (w: number) => ({ width: w, flexGrow: 0, flexShrink: 0 });

  const doc = (
    <Document title={model.number}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={{ flexGrow: 1, paddingRight: 18 }}>
            <Text style={styles.title}>{model.title}</Text>
            <View style={styles.metaRow}><Text style={styles.metaLabel}>{model.numberLabel}</Text><Text style={styles.metaValue}>{model.number}</Text></View>
            <View style={styles.metaRow}><Text style={styles.metaLabel}>Issue Date</Text><Text style={styles.metaValue}>{model.issueDate}</Text></View>
            <View style={styles.metaRow}><Text style={styles.metaLabel}>Due Date</Text><Text style={styles.metaValue}>{model.dueDate}</Text></View>
            <View style={styles.metaRow}><Text style={styles.metaLabel}>PO Number</Text><Text style={styles.metaValue}>{model.poNumber}</Text></View>
          </View>
          <Image src={logoUri} style={styles.logo} />
        </View>

        <View style={styles.partyRow}>
          <View style={styles.partyBox}>
            <Text style={{ fontSize: 14, color: "#7d8a88", marginBottom: 10, fontWeight: "bold" }}>From</Text>
            <Text style={{ fontSize: 12.5, marginBottom: 5, fontWeight: "bold" }}>{model.companyName}</Text>
            {[...model.companyLines, model.companyPhone, model.companyEmail, model.companyTaxId].map((l) => (
              <Text key={l} style={{ fontSize: 10, marginBottom: 2 }}>{l}</Text>
            ))}
          </View>
          <View style={[styles.partyBox, styles.partyBoxLast]}>
            <Text style={{ fontSize: 14, color: "#7d8a88", marginBottom: 10, fontWeight: "bold" }}>To</Text>
            <Text style={{ fontSize: 12.5, marginBottom: 5, fontWeight: "bold" }}>{model.recipientName}</Text>
            {[...model.recipientLines, model.recipientPhone, model.recipientEmail].map((l) => (
              <Text key={l} style={{ fontSize: 10, marginBottom: 2 }}>{l}</Text>
            ))}
          </View>
        </View>

        <View style={styles.tableHeaderRow} fixed>
          <Text style={[styles.tableHeaderCell, col(30)]}>S/N</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Description</Text>
          <Text style={[styles.tableHeaderCell, col(52)]}>Qty</Text>
          <Text style={[styles.tableHeaderCell, col(52)]}>Unit</Text>
          <Text style={[styles.tableHeaderCell, col(90)]}>Unit Price</Text>
          <Text style={[styles.tableHeaderCell, col(98)]}>Amount</Text>
        </View>
        {model.rows.map((row, i) => {
          if (row.kind === "group_header") {
            return <View key={i} style={styles.groupHeaderRow} wrap={false}><Text style={styles.groupHeaderText}>{row.label}</Text></View>;
          }
          if (row.kind === "group_footer") {
            return <View key={i} style={{ flexDirection: "row", justifyContent: "flex-end", padding: 4 }} wrap={false}><Text style={{ fontSize: 10, fontWeight: "bold" }}>Subtotal {row.subtotal}</Text></View>;
          }
          return (
            <View key={i} style={[styles.tableRow, i % 2 === 1 ? { backgroundColor: "#f8fafc" } : null] as any} wrap={false}>
              <Text style={[styles.tableCell, col(30)]}>{row.sn}</Text>
              <View style={[styles.tableCell, { flex: 1 }]}>
                <Text style={styles.descMain}>{row.description}</Text>
                <Text style={styles.descSub}>{row.sub}</Text>
              </View>
              <Text style={[styles.tableCell, col(52)]}>{row.qty}</Text>
              <Text style={[styles.tableCell, col(52)]}>{row.unit}</Text>
              <Text style={[styles.tableCell, col(90)]}>{row.unitPrice}</Text>
              <Text style={[styles.tableCell, col(98)]}>{row.amount}</Text>
            </View>
          );
        })}

        <View style={styles.closingRow} wrap={false}>
          <View style={styles.bankBox}>
            <Text style={{ fontSize: 11, fontWeight: "bold", marginBottom: 6 }}>Bank Details</Text>
            <Text style={{ fontSize: 9.5 }}>Bank: {model.bank.bankName}</Text>
            <Text style={{ fontSize: 9.5 }}>Account Name: {model.bank.accountName}</Text>
            <Text style={{ fontSize: 9.5 }}>Account Number: {model.bank.accountNumber}</Text>
            <Text style={{ fontSize: 9.5 }}>Sort Code: {model.bank.sortCode}</Text>
          </View>
          <View style={styles.totalsBox}>
            {model.totalLines.map((l) => (
              <View key={l.label} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                <Text style={{ fontSize: 10 }}>{l.label}</Text><Text style={{ fontSize: 10 }}>{l.display}</Text>
              </View>
            ))}
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4, paddingTop: 4, borderTopWidth: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: "bold" }}>{model.mainTotal.label}</Text><Text style={{ fontSize: 12, fontWeight: "bold" }}>{model.mainTotal.display}</Text>
            </View>
            <Text style={{ fontSize: 8.5, marginTop: 4 }}>{model.amountInWords}</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4, padding: 4, backgroundColor: "#1f2937" }}>
              <Text style={{ color: "#fff", fontWeight: "bold" }}>{model.balanceDue.label}</Text><Text style={{ color: "#fff", fontWeight: "bold" }}>{model.balanceDue.display}</Text>
            </View>
          </View>
        </View>

        <Text style={{ fontSize: 11, fontWeight: "bold", marginTop: 8 }}>{model.notesTitle}</Text>
        <Text style={{ fontSize: 9.5 }}>{model.notes}</Text>
        <Text style={{ fontSize: 11, fontWeight: "bold", marginTop: 8 }}>{model.termsTitle}</Text>
        <Text style={{ fontSize: 9.5 }}>{model.terms}</Text>
        <Text style={{ fontSize: 11, fontWeight: "bold", marginTop: 8 }}>Attachments</Text>
        {model.attachments.map((a) => <Text key={a.label} style={{ fontSize: 9.5 }}>{a.label}</Text>)}
        <View wrap={false} style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 10, fontWeight: "bold" }}>{model.signatureName}</Text>
          <Text style={{ fontSize: 9 }}>{model.signatureRole}</Text>
        </View>

        <View style={styles.footerZone} fixed>
          <Text style={{ fontSize: 8 }}>{model.footerExtra}</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4, paddingTop: 4, borderTopWidth: 1 }}>
            <Text style={{ fontSize: 8 }} render={({ pageNumber, totalPages }: any) => `Page ${pageNumber} of ${totalPages}`} />
            <Text style={{ fontSize: 8 }}>{model.number}</Text>
            <Text style={{ fontSize: 8 }}>{model.companyName}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );

  const buffer = await renderToBuffer(doc as any);
  const outPath = join(here, "reactpdf-industry-baseline.pdf");
  writeFileSync(outPath, buffer);
  console.log(`[industry-poc] react-pdf industry baseline: ${buffer.length} bytes`);

  const { PDFDocument } = await import("pdf-lib");
  const pdf = await PDFDocument.load(buffer);
  console.log(`[industry-poc] baseline pages: ${pdf.getPageCount()}, size: ${JSON.stringify(pdf.getPage(0).getSize())}`);
}

await main();
